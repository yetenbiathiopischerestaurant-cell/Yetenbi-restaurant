package de.yetenbi.service.ui.check

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.AddLink
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.EditNote
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckItem
import de.yetenbi.service.data.Dish
import de.yetenbi.service.data.ItemStatus
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.RoundLine
import de.yetenbi.service.data.Times
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.AppViewModel
import de.yetenbi.service.ui.POPULAR
import de.yetenbi.service.ui.Pane
import de.yetenbi.service.ui.UiState
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Chip
import de.yetenbi.service.ui.components.Divider
import de.yetenbi.service.ui.components.EmptyState
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.LocalCompact
import de.yetenbi.service.ui.components.MoneyText
import de.yetenbi.service.ui.components.Pill
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Segmented
import de.yetenbi.service.ui.components.Stepper
import de.yetenbi.service.ui.tables.TableGraphic
import de.yetenbi.service.ui.tables.stateOf
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt

private enum class Dialog { None, Pay, Close, Guests, Move, Merge, VoidCheck }

/*
  One table's check. Tablet: the bill on the left (ready food, what is being ordered, what was ordered, the total),
  the menu on the right. Phone: the same two panes behind a Bill / Menu switch.
*/
@Composable
fun CheckScreen(state: UiState, vm: AppViewModel) {
    val check = state.selected ?: return
    var dialog by remember { mutableStateOf(Dialog.None) }
    var itemFor by remember { mutableStateOf<CheckItem?>(null) }
    var noteFor by remember { mutableStateOf<RoundLine?>(null) }
    val compact = LocalCompact.current
    BackHandler { vm.selectCheck(null) }

    if (compact) {
        Column(Modifier.fillMaxSize()) {
            Header(check, vm, onDialog = { dialog = it })
            val strings = LocalStrings.current
            Segmented(
                listOf(Pane.Bill to strings.check.bill, Pane.Menu to if (state.roundCount > 0) "${strings.check.menu} · ${state.roundCount}" else strings.check.menu),
                state.pane, vm::setPane, Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 6.dp), testTagPrefix = "pane",
            )
            Box(Modifier.weight(1f)) {
                if (state.pane == Pane.Bill) BillPane(state, check, vm, onItem = { itemFor = it }, onNote = { noteFor = it }, onPay = { dialog = if (state.payments) Dialog.Pay else Dialog.Close })
                else MenuPane(state, check, vm, onNote = { dish -> noteFor = RoundLine(dish, 0) })
            }
            if (state.pane == Pane.Menu && state.round.isNotEmpty()) SendBar(state, vm, onOpenRound = { vm.setPane(Pane.Bill) })
        }
    } else {
        Row(Modifier.fillMaxSize()) {
            Column(Modifier.width(440.dp).fillMaxHeight().background(Yt.Ink)) {
                Header(check, vm, onDialog = { dialog = it })
                Box(Modifier.weight(1f)) { BillPane(state, check, vm, onItem = { itemFor = it }, onNote = { noteFor = it }, onPay = { dialog = if (state.payments) Dialog.Pay else Dialog.Close }) }
            }
            Box(Modifier.fillMaxHeight().width(1.dp).background(Yt.Line))
            Box(Modifier.weight(1f)) { MenuPane(state, check, vm, onNote = { dish -> noteFor = RoundLine(dish, 0) }) }
        }
    }

    when (dialog) {
        Dialog.Pay -> PayDialog(check, onPay = { method, part, tip, given, key, done -> vm.pay(method, part, tip, given, key) { closed -> done(closed); if (closed) dialog = Dialog.None } }, onDismiss = { dialog = Dialog.None })
        Dialog.Close -> CloseTableDialog(check, onClose = { key -> vm.closeTable(key) { dialog = Dialog.None } }, onDismiss = { dialog = Dialog.None })
        Dialog.Guests -> GuestsDialog(check.guests, onSave = { vm.setGuests(it); dialog = Dialog.None }, onDismiss = { dialog = Dialog.None })
        Dialog.Move -> MoveDialog(state.freeTables, onPick = { vm.moveTo(it); dialog = Dialog.None }, onDismiss = { dialog = Dialog.None })
        Dialog.Merge -> MergeDialog(state.checks.filter { it.id != check.id }, onPick = { vm.merge(it); dialog = Dialog.None }, onDismiss = { dialog = Dialog.None })
        Dialog.VoidCheck -> VoidCheckDialog(onVoid = { vm.voidCheck(it); dialog = Dialog.None }, onDismiss = { dialog = Dialog.None })
        Dialog.None -> Unit
    }
    itemFor?.let { item -> ItemDialog(item, onServe = { vm.serveItem(item.id); itemFor = null }, onVoid = { vm.voidItem(item.id, it); itemFor = null }, onDismiss = { itemFor = null }) }
    noteFor?.let { line ->
        NoteDialog(
            dish = line.dish,
            initial = line.note,
            onSave = { note ->
                if (line.qty == 0) vm.addToRound(line.dish, note) else vm.setRoundNote(line.key, note)
                noteFor = null
            },
            onDismiss = { noteFor = null },
        )
    }
}

