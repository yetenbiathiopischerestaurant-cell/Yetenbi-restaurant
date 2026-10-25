package de.yetenbi.service

import de.yetenbi.service.data.Api
import de.yetenbi.service.data.Bootstrap
import de.yetenbi.service.data.Check
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/* A table freed with "Tisch schließen" (no payment in the app) and the switch that turns payments off. */
class ClosedCheckTest {
    private val json = Api("http://localhost", { null }).json

    @Test fun parsesAClosedCheck() {
        val check = json.decodeFromString<Check>(
            """{"id":7,"number":12,"tableId":"t3","tableLabel":"3","guests":2,"status":"closed","closedAt":"2026-10-25T20:15:00Z",
               "closedBy":"Sara","payment":null,"total":36.0,"tip":0,"receiptToken":null,"payments":[],
               "items":[{"id":1,"round":1,"itemId":"d1","name":{"de":"Doro Wat"},"unit":18.0,"qty":2,"status":"served"}]}""",
        )
        assertTrue(check.isClosed)
        assertFalse(check.isOpen)
        assertEquals(3600, check.totalCents)
        assertEquals(0, check.tipCents)
        assertEquals(0, check.dueCents)
        assertNull(check.receiptToken)
    }

    @Test fun anUnknownStatusDoesNotCrash() {
        val check = json.decodeFromString<Check>("""{"id":1,"number":1,"tableId":"t1","tableLabel":"1","guests":1,"status":"something_new"}""")
        assertFalse(check.isOpen)
        assertFalse(check.isClosed)
    }

    @Test fun paymentsAreOnUnlessTheServerSaysOff() {
        val user = """"user":{"id":1,"email":"a@b.de","name":"A","role":"waiter"}"""
        assertTrue(json.decodeFromString<Bootstrap>("{$user}").features.payments)
        assertTrue(json.decodeFromString<Bootstrap>("""{$user,"features":{"feedback":true}}""").features.payments)
        assertFalse(json.decodeFromString<Bootstrap>("""{$user,"features":{"feedback":true,"payments":false}}""").features.payments)
    }
}
