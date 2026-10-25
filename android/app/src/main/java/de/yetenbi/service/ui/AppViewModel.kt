package de.yetenbi.service.ui

import android.app.Application
import android.graphics.Bitmap
import android.net.Uri
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import de.yetenbi.service.BuildConfig
import de.yetenbi.service.ServiceApp
import de.yetenbi.service.alerts.AlertService
import de.yetenbi.service.alerts.KitchenAlerts
import de.yetenbi.service.data.ApiException
import de.yetenbi.service.data.Bootstrap
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckList
import de.yetenbi.service.data.CrashReporter
import de.yetenbi.service.data.DiningTable
import de.yetenbi.service.data.Dish
import de.yetenbi.service.data.ItemStatus
import de.yetenbi.service.data.Keys
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.PayMethod
import de.yetenbi.service.data.PayPart
import de.yetenbi.service.data.RoundLine
import de.yetenbi.service.data.StaffMember
import de.yetenbi.service.data.Times
import de.yetenbi.service.data.User
import de.yetenbi.service.i18n.Strings
import de.yetenbi.service.i18n.stringsFor
import de.yetenbi.service.updates.Release
import de.yetenbi.service.updates.UpdateNotifier
import de.yetenbi.service.updates.UpdateState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.LocalDate

enum class Phase { Loading, SignedOut, SignedIn }
enum class Screen { Tables, Today, Settings }
enum class Pane { Bill, Menu }

/* The id of the "Beliebt" chip in the menu (not a real category). */
const val POPULAR = "_popular"

data class UiState(
    val phase: Phase = Phase.Loading,
    val user: User? = null,
    val language: String = "de",
    val bell: Boolean = true,
    val background: Boolean = true,
    val boot: Bootstrap? = null,
    val offline: Boolean = false,
    val screen: Screen = Screen.Tables,
    val busy: Boolean = false,
    val loginBusy: Boolean = false,
    val loginError: String? = null,
    // Tables and the open check
    val checks: List<Check> = emptyList(),
    val checksLoaded: Boolean = false,
    val selectedId: Long? = null,
    val selected: Check? = null,
    val pane: Pane = Pane.Menu,
    val category: String? = null,
    val search: String = "",
    val round: List<RoundLine> = emptyList(),
    /* The seat new dishes go to (null = the whole table) and whether they wait as "later". */
    val seat: Int? = null,
    val hold: Boolean = false,
    /* Set when sending the round failed without an answer: it may have arrived, so it is resent with the same key. */
    val unsentKey: String? = null,
    val opening: DiningTable? = null,
    /* The guest's QR bill after paying. */
    val receiptFor: Check? = null,
    // Today
    val todayDate: LocalDate = Times.today(),
    val today: CheckList? = null,
    // Staff switching
    val staff: List<StaffMember>? = null,
    val staffOpen: Boolean = false,
    // Online updates
    val update: UpdateState = UpdateState.Idle,
    val updateDismissed: Boolean = false,
) {
    val strings: Strings get() = stringsFor(language)
    val tables get() = boot?.tables.orEmpty()
    val categories get() = boot?.categories.orEmpty()
    /* Whether the app takes payments; off, tables are only closed and paid at the till. True until the server says otherwise. */
    val payments get() = boot?.features?.payments != false
    val roundCents get() = round.sumOf { it.dish.priceCents * it.qty }
    val roundCount get() = round.sumOf { it.qty }
    fun checkFor(tableId: String) = checks.firstOrNull { it.tableId == tableId }
    val freeTables get() = tables.filter { t -> checks.none { it.tableId == t.id } }
    fun isDrink(dish: Dish) = categories.firstOrNull { c -> c.items.any { it.id == dish.id } }?.drinks == true
    /* Whether the round holds food (sent to the kitchen) or only drinks (booked straight away). */
    val roundHasFood get() = round.any { !isDrink(it.dish) }
    /* The dishes ordered most, in that order, that are still on the menu. */
    val popularDishes: List<Dish> get() {
        val all = categories.flatMap { it.items }.associateBy { it.id }
        return boot?.popular.orEmpty().mapNotNull { all[it] }
    }
}

data class Notice(val text: String, val error: Boolean = false)