@Composable
private fun Header(check: Check, vm: AppViewModel, onDialog: (Dialog) -> Unit) {
    val strings = LocalStrings.current
    var menu by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, top = 8.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { vm.selectCheck(null) }, modifier = Modifier.size(52.dp).testTag("back")) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = strings.common.back, tint = Yt.Cream)
        }
        TableGraphic(check.tableLabel, maxOf(4, check.guests), check.guests, stateOf(check), Modifier.height(46.dp), numberSize = 18)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(strings.check.table(check.tableLabel), style = MaterialTheme.typography.headlineMedium, color = Yt.Cream, maxLines = 1)
            Text(
                "${strings.common.guests(check.guests)} · ${strings.common.since(Times.clock(check.openedAt))}${if (check.openedBy.isNotBlank()) " · ${check.openedBy}" else ""}",
                style = MaterialTheme.typography.bodySmall, color = Yt.Sand, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        IconButton(onClick = { onDialog(Dialog.Guests) }, modifier = Modifier.size(52.dp).testTag("guests")) { Icon(Icons.Rounded.Groups, strings.check.changeGuests, tint = Yt.GoldSoft) }
        Box {
            IconButton(onClick = { menu = true }, modifier = Modifier.size(52.dp).testTag("check-more")) { Icon(Icons.Rounded.MoreVert, null, tint = Yt.Cream) }
            DropdownMenu(menu, { menu = false }, containerColor = Yt.Ember) {
                DropdownMenuItem({ Text(strings.check.moveTable) }, leadingIcon = { Icon(Icons.Rounded.SwapHoriz, null) }, onClick = { menu = false; onDialog(Dialog.Move) })
                DropdownMenuItem({ Text(strings.check.mergeTable) }, leadingIcon = { Icon(Icons.Rounded.AddLink, null) }, onClick = { menu = false; onDialog(Dialog.Merge) }, modifier = Modifier.testTag("merge"))
                DropdownMenuItem({ Text(strings.check.changeGuests) }, leadingIcon = { Icon(Icons.Rounded.Groups, null) }, onClick = { menu = false; onDialog(Dialog.Guests) })
                DropdownMenuItem({ Text(strings.check.voidCheck, color = Yt.Coral) }, leadingIcon = { Icon(Icons.Rounded.Block, null, tint = Yt.Coral) }, onClick = { menu = false; onDialog(Dialog.VoidCheck) })
            }
        }
    }
}

/* ---------- Bill ---------- */

