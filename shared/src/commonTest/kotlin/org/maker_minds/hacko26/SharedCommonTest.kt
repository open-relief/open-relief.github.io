package org.maker_minds.hacko26

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SharedCommonTest {

    @Test
    fun derivePaymentPointerEndpoint_convertsToHttpsUrl() {
        val client = InterledgerClient()

        val endpoint = client.derivePaymentPointerEndpoint("$example.com/bob")

        assertEquals("https://example.com/bob", endpoint)
    }

    @Test
    fun derivePaymentPointerEndpoint_rejectsMissingPrefix() {
        val client = InterledgerClient()

        assertFailsWith<IllegalArgumentException> {
            client.derivePaymentPointerEndpoint("example.com/bob")
        }
    }
}
