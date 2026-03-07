package org.maker_minds.hacko26

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform