package de.yetenbi.service.ui.check

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckItem
import de.yetenbi.service.data.DiningTable
import de.yetenbi.service.data.Dish
import de.yetenbi.service.data.ItemStatus
import de.yetenbi.service.data.Keys
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.PayMethod
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Chip
import de.yetenbi.service.ui.components.Divider
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.Keypad
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Segmented
import de.yetenbi.service.ui.components.Stepper
import de.yetenbi.service.ui.components.applyKey
import de.yetenbi.service.ui.login.fieldColors
import de.yetenbi.service.ui.tables.TableGraphic
import de.yetenbi.service.ui.tables.TableState
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt

@Composable
fun GuestsDialog(current: Int, onSave: (Int) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var guests by remember { mutableIntStateOf(current) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.changeGuests, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { Stepper(guests, { guests = it }, big = true, tag = "edit-guests") } },
        confirmButton = { PillButton(strings.common.save, { onSave(guests) }, testTag = "save-guests") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MoveDialog(free: List<DiningTable>, onPick: (DiningTable) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.moveTable, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column {
                Text(strings.check.moveHint, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
                Spacer(Modifier.height(12.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    free.forEach { table ->
                        androidx.compose.material3.Surface(onClick = { onPick(table) }, color = Yt.Ink, shape = MaterialTheme.shapes.large, modifier = Modifier.testTag("move-${table.label}")) {
                            TableGraphic(table.label, table.seats, 0, TableState.Free, Modifier.widthIn(max = 110.dp).padding(8.dp), numberSize = 26)
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReasonPicker(reasons: List<String>, reason: String, onReason: (String) -> Unit) {
    val strings = LocalStrings.current
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        reasons.forEach { r -> Chip(r, reason == r, { onReason(r) }) }
    }
    Spacer(Modifier.height(10.dp))
    OutlinedTextField(reason, { onReason(it.take(140)) }, label = { Text(strings.check.voidReason) }, singleLine = true, colors = fieldColors(), modifier = Modifier.fillMaxWidth().testTag("reason"))
}

@Composable
fun VoidCheckDialog(onVoid: (String) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var reason by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.voidCheck, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column {
                Text(strings.check.voidCheckHint, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
                Spacer(Modifier.height(12.dp))
                ReasonPicker(strings.check.voidReasons, reason) { reason = it }
            }
        },
        confirmButton = { PillButton(strings.check.voidCheck, { onVoid(reason) }, kind = ButtonKind.Danger, icon = Icons.Rounded.Block, testTag = "confirm-void-check") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

/* "Tisch schließen" (no payments in the app): the waiter takes the money at the till, the table becomes free. */
@Composable
fun CloseTableDialog(check: Check, onClose: (key: String) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    // One key per dialog: pressing again after a dropped connection closes the table only once.
    val key = remember(check.id) { Keys.new() }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.closeTitle(check.tableLabel), style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = { Text(strings.check.closeBody(Money.format(check.dueCents, strings.code)), style = MaterialTheme.typography.bodyMedium, color = Yt.Sand) },
        confirmButton = { PillButton(strings.check.close, { onClose(key) }, icon = Icons.Rounded.TaskAlt, testTag = "confirm-close-table") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

/* Tapping a line on the bill: mark it served, or take it off with a reason. */
@Composable
fun ItemDialog(item: CheckItem, onServe: () -> Unit, onVoid: (String) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var voiding by remember { mutableStateOf(false) }
    var reason by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text("${item.qty}× ${item.name.of(strings.code)}", style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column {
                if (item.note.isNotBlank()) Text("→ ${item.note}", color = Yt.Coral, style = MaterialTheme.typography.bodyMedium)
                Text("${Money.format(item.lineCents, strings.code)} · ${strings.check.by(item.addedBy)}", color = Yt.Sand, style = MaterialTheme.typography.bodySmall)
                if (voiding) {
                    Spacer(Modifier.height(14.dp))
                    ReasonPicker(strings.check.voidReasons, reason) { reason = it }
                }
            }
        },
        confirmButton = {
            if (voiding) PillButton(strings.check.voidItem, { onVoid(reason) }, kind = ButtonKind.Danger, enabled = reason.isNotBlank(), testTag = "confirm-void")
            else if (item.status != ItemStatus.SERVED) PillButton(strings.check.served, onServe, kind = ButtonKind.Ready, icon = Icons.Rounded.Check, testTag = "serve")
        },
        dismissButton = {
            Row {
                if (!voiding) PillButton(strings.check.voidItem, { voiding = true }, kind = ButtonKind.Danger, testTag = "void")
                PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost)
            }
        },
    )
}

/* A wish for the kitchen ("extra scharf", "ohne Zwiebeln"): quick picks or typed. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NoteDialog(dish: Dish, initial: String, onSave: (String) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var note by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = {
            Column {
                Eyebrow(strings.check.noteTitle)
                Text(dish.name.of(strings.code), style = MaterialTheme.typography.headlineSmall, color = Yt.Cream)
            }
        },
        text = {
            Column {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    strings.check.noteSuggestions.forEach { s ->
                        Chip(s, note.contains(s), { note = if (note.contains(s)) note.replace(s, "").replace(Regex(",\\s*,"), ",").trim(' ', ',') else listOf(note, s).filter { it.isNotBlank() }.joinToString(", ") })
                    }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(note, { note = it.take(140) }, placeholder = { Text(strings.check.notePlaceholder) }, colors = fieldColors(), modifier = Modifier.fillMaxWidth().testTag("note-field"))
            }
        },
        confirmButton = { PillButton(strings.common.save, { onSave(note) }, testTag = "save-note") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}
