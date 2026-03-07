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
    val senderAccount: String,
    @SerialName("destinationPaymentPointer")
    val destinationPaymentPointer: String,
    @SerialName("sourceAmount")
    val sourceAmount: String,
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
    private val streamSenderEndpoint: String
) {

    private val client = getHttpClient()

    /**
     * Sends a STREAM-compatible Interledger payment to a configurable remote wallet endpoint.
     *
     * Request body keys:
     * - senderAccount
     * - destinationPaymentPointer
     * - sourceAmount
     * - protocol (always "STREAM")
     *
     * Throws IllegalStateException when the HTTP status is not successful.
     */
    suspend fun sendStreamPayment(
        senderAccount: String,
        destinationPaymentPointer: String,
        amount: Long
    ): StreamPaymentResponse {
        val request = StreamPaymentRequest(
            senderAccount = senderAccount,
            destinationPaymentPointer = destinationPaymentPointer,
            sourceAmount = amount.toString(),
            protocol = "STREAM"
        )

        val response: HttpResponse = client.post(streamSenderEndpoint) {
            contentType(ContentType.Application.Json)
            setBody(request)
        }

        if (!response.status.isSuccess()) {
            throw IllegalStateException(
                "STREAM payment failed (${response.status.value}): ${response.bodyAsText()}"
            )
        }

        return response.body()
    }
}

expect fun getHttpClient(): HttpClient