@Composable
private fun BillPane(state: UiState, check: Check, vm: AppViewModel, onItem: (CheckItem) -> Unit, onNote: (RoundLine) -> Unit, onPay: () -> Unit) {
    val strings = LocalStrings.current
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)) {
            if (check.readyCount > 0) item("ready") { ReadyBanner(check, onServed = { vm.serveReady() }) }
            if (check.heldCount > 0) item("held") { HeldBanner(check, onFire = vm::fire) }
            if (state.round.isNotEmpty()) item("round") { RoundPanel(state, vm, onNote) }
            if (check.items.isEmpty() && state.round.isEmpty()) {
                item("empty") { Box(Modifier.heightIn(min = 280.dp)) { EmptyState(strings.check.emptyBill, strings.check.emptyBillHint) } }
            }
            check.rounds.entries.reversed().forEach { (round, items) ->
                item("r$round") {
                    Spacer(Modifier.height(14.dp))
                    Eyebrow(strings.check.round(round, Times.clock(items.first().createdAt)) + (items.first().addedBy.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""), color = Yt.Sand)
                    Spacer(Modifier.height(6.dp))
                }
                items(items, key = { it.id }) { item -> ItemRow(item, onClick = { if (!item.isVoid) onItem(item) }) }
            }
        }
        Divider()
        Column(Modifier.background(Yt.Ink).padding(16.dp)) {
            Row(verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f)) {
                    Eyebrow(if (check.payments.isEmpty()) strings.common.total else strings.check.stillDue, color = Yt.Sand)
                    if (check.payments.isNotEmpty()) Text(strings.check.paidSoFar(Money.format(check.paidCents, strings.code)), style = MaterialTheme.typography.bodySmall, color = Yt.Ready)
                    else if (check.guests > 1 && check.totalCents > 0) Text(strings.check.perPerson(Money.format(check.totalCents / check.guests, strings.code)), style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                }
                Text(Money.format(check.dueCents, strings.code), fontFamily = Cormorant, fontWeight = FontWeight.Bold, fontSize = 36.sp, color = Yt.Cream, modifier = Modifier.testTag("check-total"))
            }
            Spacer(Modifier.height(10.dp))
            if (state.round.isNotEmpty()) SendButton(state, vm)
            else if (state.payments) PillButton(strings.check.payButton(Money.format(check.dueCents, strings.code)), onPay, icon = Icons.Rounded.Payments, enabled = check.dueCents > 0, big = true, modifier = Modifier.fillMaxWidth(), testTag = "pay")
            // No payment in the app: the total above is for the till; this only frees the table.
            else PillButton(strings.check.closeTable, onPay, icon = Icons.Rounded.TaskAlt, enabled = check.isOpen && check.dueCents > 0, big = true, modifier = Modifier.fillMaxWidth(), testTag = "close-table")
        }
    }
}

@Composable
private fun ReadyBanner(check: Check, onServed: () -> Unit) {
    val strings = LocalStrings.current
    Surface(shape = RoundedCornerShape(16.dp), color = Yt.Ready.copy(alpha = 0.14f), border = BorderStroke(1.dp, Yt.Ready), modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).testTag("ready-banner")) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.NotificationsActive, null, tint = Yt.Ready)
                Spacer(Modifier.width(8.dp))
                Text(strings.check.atPass, style = MaterialTheme.typography.titleMedium, color = Yt.Ready)
            }
            Spacer(Modifier.height(6.dp))
            check.ready.forEach { Text("${it.qty}× ${it.name.of(strings.code)}${it.seat?.let { s -> " · ${strings.check.seat(s)}" } ?: ""}", style = MaterialTheme.typography.bodyLarge, color = Yt.Cream) }
            Spacer(Modifier.height(10.dp))
            PillButton(strings.check.allServed, onServed, kind = ButtonKind.Ready, big = true, modifier = Modifier.fillMaxWidth(), testTag = "all-served")
        }
    }
}

/* Dishes waiting as "later": one tap sends them to the kitchen (e.g. the mains, once the starters are eaten). */
@Composable
private fun HeldBanner(check: Check, onFire: () -> Unit) {
    val strings = LocalStrings.current
    Surface(shape = RoundedCornerShape(16.dp), color = Yt.Coal, border = BorderStroke(1.dp, Yt.Sand.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).testTag("held-banner")) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Schedule, null, tint = Yt.Sand)
                Spacer(Modifier.width(8.dp))
                Text(strings.check.later, style = MaterialTheme.typography.titleMedium, color = Yt.Cream)
            }
            Spacer(Modifier.height(4.dp))
            check.items.filter { it.status == ItemStatus.HELD }.forEach { Text("${it.qty}× ${it.name.of(strings.code)}${it.seat?.let { s -> " · ${strings.check.seat(s)}" } ?: ""}", style = MaterialTheme.typography.bodyMedium, color = Yt.Sand) }
            Spacer(Modifier.height(10.dp))
            PillButton(strings.check.fire(check.heldCount), onFire, icon = Icons.AutoMirrored.Rounded.Send, big = true, modifier = Modifier.fillMaxWidth(), testTag = "fire")
        }
    }
}

