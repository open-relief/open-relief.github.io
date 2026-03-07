package org.maker_minds.hacko26

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlinx.serialization.Serializable


@Serializable
data class PaymentRequest(
    val from: String,
    val to: String,
    val amount: Long
)


class InterledgerClient {

    private val client = getHttpClient()

    private var selfAccount: String? = null
    private var targetAccount: String? = null

    fun setSelfAccount(address: String) {
        selfAccount = address
    }

    fun setTargetAccount(address: String) {
        targetAccount = address
    }



    /**
     * Sends a payment using Interledger REST endpoint.
     * Throws IllegalStateException if accounts are not set.
     */
    suspend fun sendPayment(amount: Long): String {
        val from = selfAccount ?: throw IllegalStateException("Self account not set")
        val to = targetAccount ?: throw IllegalStateException("Target account not set")

        val request = PaymentRequest(from, to, amount)

        val response: HttpResponse = client.post("https://your-ilp-node.example.com/pay") {
            setBody(request)
        }

        return response.bodyAsText()
    }


}

expect fun getHttpClient(): HttpClient