package org.maker_minds.hacko26

import io.ktor.client.*
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StreamPaymentRequest(
    @SerialName("senderAccount")
    val from: String,
    @SerialName("destinationPaymentPointer")
    val to: String,
    @SerialName("sourceAmount")
    val amount: String,
    val protocol: String = "STREAM"
)

@Serializable
data class StreamPaymentResponse(
    val id: String? = null,
    val status: String? = null,
    val deliveredAmount: String? = null,
    val message: String? = null
)

class InterledgerClient(
    private val streamSenderEndpoint: String = "http://localhost:3000/stream/send"
) {

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
     * Sends a STREAM-compatible payment request.
     * Throws IllegalStateException if accounts are not set.
     */
    suspend fun sendPayment(amount: Long): String {
        val from = selfAccount ?: throw IllegalStateException("Self account not set")
        val to = targetAccount ?: throw IllegalStateException("Target account not set")

        val request = StreamPaymentRequest(from = from, to = to, amount = amount.toString())

        val response: HttpResponse = client.post(streamSenderEndpoint) {
            contentType(ContentType.Application.Json)
            setBody(request)
        }

        return if (response.status.isSuccess()) {
            runCatching {
                response.body<StreamPaymentResponse>()
            }.getOrNull()?.toString() ?: response.bodyAsText()
        } else {
            throw IllegalStateException(response.bodyAsText())
        }
    }
}

expect fun getHttpClient(): HttpClient