@Composable
private fun ItemRow(item: CheckItem, onClick: () -> Unit) {
    val strings = LocalStrings.current
    val (label, color) = when (item.status) {
        ItemStatus.HELD -> strings.check.statusHeld to Yt.Sand
        ItemStatus.SENT -> strings.check.statusSent to Yt.Gold
        ItemStatus.READY -> strings.check.statusReady to Yt.Ready
        ItemStatus.VOID -> strings.check.statusVoid to Yt.Coral
        else -> strings.check.statusServed to Yt.Sand.copy(alpha = 0.6f)
    }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(vertical = 10.dp, horizontal = 4.dp).testTag("item-${item.id}"),
        verticalAlignment = Alignment.Top,
    ) {
        Text("${item.qty}×", fontFamily = Cormorant, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = if (item.isVoid) Yt.Sand.copy(alpha = 0.5f) else Yt.GoldSoft, modifier = Modifier.width(36.dp))
        Column(Modifier.weight(1f)) {
            Text(item.name.of(strings.code), style = MaterialTheme.typography.bodyLarge.copy(textDecoration = if (item.isVoid) TextDecoration.LineThrough else null), color = if (item.isVoid) Yt.Sand.copy(alpha = 0.6f) else Yt.Cream)
            if (item.note.isNotBlank()) Text("→ ${item.note}", style = MaterialTheme.typography.bodySmall, color = Yt.Coral)
            if (item.isVoid && item.voidReason.isNotBlank()) Text(item.voidReason, style = MaterialTheme.typography.bodySmall, color = Yt.Sand.copy(alpha = 0.6f))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 3.dp)) {
                item.seat?.let { Pill(strings.check.seat(it), Yt.Ember, onColor = Yt.GoldSoft) }
                if (item.kitchen || item.isVoid) Pill(label, color.copy(alpha = 0.18f), onColor = color)
                if (item.isPaid) Pill(strings.check.paid, Yt.Ready.copy(alpha = 0.18f), onColor = Yt.Ready)
            }
        }
        MoneyText(item.lineCents.takeIf { !item.isVoid } ?: (item.unitCents * item.qty), strike = item.isVoid, color = if (item.isVoid) Yt.Sand.copy(alpha = 0.5f) else Yt.Cream, fontSize = 16.sp)
    }
}

