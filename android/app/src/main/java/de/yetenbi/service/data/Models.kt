package de.yetenbi.service.data

import kotlinx.serialization.Serializable
import kotlin.math.roundToInt

/* The website's JSON (src/lib/service.ts and the /api/app routes), one to one. Money arrives in euros and is kept in cents. */

@Serializable
data class L(val de: String = "", val en: String = "", val am: String = "") {
    fun of(language: String) = if (language == "en" && en.isNotBlank()) en else de
}

@Serializable
data class User(val id: Long, val email: String, val name: String, val role: String, val locale: String = "de") {
    val isOwner get() = role == "owner"
}

@Serializable
data class LoginResponse(val token: String, val user: User)

@Serializable
data class DiningTable(val id: String, val label: String, val area: String = "", val seats: Int = 4)

@Serializable
data class Dish(
    val id: String,
    val name: L,
    val amharic: String = "",
    val description: L? = null,
    val price: Double,
    val tags: List<String> = emptyList(),
    val allergens: List<String> = emptyList(),
    val available: Boolean = true,
) {
    val priceCents get() = (price * 100).roundToInt()

    /* Search in the menu: German, English or Amharic name, any part, ignoring case. */
    fun matches(query: String): Boolean {
        val q = query.trim().lowercase()
        return q.isEmpty() || listOf(name.de, name.en, amharic).any { it.lowercase().contains(q) }
    }
}

@Serializable
data class Category(val id: String, val title: L, val drinks: Boolean = false, val items: List<Dish> = emptyList())

/* payments: false when payment is taken outside the app (till / card terminal); then tables are only closed. */
@Serializable
data class Features(val feedback: Boolean = false, val payments: Boolean = true)

@Serializable
data class Bootstrap(
    val user: User,
    val tables: List<DiningTable> = emptyList(),
    val categories: List<Category> = emptyList(),
    /* Dish ids ordered most in the last 30 days, most first. */
    val popular: List<String> = emptyList(),
    val stamp: String = "",
    val features: Features = Features(),
    val serverTime: String = "",
)

object ItemStatus {
    const val HELD = "held"
    const val SENT = "sent"
    const val READY = "ready"
    const val SERVED = "served"
    const val VOID = "void"
}

@Serializable
data class CheckItem(
    val id: Long,
    val round: Int,
    val itemId: String,
    val name: L,
    val unit: Double,
    val qty: Int,
    val note: String = "",
    val kitchen: Boolean = true,
    val status: String,
    val voidReason: String = "",
    val addedBy: String = "",
    val createdAt: String = "",
    val readyAt: String? = null,
    val servedAt: String? = null,
    val seat: Int? = null,
    val paymentId: Long? = null,
) {
    val isVoid get() = status == ItemStatus.VOID
    val isPaid get() = paymentId != null
    val unitCents get() = (unit * 100).roundToInt()
    val lineCents get() = if (isVoid) 0 else unitCents * qty
}

@Serializable
data class Payment(
    val id: Long,
    val method: String,
    val amount: Double,
    val tip: Double = 0.0,
    val given: Double? = null,
    val label: String = "",
    val by: String = "",
    val createdAt: String = "",
) {
    val amountCents get() = (amount * 100).roundToInt()
    val tipCents get() = (tip * 100).roundToInt()
}

@Serializable
data class Check(
    val id: Long,
    val number: Int,
    val tableId: String,
    val tableLabel: String,
    val guests: Int,
    val note: String = "",
    val status: String,
    val openedBy: String = "",
    val openedAt: String = "",
    val closedAt: String? = null,
    val closedBy: String = "",
    val payment: String? = null,
    val total: Double = 0.0,
    val tip: Double = 0.0,
    val given: Double? = null,
    val items: List<CheckItem> = emptyList(),
    val payments: List<Payment> = emptyList(),
    val due: Double? = null,
    val receiptToken: String? = null,
) {
    /* status: "open", "paid", "void" or "closed" (freed without a payment in the app); unknown ones are kept as text. */
    val isOpen get() = status == "open"
    val isClosed get() = status == "closed"
    val totalCents get() = if (isOpen) items.sumOf { it.lineCents } else (total * 100).roundToInt()
    val tipCents get() = (tip * 100).roundToInt()
    val paidCents get() = payments.sumOf { it.amountCents }
    /* Still to pay: the bill minus the parts already paid (split bill). */
    val dueCents get() = if (!isOpen) 0 else (totalCents - paidCents).coerceAtLeast(0)
    val ready get() = items.filter { it.kitchen && it.status == ItemStatus.READY }
    val readyCount get() = ready.sumOf { it.qty }
    val cookingCount get() = items.filter { it.kitchen && it.status == ItemStatus.SENT }.sumOf { it.qty }
    val heldCount get() = items.filter { it.status == ItemStatus.HELD }.sumOf { it.qty }
    val rounds get() = items.groupBy { it.round }.toSortedMap()
    /* When something was last ordered (or the table opened), for "nothing for 25 minutes". */
    val lastOrderAt get() = items.maxOfOrNull { it.createdAt }?.takeIf { it.isNotBlank() } ?: openedAt
    /* The seats with dishes on them, for "pay seat 2". */
    val seats get() = items.mapNotNull { it.seat }.distinct().sorted()
    /* Lines that can still be paid in a split bill. */
    val unpaid get() = items.filter { !it.isVoid && !it.isPaid }
}

@Serializable
data class DaySummary(
    val date: String = "",
    val paid: Int = 0,
    val voided: Int = 0,
    val total: Double = 0.0,
    val tips: Double = 0.0,
    val cash: Double = 0.0,
    val card: Double = 0.0,
    val guests: Int = 0,
)

@Serializable
data class CheckList(val checks: List<Check> = emptyList(), val summary: DaySummary? = null, val stamp: String = "")

@Serializable
data class StaffMember(val id: Long, val name: String)

@Serializable
data class StaffList(val staff: List<StaffMember> = emptyList())

/*
  A line of the round being put together, before it is sent. The same dish with another wish, another seat or
  "later" is a separate line.
*/
data class RoundLine(val dish: Dish, val qty: Int, val note: String = "", val seat: Int? = null, val hold: Boolean = false) {
    val key get() = "${dish.id}|$note|${seat ?: 0}|$hold"
}

enum class PayMethod(val wire: String) { Cash("cash"), Card("card") }

/* One part of a split bill: what it covers (lines with how many, or nothing for an equal share) and its label. */
data class PayPart(val amountCents: Int, val lines: List<Pair<Long, Int>> = emptyList(), val label: String = "")
