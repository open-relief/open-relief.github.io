package org.maker_minds.hacko26

import io.ktor.client.*
import io.ktor.client.engine.js.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.asPromise
import kotlinx.coroutines.async

actual fun getHttpClient(): HttpClient = HttpClient(Js) {
    install(ContentNegotiation) {
        json()
    }
}

@OptIn(DelicateCoroutinesApi::class)
fun InterledgerClient.sendStreamPaymentAsync(
    senderAccount: String,
    destinationPaymentPointer: String,
    amount: Long
): dynamic {
    return kotlinx.coroutines.GlobalScope.async {
        sendStreamPayment(senderAccount, destinationPaymentPointer, amount)
    }.asPromise()
}

class JsPlatform: Platform {
    override val name: String = "Web with Kotlin/JS"
}

actual fun getPlatform(): Platform = JsPlatform()