/* What is being ordered right now, before it goes to the kitchen: per line the seat, "later" and quick wishes. */
@Composable
private fun RoundPanel(state: UiState, vm: AppViewModel, onNote: (RoundLine) -> Unit) {
    val strings = LocalStrings.current
    val locked = state.unsentKey != null
    Surface(shape = RoundedCornerShape(16.dp), color = Yt.Coal, border = BorderStroke(1.dp, if (locked) Yt.Coral else Yt.Gold.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).testTag("round")) {
        Column(Modifier.padding(14.dp)) {
            if (locked) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.CloudOff, null, tint = Yt.Coral, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(strings.check.unsent, style = MaterialTheme.typography.titleSmall, color = Yt.Coral)
                }
                Text(strings.check.unsentHint, style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                Spacer(Modifier.height(8.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Eyebrow(strings.check.newRound, Modifier.weight(1f))
                MoneyText(state.roundCents, color = Yt.GoldSoft)
            }
            Spacer(Modifier.height(8.dp))
            state.round.forEach { line ->
                val drink = state.isDrink(line.dish)
                Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(line.dish.name.of(strings.code), style = MaterialTheme.typography.bodyLarge, color = Yt.Cream, maxLines = 2)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                line.seat?.let { Pill(strings.check.seat(it), Yt.Ember, onColor = Yt.GoldSoft) }
                                if (line.hold) Pill(strings.check.later, Yt.Sand.copy(alpha = 0.2f), onColor = Yt.Cream)
                                Surface(onClick = { onNote(line) }, enabled = !locked, shape = CircleShape, color = Color.Transparent, modifier = Modifier.testTag("note-${line.dish.id}")) {
                                    Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Rounded.EditNote, null, tint = if (line.note.isBlank()) Yt.Sand else Yt.Coral, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(line.note.ifBlank { strings.check.addNote }, style = MaterialTheme.typography.bodySmall, color = if (line.note.isBlank()) Yt.Sand else Yt.Coral, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                            }
                        }
                        Stepper(line.qty, { vm.changeRound(line.key, it - line.qty) }, min = 0, max = 99, tag = "round-${line.dish.id}")
                    }
                    // Quick wishes and "later", one tap each (food only).
                    if (!drink && !locked) {
                        val wishes = line.note.split(",").map { it.trim() }
                        Row(Modifier.horizontalScroll(rememberScrollState()).padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            SmallChip(strings.check.later, line.hold, tag = "later-${line.dish.id}") { vm.editRoundLine(line.key) { it.copy(hold = !it.hold) } }
                            strings.check.noteSuggestions.take(5).forEach { wish ->
                                SmallChip(wish, wish in wishes) { vm.toggleWish(line.key, wish) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SmallChip(text: String, selected: Boolean, tag: String? = null, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = if (selected) Yt.GoldSoft else Color.Transparent,
        contentColor = if (selected) Yt.Ink else Yt.Sand,
        border = if (selected) null else BorderStroke(1.dp, Yt.Cream.copy(alpha = 0.18f)),
        modifier = Modifier.heightIn(min = 36.dp).then(if (tag != null) Modifier.testTag(tag) else Modifier),
    ) {
        Box(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), contentAlignment = Alignment.Center) {
            Text(text, style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 0.2.sp), maxLines = 1)
        }
    }
}

@Composable
private fun SendButton(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    val haptic = LocalHapticFeedback.current
    val label = when {
        state.unsentKey != null -> strings.check.sendAgain
        state.roundHasFood -> strings.check.sendKitchen(state.roundCount)
        else -> strings.check.book(state.roundCount)
    }
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        PillButton(if (state.unsentKey != null) strings.check.discard else strings.common.cancel, vm::clearRound, kind = ButtonKind.Secondary, big = true)
        PillButton(label, { haptic.performHapticFeedback(HapticFeedbackType.Confirm); vm.sendRound() }, icon = Icons.AutoMirrored.Rounded.Send, big = true, modifier = Modifier.weight(1f), testTag = "send")
    }
}

/* Phone, menu pane: what is in the round, and the send button, always in reach. */
@Composable
private fun SendBar(state: UiState, vm: AppViewModel, onOpenRound: () -> Unit) {
    val strings = LocalStrings.current
    val haptic = LocalHapticFeedback.current
    Row(Modifier.fillMaxWidth().background(Yt.Ink).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(onClick = onOpenRound, shape = RoundedCornerShape(12.dp), color = Color.Transparent, modifier = Modifier.weight(1f)) {
            Column(Modifier.padding(4.dp)) {
                Text(state.round.joinToString(", ") { "${it.qty}× ${it.dish.name.of(strings.code)}" }, style = MaterialTheme.typography.bodySmall, color = Yt.Sand, maxLines = 1, overflow = TextOverflow.Ellipsis)
                MoneyText(state.roundCents, color = Yt.GoldSoft)
            }
        }
        Spacer(Modifier.width(10.dp))
        val label = when {
            state.unsentKey != null -> strings.check.sendAgain
            state.roundHasFood -> strings.check.sendKitchen(state.roundCount)
            else -> strings.check.book(state.roundCount)
        }
        PillButton(label, { haptic.performHapticFeedback(HapticFeedbackType.Confirm); vm.sendRound() }, icon = Icons.AutoMirrored.Rounded.Send, big = true, testTag = "send-bar")
    }
}

/* ---------- Menu ---------- */

@Composable
private fun MenuPane(state: UiState, check: Check, vm: AppViewModel, onNote: (Dish) -> Unit) {
    val strings = LocalStrings.current
    val compact = LocalCompact.current
    val haptic = LocalHapticFeedback.current
    val categories = state.categories
    val popular = state.popularDishes
    val searching = state.search.isNotBlank()
    val inRound = state.round.groupBy { it.dish.id }.mapValues { (_, lines) -> lines.sumOf { it.qty } }
    val add = { dish: Dish -> haptic.performHapticFeedback(HapticFeedbackType.ContextClick); vm.addToRound(dish) }
    Column(Modifier.fillMaxSize()) {
        SearchField(state.search, vm::setSearch, Modifier.padding(start = 14.dp, end = 14.dp, top = 10.dp))
        if (!searching) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip(strings.check.all, state.category == null, { vm.setCategory(null) })
                if (popular.isNotEmpty()) Chip(strings.check.popular, state.category == POPULAR, { vm.setCategory(POPULAR) })
                categories.forEach { c -> Chip(c.title.of(strings.code), state.category == c.id, { vm.setCategory(c.id) }) }
            }
        }
        SeatBar(state, check, vm)
        val sections: List<Pair<String, List<Dish>>> = when {
            searching -> listOf("" to categories.flatMap { it.items }.filter { it.matches(state.search) })
            state.category == POPULAR -> listOf(strings.check.popular to popular)
            state.category != null -> categories.filter { it.id == state.category }.map { it.title.of(strings.code) to it.items }
            else -> (if (popular.isNotEmpty()) listOf(strings.check.popular to popular.take(6)) else emptyList()) + categories.map { it.title.of(strings.code) to it.items }
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(if (compact) 150.dp else 190.dp),
            contentPadding = PaddingValues(start = 14.dp, end = 14.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize().testTag("menu"),
        ) {
            if (searching && sections.first().second.isEmpty()) {
                item(span = { GridItemSpan(maxLineSpan) }) { Text(strings.check.noMatch, color = Yt.Sand, modifier = Modifier.padding(vertical = 24.dp)) }
            }
            sections.forEachIndexed { index, (title, dishes) ->
                if (title.isNotBlank()) item(key = "c-$index-$title", span = { GridItemSpan(maxLineSpan) }) {
                    Text(title, style = MaterialTheme.typography.headlineSmall, color = Yt.GoldSoft, modifier = Modifier.padding(top = 8.dp))
                }
                items(dishes, key = { "$index-${it.id}" }) { dish ->
                    DishTile(dish, inRound[dish.id] ?: 0, onAdd = { add(dish) }, onLong = { onNote(dish) })
                }
            }
        }
    }
}

@Composable
private fun SearchField(value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val strings = LocalStrings.current
    Row(
        modifier.fillMaxWidth().clip(CircleShape).background(Yt.Ink).padding(horizontal = 14.dp).heightIn(min = 48.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Search, null, tint = Yt.Sand, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text(strings.check.search, color = Yt.Sand.copy(alpha = 0.7f), style = MaterialTheme.typography.bodyLarge)
            BasicTextField(
                value, onChange, singleLine = true, cursorBrush = SolidColor(Yt.Gold),
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = Yt.Cream),
                modifier = Modifier.fillMaxWidth().testTag("search"),
            )
        }
        if (value.isNotEmpty()) IconButton({ onChange("") }) { Icon(Icons.Rounded.Close, strings.common.cancel, tint = Yt.Sand) }
    }
}

/* Which seat the next dishes are for (Tisch = shared), and whether they wait as "later". */
@Composable
private fun SeatBar(state: UiState, check: Check, vm: AppViewModel) {
    val strings = LocalStrings.current
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(start = 14.dp, end = 14.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(strings.check.seatFor, style = MaterialTheme.typography.labelLarge, color = Yt.Sand)
        SmallChip(strings.check.seatTable, state.seat == null, tag = "seat-0") { vm.setSeat(null) }
        (1..check.guests.coerceIn(1, 12)).forEach { n -> SmallChip(strings.check.seat(n), state.seat == n, tag = "seat-$n") { vm.setSeat(n) } }
        Spacer(Modifier.width(8.dp))
        SmallChip("⏱ ${strings.check.later}", state.hold, tag = "hold") { vm.setHold(!state.hold) }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun DishTile(dish: Dish, count: Int, onAdd: () -> Unit, onLong: () -> Unit) {
    val strings = LocalStrings.current
    val chosen = count > 0
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (chosen) Yt.Ember else Yt.Coal,
        border = BorderStroke(if (chosen) 1.5.dp else 1.dp, if (chosen) Yt.Gold else Yt.Line),
        modifier = Modifier.fillMaxWidth().heightIn(min = 112.dp).combinedClickable(enabled = dish.available, onClick = onAdd, onLongClick = onLong).testTag("dish-${dish.id}"),
    ) {
        Box {
            Column(Modifier.padding(12.dp)) {
                Text(dish.name.of(strings.code), style = MaterialTheme.typography.titleSmall, color = if (dish.available) Yt.Cream else Yt.Sand.copy(alpha = 0.5f), maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (dish.amharic.isNotBlank()) Text(dish.amharic, style = MaterialTheme.typography.bodySmall, color = Yt.Sand.copy(alpha = if (dish.available) 0.8f else 0.4f), maxLines = 1)
                Spacer(Modifier.weight(1f, fill = false).height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MoneyText(dish.priceCents, color = if (dish.available) Yt.GoldSoft else Yt.Sand.copy(alpha = 0.5f), fontSize = 15.sp, modifier = Modifier.weight(1f))
                    if ("vegan" in dish.tags) Icon(Icons.Rounded.Spa, strings.check.vegan, tint = Yt.Ready, modifier = Modifier.size(16.dp))
                    if ("spicy" in dish.tags) Icon(Icons.Rounded.LocalFireDepartment, strings.check.spicy, tint = Yt.Coral, modifier = Modifier.size(16.dp))
                    if (!dish.available) Pill(strings.check.soldOut, Yt.Coral.copy(alpha = 0.2f), onColor = Yt.Coral)
                }
            }
            AnimatedVisibility(chosen, modifier = Modifier.align(Alignment.TopEnd).padding(6.dp)) {
                Box(Modifier.size(26.dp).background(Yt.Gold, CircleShape), contentAlignment = Alignment.Center) {
                    Text("$count", color = Yt.Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}
