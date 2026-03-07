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

@Serializable
private data class PaymentPointerResolutionResponse(
    @SerialName("destination_account")
    val destinationAccount: String,
    @SerialName("shared_secret")
    val sharedSecret: String
)

data class ResolvedPaymentEndpoint(
    val destinationAccount: String,
    val sharedSecret: String
)

class PaymentPointerResolutionException(message: String, cause: Throwable? = null) :
    IllegalStateException(message, cause)

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

    /**
     * Resolves an Interledger payment pointer into its SPSP/Open Payments details.
     */
    suspend fun resolvePaymentPointer(paymentPointer: String): ResolvedPaymentEndpoint {
        val endpointUrl = derivePaymentPointerEndpoint(paymentPointer)

        val response = client.get(endpointUrl) {
            header(HttpHeaders.Accept, "application/spsp4+json, application/monetization+json")
        }

        if (!response.status.isSuccess()) {
            throw PaymentPointerResolutionException(
                "Failed to resolve payment pointer. HTTP ${response.status.value}: ${response.bodyAsText()}"
            )
        }

        return runCatching {
            val body = response.body<PaymentPointerResolutionResponse>()
            ResolvedPaymentEndpoint(
                destinationAccount = body.destinationAccount,
                sharedSecret = body.sharedSecret
            )
        }.getOrElse { error ->
            throw PaymentPointerResolutionException(
                "Invalid SPSP/Open Payments response for endpoint: $endpointUrl",
                error
            )
        }
    }

    internal fun derivePaymentPointerEndpoint(paymentPointer: String): String {
        val normalizedPointer = paymentPointer.trim()
        require(normalizedPointer.startsWith("$")) {
            "Payment pointer must start with '$'"
        }

        val path = normalizedPointer.removePrefix("$")
        require(path.isNotBlank()) {
            "Payment pointer cannot be empty"
        }

        return "https://$path"
    }
}

expect fun getHttpClient(): HttpClient
