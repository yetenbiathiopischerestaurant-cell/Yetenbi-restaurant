package de.yetenbi.service.ui.today

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.Times
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.AppViewModel
import de.yetenbi.service.ui.UiState
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Divider
import de.yetenbi.service.ui.components.EmptyState
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.LocalCompact
import de.yetenbi.service.ui.components.MoneyText
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Stat
import de.yetenbi.service.ui.theme.Yt

/*
  The day's takings: revenue, cash, card, tips, and every bill; owners can reopen one paid by mistake.
  Without payments in the app: only closed tables, guests and the order value (the money is counted at the till).
*/
@Composable
fun TodayScreen(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    val compact = LocalCompact.current
    val summary = state.today?.summary
    var shown by remember { mutableStateOf<Check?>(null) }
    LazyColumn(Modifier.fillMaxSize().testTag("today"), contentPadding = PaddingValues(if (compact) 16.dp else 28.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Eyebrow(Times.day(state.todayDate, strings.code))
                    Text(strings.today.title, style = MaterialTheme.typography.displaySmall, color = Yt.Cream)
                }
                IconButton({ vm.loadToday(state.todayDate.minusDays(1)) }) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowLeft, strings.today.previous, tint = Yt.Cream) }
                IconButton({ vm.loadToday(state.todayDate.plusDays(1)) }, enabled = state.todayDate < Times.today()) {
                    Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, strings.today.next, tint = if (state.todayDate < Times.today()) Yt.Cream else Yt.Sand.copy(alpha = 0.3f))
                }
            }
        }
        item {
            val cents = { euros: Double -> (euros * 100).toInt() }
            // Counted from the list itself, so it works whatever the server puts in the summary.
            val kept = state.today?.checks.orEmpty().filter { it.status != "void" }
            val stats = if (!state.payments) listOf(
                Triple(strings.today.orderValue, Money.format(kept.sumOf { it.totalCents }, strings.code), null),
                Triple(strings.today.tables, kept.size.toString(), null),
                Triple(strings.today.guests, kept.sumOf { it.guests }.toString(), null),
            ) else listOf(
                Triple(strings.today.revenue, Money.format(cents(summary?.total ?: 0.0), strings.code), strings.today.checks(summary?.paid ?: 0)),
                Triple(strings.today.cash, Money.format(cents(summary?.cash ?: 0.0), strings.code), null),
                Triple(strings.today.card, Money.format(cents(summary?.card ?: 0.0), strings.code), null),
                Triple(strings.today.tips, Money.format(cents(summary?.tips ?: 0.0), strings.code), null),
            )
            if (compact) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    stats.chunked(2).forEach { pair ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { pair.forEach { (l, v, s) -> Stat(l, v, Modifier.weight(1f), sub = s, accent = if (l == strings.today.revenue || l == strings.today.orderValue) Yt.GoldSoft else Yt.Cream) } }
                    }
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) { stats.forEach { (l, v, s) -> Stat(l, v, Modifier.weight(1f), sub = s, accent = if (l == strings.today.revenue || l == strings.today.orderValue) Yt.GoldSoft else Yt.Cream) } }
            }
        }
        val checks = state.today?.checks.orEmpty()
        if (checks.isEmpty()) item { Box(Modifier.heightIn(min = 280.dp)) { EmptyState(strings.today.empty, if (state.payments) strings.today.emptyHint else strings.today.closedHint) } }
        items(checks, key = { it.id }) { check ->
            Surface(onClick = { shown = check }, color = Yt.Coal, shape = MaterialTheme.shapes.large, modifier = Modifier.fillMaxWidth().testTag("closed-${check.number}")) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(Times.clock(check.closedAt), style = MaterialTheme.typography.titleMedium, color = Yt.Sand, modifier = Modifier.width(60.dp))
                    Column(Modifier.weight(1f)) {
                        Text(strings.check.table(check.tableLabel), style = MaterialTheme.typography.titleMedium, color = Yt.Cream)
                        Text(
                            listOf(strings.common.guests(check.guests), check.closedBy, when {
                                check.status == "void" -> strings.today.voided
                                // Freed without payment in the app: no method to show.
                                check.status != "paid" -> ""
                                check.payment == "cash" -> strings.today.paidCash
                                check.payment == "mixed" -> strings.today.paidMixed
                                else -> strings.today.paidCard
                            }).filter { it.isNotBlank() }.joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall, color = if (check.status == "void") Yt.Coral else Yt.Sand,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        MoneyText(check.totalCents, strike = check.status == "void")
                        if (check.tipCents > 0) Text("+ ${Money.format(check.tipCents, strings.code)}", style = MaterialTheme.typography.bodySmall, color = Yt.Ready)
                    }
                }
            }
        }
    }
    shown?.let { check ->
        AlertDialog(
            onDismissRequest = { shown = null },
            containerColor = Yt.Coal,
            title = { Text("${strings.check.table(check.tableLabel)} · Nr. ${check.number}", style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
            text = {
                Column {
                    check.items.forEach { item ->
                        Row(Modifier.padding(vertical = 3.dp)) {
                            Text("${item.qty}× ${item.name.of(strings.code)}", color = if (item.isVoid) Yt.Sand.copy(alpha = 0.5f) else Yt.Cream, modifier = Modifier.weight(1f))
                            MoneyText(item.lineCents, fontSize = MaterialTheme.typography.bodyMedium.fontSize, strike = item.isVoid)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Divider()
                    Spacer(Modifier.height(8.dp))
                    Row { Text(strings.common.total, color = Yt.Sand, modifier = Modifier.weight(1f)); MoneyText(check.totalCents, color = Yt.GoldSoft) }
                }
            },
            confirmButton = {
                androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (check.receiptToken != null) PillButton(strings.pay.showReceipt, { vm.showReceipt(check); shown = null }, kind = ButtonKind.Secondary, testTag = "show-receipt")
                    if (state.user?.isOwner == true && check.status == "paid") PillButton(strings.today.reopen, { vm.reopen(check); shown = null }, kind = ButtonKind.Danger, testTag = "reopen")
                }
            },
            dismissButton = { PillButton(strings.common.back, { shown = null }, kind = ButtonKind.Ghost) },
        )
    }
}
