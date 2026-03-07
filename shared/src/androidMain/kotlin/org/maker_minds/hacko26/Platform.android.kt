package org.maker_minds.hacko26

import android.os.Build
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*


class AndroidPlatform : Platform {
    override val name: String = "Android ${Build.VERSION.SDK_INT}"
}

actual fun getPlatform(): Platform = AndroidPlatform()



actual fun getHttpClient(): HttpClient = HttpClient(OkHttp) {
    install(ContentNegotiation) {
        json()
    }
}