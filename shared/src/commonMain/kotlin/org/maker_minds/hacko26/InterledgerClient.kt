package org.maker_minds.hacko26

import io.ktor.client.*
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class PaymentPointerResponse(
    val authServer: String,
    val resourceServer: String,
    val assetCode: String,
    val assetScale: Int
)

@Serializable
private data class AccessTokenRequest(
    val grant_type: String = "client_credentials"
)

@Serializable
data class AccessTokenResponse(
    val access_token: String,
    val token_type: String? = null,
    val expires_in: Long? = null
)

@Serializable
private data class QuoteReceiver(
    val id: String
)

@Serializable
private data class QuoteAmount(
    val value: String,
    val assetCode: String,
    val assetScale: Int
)

@Serializable
private data class QuoteRequest(
    val receiver: QuoteReceiver,
    val method: String = "fixed-send",
    val debitAmount: QuoteAmount
)

@Serializable
data class QuoteResponse(
    val id: String,
    val receiver: QuoteReceiver? = null,
    val debitAmount: QuoteAmount? = null,
    val receiveAmount: QuoteAmount? = null
)

@Serializable
private data class PaymentRequest(
    @SerialName("quoteId")
    val quoteId: String
)

@Serializable
data class PaymentResponse(
    val id: String? = null,
    val quoteId: String? = null,
    val status: String? = null,
    val result: JsonObject? = null
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
     * Executes Open Payments flow used by the Interledger test wallet:
     * 1) resolve payment pointer
     * 2) create access token
     * 3) create quote
     * 4) create payment
     */
    suspend fun sendPayment(amount: Long): PaymentResponse {
        val from = selfAccount ?: throw IllegalStateException("Self account not set")
        val to = targetAccount ?: throw IllegalStateException("Target account not set")
        require(amount > 0) { "Amount must be greater than zero" }

        val receiver = resolvePaymentPointer(to)
        val accessToken = fetchAccessToken(receiver.authServer)

        val quote = createQuote(
            resourceServer = receiver.resourceServer,
            accessToken = accessToken.access_token,
            sender = from,
            receiver = to,
            amount = amount,
            assetCode = receiver.assetCode,
            assetScale = receiver.assetScale
        )

        return createPayment(
            resourceServer = receiver.resourceServer,
            accessToken = accessToken.access_token,
            quoteId = quote.id
        )
    }

    suspend fun resolvePaymentPointer(paymentPointer: String): PaymentPointerResponse {
        val username = normalizePointerToUsername(paymentPointer)
        val endpointUrl = "https://ilp.interledger-test.dev/$username"

        val response = client.get(endpointUrl) {
            contentType(ContentType.Application.Json)
            accept(ContentType.Application.Json)
        }

        ensureSuccess(response, "Failed to resolve payment pointer")
        return response.body()
    }

    private suspend fun fetchAccessToken(authServer: String): AccessTokenResponse {
        val tokenUrl = "${authServer.trimEnd('/')}/token"
        val response = client.post(tokenUrl) {
            contentType(ContentType.Application.Json)
            accept(ContentType.Application.Json)
            setBody(AccessTokenRequest())
        }

        ensureSuccess(response, "Failed to get access token")
        return response.body()
    }

    private suspend fun createQuote(
        resourceServer: String,
        accessToken: String,
        sender: String,
        receiver: String,
        amount: Long,
        assetCode: String,
        assetScale: Int
    ): QuoteResponse {
        val quoteUrl = "${resourceServer.trimEnd('/')}/quotes"
        val response = client.post(quoteUrl) {
            contentType(ContentType.Application.Json)
            accept(ContentType.Application.Json)
            bearerAuth(accessToken)
            setBody(
                QuoteRequest(
                    receiver = QuoteReceiver(id = receiver),
                    debitAmount = QuoteAmount(
                        value = amount.toString(),
                        assetCode = assetCode,
                        assetScale = assetScale
                    )
                )
            )
            header("X-Sender", sender)
        }

        ensureSuccess(response, "Failed to create quote")
        return response.body()
    }

    private suspend fun createPayment(
        resourceServer: String,
        accessToken: String,
        quoteId: String
    ): PaymentResponse {
        val paymentsUrl = "${resourceServer.trimEnd('/')}/payments"
        val response = client.post(paymentsUrl) {
            contentType(ContentType.Application.Json)
            accept(ContentType.Application.Json)
            bearerAuth(accessToken)
            setBody(PaymentRequest(quoteId = quoteId))
        }

        ensureSuccess(response, "Failed to create payment")
        return response.body()
    }

    private suspend fun ensureSuccess(response: HttpResponse, message: String) {
        if (!response.status.isSuccess()) {
            throw IllegalStateException("$message. HTTP ${response.status.value}: ${response.bodyAsText()}")
        }
    }

    internal fun normalizePointerToUsername(paymentPointer: String): String {
        val normalized = paymentPointer.trim()
        require(normalized.isNotBlank()) { "Payment pointer cannot be empty" }

        val rawValue = when {
            normalized.startsWith("$") -> normalized.removePrefix("$")
            normalized.startsWith("http://") || normalized.startsWith("https://") -> {
                Url(normalized).encodedPath.removePrefix("/")
            }
            else -> normalized
        }

        val username = rawValue
            .substringAfterLast('/')
            .trim()

        require(username.isNotBlank()) { "Invalid payment pointer username" }
        return username
    }
}

expect fun getHttpClient(): HttpClient