/* base64url without padding, as PKCE wants it. */
private const val B64 = Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val container = (app as ServiceApp).container
    private val api = container.api
    private val session = container.session
    private val updater = container.updater
    private val readyWatch = container.readyWatch

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state
    private val _notices = MutableSharedFlow<Notice>(extraBufferCapacity = 8)
    val notices: SharedFlow<Notice> = _notices

    private var poller: Job? = null
    private val strings get() = _state.value.strings

    init {
        viewModelScope.launch {
            val saved = session.load()
            _state.update { it.copy(language = saved.language, bell = saved.bell, background = saved.background) }
            if (saved.token != null && saved.user != null) startSession(saved.user) else signInDemoOrShowLogin()
        }
        viewModelScope.launch { updater.state.collect { s -> _state.update { it.copy(update = s) } } }
        // A crash from last time goes to the website.
        viewModelScope.launch { CrashReporter.sendPending(getApplication(), api) }
        // Look for a new version right away, then every half hour, signed in or not.
        viewModelScope.launch {
            while (isActive) {
                (updater.check() as? UpdateState.Available)?.let { UpdateNotifier.announce(getApplication(), it.release, _state.value.language) }
                delay(30 * 60_000L)
            }
        }
    }

    /* ---------- Plumbing ---------- */

    private fun notify(text: String, error: Boolean = false) {
        _notices.tryEmit(Notice(text, error))
    }

    /* Runs an API call with the busy line, offline detection and translated errors. */
    private fun act(showBusy: Boolean = true, onError: (ApiException) -> Boolean = { false }, block: suspend () -> Unit) {
        viewModelScope.launch {
            if (showBusy) _state.update { it.copy(busy = true) }
            try {
                block()
                _state.update { it.copy(offline = false) }
            } catch (e: ApiException) {
                if (!onError(e)) handle(e)
            } finally {
                if (showBusy) _state.update { it.copy(busy = false) }
            }
        }
    }

    private suspend fun handle(e: ApiException) {
        when (e.code) {
            "offline" -> {
                _state.update { it.copy(offline = true) }
                notify(strings.error("offline"), error = true)
            }
            "unauthorized" -> {
                signOut(silent = true)
                notify(strings.error("unauthorized"), error = true)
            }
            "dish_not_found", "dish_sold_out", "table_not_found" -> {
                notify(strings.error(e.code), error = true)
                reloadBoot()
            }
            "total_changed", "item_paid", "check_has_payments" -> {
                notify(strings.error(e.code), error = true)
                _state.value.selectedId?.let { id -> runCatching { applyCheck(api.check(id)) } }
            }
            "check_closed", "table_busy" -> {
                notify(strings.error(if (e.code == "check_closed" && !_state.value.payments) "check_closed_free" else e.code), error = true)
                refresh()
            }
            else -> notify(strings.error(e.code), error = true)
        }
    }

    private suspend fun reloadBoot() {
        runCatching { api.bootstrap() }.getOrNull()?.let { boot -> _state.update { it.copy(boot = boot, user = boot.user) } }
    }

    private fun startSession(user: User) {
        _state.update { it.copy(phase = Phase.SignedIn, user = user, loginBusy = false, loginError = null) }
        readyWatch.reset()
        act(showBusy = false) {
            val boot = api.bootstrap()
            _state.update { it.copy(boot = boot, user = boot.user) }
        }
        refresh()
        if (_state.value.background) AlertService.start(getApplication())
        poller?.cancel()
        poller = viewModelScope.launch {
            var tick = 0
            while (isActive) {
                delay(5_000)
                tick++
                if (_state.value.phase != Phase.SignedIn) break
                // Quietly keep every phone and tablet in step; failures only flip the offline banner.
                try {
                    if (!_state.value.busy) {
                        val list = api.openChecks()
                        applyChecks(list.checks)
                        // The kitchen marked something sold out, or the tables changed: reload the menu at once.
                        if (list.stamp.isNotBlank() && list.stamp != _state.value.boot?.stamp) reloadBoot()
                    }
                    // And every 5 minutes anyway, for "popular".
                    if (tick % 60 == 0) reloadBoot()
                    _state.update { it.copy(offline = false) }
                } catch (e: ApiException) {
                    if (e.code == "offline") _state.update { it.copy(offline = true) } else if (e.code == "unauthorized") signOut(silent = true)
                }
            }
        }
    }

    /* New list of open checks: keep the selected one current and ring for food that just became ready. */
    private fun applyChecks(checks: List<Check>) {
        _state.update { s ->
            val selected = s.selectedId?.let { id -> checks.firstOrNull { it.id == id } }
            s.copy(checks = checks, checksLoaded = true, selected = selected ?: s.selected?.takeIf { it.id != s.selectedId })
        }
        readyWatch.fresh(checks).forEach { (check, items) ->
            val dishes = items.joinToString(", ") { "${it.qty}× ${it.name.of(strings.code)}" }
            notify("${strings.alerts.ready(check.tableLabel)} – $dishes")
            if (_state.value.bell) KitchenAlerts.ring(getApplication(), check, dishes, strings)
        }
    }

    private fun refresh() = act(showBusy = false) { applyChecks(api.openChecks().checks) }

    /* Puts a changed check into the lists straight away (instead of waiting for the next poll). */
    private fun applyCheck(check: Check) {
        _state.update { s ->
            val list = if (check.isOpen) {
                if (s.checks.any { it.id == check.id }) s.checks.map { if (it.id == check.id) check else it } else s.checks + check
            } else s.checks.filterNot { it.id == check.id }
            s.copy(checks = list, selected = if (s.selectedId == check.id) check else s.selected)
        }
        readyWatch.seen(check)
    }

    /* ---------- Session ---------- */

    /* While the website has the app's sign-in switched off, everyone uses the shared demo account; else the login screen. */
    private suspend fun signInDemoOrShowLogin() {
        try {
            val result = api.loginDemo()
            session.signIn(result.token, result.user)
            startSession(result.user)
        } catch (e: ApiException) {
            _state.update { it.copy(phase = Phase.SignedOut) }
        }
    }

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) return
        _state.update { it.copy(loginBusy = true, loginError = null) }
        viewModelScope.launch {
            try {
                val result = api.login(email.trim(), password)
                session.signIn(result.token, result.user)
                startSession(result.user)
            } catch (e: ApiException) {
                _state.update { it.copy(loginBusy = false, loginError = strings.error(e.code)) }
            }
        }
    }

    /*
      "Sign in with Google": a fresh secret (PKCE verifier) is saved, the browser opens Google via the website, and the
      website sends the browser back with a one-time code (googleReturn), which only works together with the secret.
    */
    fun googleStart(open: (Uri) -> Unit) {
        val verifier = Base64.encodeToString(ByteArray(32).also { SecureRandom().nextBytes(it) }, B64)
        val challenge = Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray()), B64)
        _state.update { it.copy(loginError = null) }
        viewModelScope.launch {
            session.setGoogleVerifier(verifier)
            open(Uri.parse(api.googleUrl(challenge)))
        }
    }

    fun googleReturn(uri: Uri) {
        if (uri.scheme != "de.yetenbi.service" || uri.host != "auth") return
        val code = uri.getQueryParameter("code")
        val error = uri.getQueryParameter("error")
        _state.update { it.copy(loginBusy = code != null, loginError = error?.let(strings::error)) }
        if (code == null) return
        viewModelScope.launch {
            val verifier = session.googleVerifier()
            session.setGoogleVerifier(null)
            try {
                if (verifier == null) throw ApiException("google", 0)
                val result = api.loginGoogle(code, verifier)
                session.signIn(result.token, result.user)
                startSession(result.user)
            } catch (e: ApiException) {
                _state.update { it.copy(loginBusy = false, loginError = strings.error(e.code)) }
            }
        }
    }

    fun signOut(silent: Boolean = false) {
        poller?.cancel()
        AlertService.stop(getApplication())
        viewModelScope.launch {
            if (!silent) api.logout()
            session.signOut()
            _state.update { UiState(phase = Phase.Loading, language = it.language, bell = it.bell, background = it.background, update = it.update) }
            signInDemoOrShowLogin()
        }
    }

    fun openStaff(open: Boolean) = _state.update { it.copy(staffOpen = open) }

    /* "Wer bedient?": the list of people with a PIN. */
    fun loadStaff() {
        _state.update { it.copy(staff = null) }
        act(showBusy = false) { _state.update { it.copy(staff = api.staff()) } }
    }

    /* Another waiter takes over this phone with their PIN; the screen stays where it was. */
    fun switchTo(member: StaffMember, pin: String, done: (String?) -> Unit) {
        viewModelScope.launch {
            try {
                val result = api.loginPin(member.id, pin)
                session.signIn(result.token, result.user)
                _state.update { it.copy(user = result.user) }
                notify(strings.staff.now(result.user.name))
                done(null)
            } catch (e: ApiException) {
                done(strings.error(e.code))
            }
        }
    }

    fun setLanguage(code: String) {
        _state.update { it.copy(language = code) }
        viewModelScope.launch { session.setLanguage(code) }
    }

    fun setBell(on: Boolean) {
        _state.update { it.copy(bell = on) }
        viewModelScope.launch { session.setBell(on) }
    }

    fun setBackground(on: Boolean) {
        _state.update { it.copy(background = on) }
        viewModelScope.launch { session.setBackground(on) }
        if (on) AlertService.start(getApplication()) else AlertService.stop(getApplication())
    }

    fun go(screen: Screen) {
        _state.update { it.copy(screen = screen, selectedId = if (screen == Screen.Tables) it.selectedId else null) }
        when (screen) {
            Screen.Tables -> refresh()
            Screen.Today -> loadToday(_state.value.todayDate)
            Screen.Settings -> Unit
        }
    }

    /* ---------- Tables ---------- */

    /* Tapping a table: a free one asks how many guests, a taken one opens its check. */
    fun tapTable(table: DiningTable) {
        val check = _state.value.checkFor(table.id)
        if (check == null) _state.update { it.copy(opening = table) } else selectCheck(check.id)
    }

    fun cancelOpening() = _state.update { it.copy(opening = null) }

    fun openTable(table: DiningTable, guests: Int) = act {
        val check = api.openCheck(table.id, guests)
        applyCheck(check)
        _state.update { it.copy(opening = null, selectedId = check.id, selected = check, round = emptyList(), unsentKey = null, seat = null, hold = false, search = "", pane = Pane.Menu) }
    }

    fun selectCheck(id: Long?) {
        _state.update { s ->
            val check = id?.let { i -> s.checks.firstOrNull { it.id == i } }
            val same = s.selectedId == id
            s.copy(
                selectedId = id,
                selected = check,
                round = if (same) s.round else emptyList(),
                unsentKey = if (same) s.unsentKey else null,
                seat = if (same) s.seat else null,
                hold = if (same) s.hold else false,
                search = if (same) s.search else "",
                // Something already ordered: show the bill first; a fresh table goes straight to the menu.
                pane = if (check != null && check.items.isNotEmpty()) Pane.Bill else Pane.Menu,
            )
        }
        if (id != null) act(showBusy = false) { applyCheck(api.check(id)) }
    }

    fun setPane(pane: Pane) = _state.update { it.copy(pane = pane) }
    fun setCategory(id: String?) = _state.update { it.copy(category = id, search = "") }
    fun setSearch(text: String) = _state.update { it.copy(search = text.take(40)) }
    fun setSeat(seat: Int?) = _state.update { it.copy(seat = seat) }
    fun setHold(hold: Boolean) = _state.update { it.copy(hold = hold) }

    /* ---------- The round being put together ---------- */

    /* A round that may already have reached the kitchen can't change: only be sent again (same key) or discarded. */
    private fun roundLocked(): Boolean {
        if (_state.value.unsentKey == null) return false
        notify(strings.check.roundLocked, error = true)
        return true
    }

    fun addToRound(dish: Dish, note: String = "") {
        if (!dish.available) return notify(strings.error("dish_sold_out"), error = true)
        if (roundLocked()) return
        _state.update { s ->
            // Drinks are served at once: never "later".
            val line = RoundLine(dish, 1, note, s.seat, s.hold && !s.isDrink(dish))
            val existing = s.round.firstOrNull { it.key == line.key }
            s.copy(round = if (existing != null) s.round.map { if (it.key == line.key) it.copy(qty = (it.qty + 1).coerceAtMost(99)) else it } else s.round + line)
        }
    }

    fun changeRound(key: String, delta: Int) {
        if (roundLocked()) return
        _state.update { s ->
            s.copy(round = s.round.mapNotNull { if (it.key == key) it.copy(qty = it.qty + delta).takeIf { l -> l.qty > 0 } else it })
        }
    }

    /* Changes one line (wish, seat, later); lines that end up the same merge. */
    fun editRoundLine(key: String, change: (RoundLine) -> RoundLine) {
        if (roundLocked()) return
        _state.update { s ->
            val line = s.round.firstOrNull { it.key == key } ?: return@update s
            val changed = change(line).let { it.copy(note = it.note.trim().take(140), hold = it.hold && !s.isDrink(it.dish)) }
            val others = s.round.filterNot { it.key == key }
            val twin = others.firstOrNull { it.key == changed.key }
            s.copy(round = if (twin != null) others.map { if (it.key == twin.key) it.copy(qty = (it.qty + changed.qty).coerceAtMost(99)) else it } else s.round.map { if (it.key == key) changed else it })
        }
    }

    fun setRoundNote(key: String, note: String) = editRoundLine(key) { it.copy(note = note) }

    /* A quick wish chip under a line: on, or off again. */
    fun toggleWish(key: String, wish: String) = editRoundLine(key) { line ->
        val parts = line.note.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        line.copy(note = (if (wish in parts) parts - wish else parts + wish).joinToString(", "))
    }

    fun clearRound() = _state.update { it.copy(round = emptyList(), unsentKey = null) }

    fun sendRound() {
        val s = _state.value
        val id = s.selectedId ?: return
        if (s.round.isEmpty()) return
        val lines = s.round
        // A retry uses the same key: if the first try did reach the server, the kitchen still gets it only once.
        val key = s.unsentKey ?: Keys.new()
        act(onError = { e ->
            if (e.code == "offline" || e.status >= 500) {
                _state.update { it.copy(unsentKey = key, offline = e.code == "offline") }
                notify(strings.check.unsent + " – " + strings.check.unsentHint, error = true)
                true
            } else {
                _state.update { it.copy(unsentKey = null) }
                false
            }
        }) {
            val check = api.sendRound(id, lines, key)
            applyCheck(check)
            _state.update { it.copy(round = emptyList(), unsentKey = null, pane = Pane.Bill) }
            notify(strings.check.sentToKitchen(lines.joinToString(", ") { "${it.qty}× ${it.dish.name.of(strings.code)}" }))
        }
    }

    /* ---------- The check ---------- */

    fun serveItem(itemId: Long) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.serveItem(id, itemId)) }
    }

    fun voidItem(itemId: Long, reason: String) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.voidItem(id, itemId, reason)) }
    }

    fun serveReady(checkId: Long? = null) {
        val id = checkId ?: _state.value.selectedId ?: return
        act { applyCheck(api.serveReady(id)) }
    }

    /* "Später-Gang abrufen": the held dishes go to the kitchen now. */
    fun fire() {
        val id = _state.value.selectedId ?: return
        act {
            applyCheck(api.fire(id))
            notify(strings.check.fired)
        }
    }

    fun setGuests(guests: Int) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.updateCheck(id, guests = guests)) }
    }

    fun moveTo(table: DiningTable) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.updateCheck(id, tableId = table.id)) }
    }

    /* Another taken table joins this one. */
    fun merge(other: Check) {
        val id = _state.value.selectedId ?: return
        act {
            val check = api.merge(id, other.id)
            _state.update { s -> s.copy(checks = s.checks.filterNot { it.id == other.id }) }
            applyCheck(check)
        }
    }

    fun voidCheck(reason: String) {
        val id = _state.value.selectedId ?: return
        act {
            val check = api.voidCheck(id, reason)
            applyCheck(check)
            _state.update { it.copy(selectedId = null, selected = null, round = emptyList(), unsentKey = null) }
            notify("${strings.check.table(check.tableLabel)}: ${strings.today.voided}")
        }
    }

    /*
      Takes one payment: the whole rest or one part (split bill). When the table is settled, the guest's QR bill opens.
      done(true) closes the pay dialog; a part leaves it open for the next guest.
    */
    fun pay(method: PayMethod, part: PayPart, tipCents: Int, givenCents: Int?, key: String, done: (closed: Boolean) -> Unit) {
        val id = _state.value.selectedId ?: return
        val due = _state.value.selected?.dueCents ?: return
        act {
            val check = api.pay(id, method, part, due, tipCents, givenCents, key)
            applyCheck(check)
            if (check.isOpen) {
                notify(strings.pay.partPaid(Money.format(part.amountCents + tipCents, strings.code), Money.format(check.dueCents, strings.code)))
                done(false)
            } else {
                _state.update { it.copy(selectedId = null, selected = null, round = emptyList(), unsentKey = null, receiptFor = check.takeIf { c -> c.receiptToken != null }) }
                notify(strings.pay.paid(check.tableLabel, Money.format(check.totalCents + check.tipCents, strings.code)))
                done(true)
            }
        }
    }

    /*
      "Tisch schließen" while the app takes no payments: the table becomes free, no payment, tip or receipt is booked.
      key stays the same while the confirm dialog is open, so a retry after a dropped connection closes it once.
    */
    fun closeTable(key: String, done: () -> Unit) {
        val id = _state.value.selectedId ?: return
        act {
            val check = api.close(id, key)
            applyCheck(check)
            _state.update { it.copy(selectedId = null, selected = null, round = emptyList(), unsentKey = null) }
            notify(strings.check.closed(check.tableLabel, Money.format(check.totalCents, strings.code)))
            done()
        }
    }

    fun showReceipt(check: Check?) = _state.update { it.copy(receiptFor = check) }
    fun receiptUrl(check: Check) = "${BuildConfig.API_URL.trimEnd('/')}/beleg/${check.receiptToken}"

    /* ---------- Today ---------- */

    fun loadToday(date: LocalDate) {
        _state.update { it.copy(todayDate = date) }
        act(showBusy = false) {
            val list = api.closedChecks(date.toString())
            if (_state.value.todayDate == date) _state.update { it.copy(today = list) }
        }
    }

    fun reopen(check: Check) = act {
        val reopened = api.reopen(check.id)
        applyCheck(reopened)
        _state.update { it.copy(screen = Screen.Tables, selectedId = reopened.id, selected = reopened, pane = Pane.Bill) }
    }

    /* ---------- Feedback ---------- */

    /* Sends what the tester wrote, with the screen they were on (scaled down, JPEG). */
    fun sendFeedback(message: String, screenshot: Bitmap?, done: () -> Unit) {
        val s = _state.value
        val where = when {
            s.screen == Screen.Tables && s.selected != null -> "check:${s.selected.tableLabel}:${s.pane.name.lowercase()}"
            else -> s.screen.name.lowercase()
        }
        act {
            val jpeg = screenshot?.let { withContext(Dispatchers.Default) { encodeJpeg(it) } }
            api.feedback(message.trim(), where, jpeg, BuildConfig.VERSION_NAME, CrashReporter.device)
            notify(strings.feedback.thanks)
            done()
        }
    }

    private fun encodeJpeg(bitmap: Bitmap): String {
        val scale = minOf(1f, 1080f / maxOf(bitmap.width, bitmap.height))
        val small = if (scale < 1f) Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true) else bitmap
        val out = ByteArrayOutputStream()
        small.compress(Bitmap.CompressFormat.JPEG, 70, out)
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    /* ---------- Online updates ---------- */

    fun checkForUpdates() = viewModelScope.launch {
        _state.update { it.copy(updateDismissed = false) }
        if (updater.check() is UpdateState.Idle) notify(strings.update.upToDate)
    }

    fun installUpdate(release: Release) {
        _state.update { it.copy(updateDismissed = false) }
        viewModelScope.launch { updater.downloadAndInstall(release) }
    }

    fun dismissUpdate() = _state.update { it.copy(updateDismissed = true) }
    fun updatePermissionIntent() = updater.permissionIntent()
    val currentVersionName: String get() = BuildConfig.VERSION_NAME

    companion object {
        /* Items on a check that still count (for the bill list). */
        fun visibleItems(check: Check) = check.items.filter { it.status != ItemStatus.VOID || it.voidReason.isNotBlank() }
    }
}
