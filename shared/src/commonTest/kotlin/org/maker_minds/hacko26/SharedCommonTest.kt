package org.maker_minds.hacko26

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SharedCommonTest {

    @Test
    fun normalizePointerToUsername_extractsFromDollarPrefix() {
        val client = InterledgerClient()

        val username = client.normalizePointerToUsername("$ilp.interledger-test.dev/bob")

        assertEquals("bob", username)
    }

    @Test
    fun normalizePointerToUsername_extractsFromUrl() {
        val client = InterledgerClient()

        val username = client.normalizePointerToUsername("https://ilp.interledger-test.dev/alice")

        assertEquals("alice", username)
    }

    @Test
    fun normalizePointerToUsername_rejectsEmptyValue() {
        val client = InterledgerClient()

        assertFailsWith<IllegalArgumentException> {
            client.normalizePointerToUsername("   ")
        }
    }
}
