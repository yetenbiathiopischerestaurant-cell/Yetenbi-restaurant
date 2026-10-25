package de.yetenbi.service.data

import de.yetenbi.service.updates.UpdateInfo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/* A refusal from the server ("table_busy", "credentials", ...) or a dead connection (code "offline"). */
class ApiException(val code: String, val status: Int) : Exception(code)

/*
  The website's app API (the /api/app routes). Every call is a suspend function on the IO dispatcher; failures surface as
  ApiException with the server's machine-readable code, which Strings translates.
*/
class Api(baseUrl: String, private val tokenProvider: () -> String?, client: OkHttpClient? = null) {
    private val base = baseUrl.trimEnd('/')
    private val http = client ?: OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(30, TimeUnit.SECONDS)
        .build()

    val json = Json { ignoreUnknownKeys = true; explicitNulls = false; coerceInputValues = true }
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    private suspend fun raw(method: String, path: String, body: JsonElement? = null, auth: Boolean = true): String =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder().url(base + path).header("Accept", "application/json")
            if (auth) tokenProvider()?.let { builder.header("Authorization", "Bearer $it") }
            val requestBody = body?.toString()?.toRequestBody(jsonType)
            builder.method(method, requestBody ?: if (method == "GET") null else "{}".toRequestBody(jsonType))
            val response = try {
                http.newCall(builder.build()).execute()
            } catch (e: IOException) {
                throw ApiException("offline", 0)
            }
            response.use {
                val text = it.body?.string().orEmpty()
                if (!it.isSuccessful) {
                    val code = runCatching { json.parseToJsonElement(text).jsonObject["code"]?.jsonPrimitive?.contentOrNull }.getOrNull()
                    throw ApiException(code ?: "http_${it.code}", it.code)
                }
                text
            }
        }

    private suspend inline fun <reified T> get(path: String): T = json.decodeFromString(raw("GET", path))
    private suspend inline fun <reified T> send(method: String, path: String, body: JsonElement? = null): T =
        json.decodeFromString(raw(method, path, body))

    /* ---------- Session ---------- */

    suspend fun login(email: String, password: String): LoginResponse =
        json.decodeFromString(raw("POST", "/api/app/login", buildJsonObject { put("email", email); put("password", password) }, auth = false))

    /* The shared demo account, while the website has the app's sign-in switched off; otherwise "login_required". */
    suspend fun loginDemo(): LoginResponse = json.decodeFromString(raw("POST", "/api/app/login/demo", auth = false))

    /* Where "Sign in with Google" starts in the browser; challenge is the SHA-256 of the app's secret. */
    fun googleUrl(challenge: String) = "$base/api/auth/google?app=$challenge"

    suspend fun loginGoogle(code: String, verifier: String): LoginResponse =
        json.decodeFromString(raw("POST", "/api/app/login/google", buildJsonObject { put("code", code); put("verifier", verifier) }, auth = false))

    suspend fun logout() {
        runCatching { raw("POST", "/api/app/logout") }
    }

    suspend fun bootstrap(): Bootstrap = get("/api/app/bootstrap")

    /* ---------- Checks ---------- */

    /* The open checks, with the stamp that changes when the menu or the tables do. */
    suspend fun openChecks(): CheckList = get("/api/app/checks")
    suspend fun closedChecks(date: String): CheckList = get("/api/app/checks?closed=$date")
    suspend fun check(id: Long): Check = get("/api/app/checks/$id")

    suspend fun openCheck(tableId: String, guests: Int): Check =
        send("POST", "/api/app/checks", buildJsonObject { put("tableId", tableId); put("guests", guests) })

    suspend fun updateCheck(id: Long, guests: Int? = null, note: String? = null, tableId: String? = null): Check =
        send("PATCH", "/api/app/checks/$id", buildJsonObject {
            guests?.let { put("guests", it) }
            note?.let { put("note", it) }
            tableId?.let { put("tableId", it) }
        })

    /* key: the same for every attempt at this round, so a retry after a dropped connection is booked once. */
    suspend fun sendRound(id: Long, lines: List<RoundLine>, key: String): Check =
        send("POST", "/api/app/checks/$id/round", buildJsonObject {
            put("key", key)
            put("items", buildJsonArray {
                lines.forEach { line ->
                    add(buildJsonObject {
                        put("itemId", line.dish.id); put("qty", line.qty); put("note", line.note)
                        line.seat?.let { put("seat", it) }
                        if (line.hold) put("hold", true)
                    })
                }
            })
        })

    /* "Abrufen": the dishes waiting as "later" go to the kitchen. */
    suspend fun fire(id: Long): Check = send("POST", "/api/app/checks/$id/fire")

    /* Two tables pushed together: the other check moves onto this one. */
    suspend fun merge(id: Long, fromId: Long): Check =
        send("POST", "/api/app/checks/$id/merge", buildJsonObject { put("from", fromId) })

    suspend fun serveItem(id: Long, itemId: Long): Check =
        send("PATCH", "/api/app/checks/$id/items/$itemId", buildJsonObject { put("action", "serve") })

    suspend fun voidItem(id: Long, itemId: Long, reason: String): Check =
        send("PATCH", "/api/app/checks/$id/items/$itemId", buildJsonObject { put("action", "void"); put("reason", reason) })

    suspend fun serveReady(id: Long): Check = send("POST", "/api/app/checks/$id/serve")

    /*
      Takes one payment: the whole rest, or one part of a split bill. dueCents is what the screen showed as still to pay;
      if the bill changed meanwhile the server answers "total_changed". key makes a repeat harmless.
    */
    suspend fun pay(id: Long, method: PayMethod, part: PayPart, dueCents: Int, tipCents: Int, givenCents: Int?, key: String): Check =
        send("POST", "/api/app/checks/$id/pay", buildJsonObject {
            put("method", method.wire)
            put("amount", part.amountCents / 100.0)
            put("due", dueCents / 100.0)
            put("tip", tipCents / 100.0)
            put("key", key)
            if (part.label.isNotBlank()) put("label", part.label)
            if (part.lines.isNotEmpty()) put("items", buildJsonArray {
                part.lines.forEach { (itemId, qty) -> add(buildJsonObject { put("id", itemId); put("qty", qty) }) }
            })
            givenCents?.let { put("given", it / 100.0) }
        })

    /* "Tisch schließen": frees the table without recording a payment (payment is taken at the till). key makes a repeat harmless. */
    suspend fun close(id: Long, key: String): Check =
        send("POST", "/api/app/checks/$id/close", buildJsonObject { put("key", key) })

    suspend fun voidCheck(id: Long, reason: String): Check =
        send("POST", "/api/app/checks/$id/void", buildJsonObject { put("reason", reason) })

    suspend fun reopen(id: Long): Check = send("POST", "/api/app/checks/$id/reopen")

    /* ---------- Staff switching, feedback, crashes ---------- */

    /* Who can take over this device with a PIN. */
    suspend fun staff(): List<StaffMember> = get<StaffList>("/api/app/staff").staff

    suspend fun loginPin(userId: Long, pin: String): LoginResponse =
        json.decodeFromString(raw("POST", "/api/app/login/pin", buildJsonObject { put("userId", userId); put("pin", pin) }))

    suspend fun feedback(message: String, screen: String, screenshotJpegBase64: String?, appVersion: String, device: String) {
        raw("POST", "/api/app/feedback", buildJsonObject {
            put("message", message); put("screen", screen); put("appVersion", appVersion); put("device", device)
            screenshotJpegBase64?.let { put("screenshot", it) }
        })
    }

    suspend fun crash(trace: String, appVersion: String, device: String, android: String) {
        raw("POST", "/api/app/crash", buildJsonObject {
            put("trace", trace); put("appVersion", appVersion); put("device", device); put("android", android)
        }, auth = false)
    }

    /* ---------- Updates ---------- */

    suspend fun updateInfo(current: Int): UpdateInfo =
        json.decodeFromString(raw("GET", "/api/app/version?current=$current", auth = false))
}
