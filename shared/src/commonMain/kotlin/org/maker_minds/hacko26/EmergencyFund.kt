package org.maker_minds.hacko26

import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport
import kotlin.time.Clock

@OptIn(ExperimentalJsExport::class)
@JsExport
enum class UserRole {
    Admin,
    User
}

@OptIn(ExperimentalJsExport::class)
@JsExport
enum class UrgencyLevel {
    Low,
    Medium,
    High
}

@OptIn(ExperimentalJsExport::class)
@JsExport
enum class FundingRequestStatus {
    Open,
    Approved,
    Rejected
}

@OptIn(ExperimentalJsExport::class)
@JsExport
data class User(
    val id: String,
    val email: String,
    val role: UserRole
)

@OptIn(ExperimentalJsExport::class)
@JsExport
data class SurveyData(
    val householdSize: Int,
    val incomePerCapita: Double,
    val location: String,
    val paymentPointer: String,
    val notes: String?
)

@OptIn(ExperimentalJsExport::class)
@JsExport
data class Donation(
    val id: String,
    val userId: String,
    val amount: Double,
    val timestamp: String
)

@OptIn(ExperimentalJsExport::class)
@JsExport
data class FundingRequest(
    val id: String,
    val userId: String,
    val amount: Double,
    val reason: String,
    val urgency: UrgencyLevel,
    val timestamp: String,
    val status: FundingRequestStatus
)

private data class UserAccount(
    val user: User,
    val password: String,
    val isFirstSignup: Boolean
)

object InMemoryStore {
    val users = mutableListOf<User>()
    val surveyData = mutableMapOf<String, SurveyData>()
    val donations = mutableListOf<Donation>()
    val fundingRequests = mutableListOf<FundingRequest>()

    private val accountsByUserId = mutableMapOf<String, UserAccount>()
    private val accountIdByEmail = mutableMapOf<String, String>()

    init {
        ensureSeedData()
    }

    fun registerUser(email: String, password: String, role: UserRole = UserRole.User): User {
        val key = email.trim().lowercase()
        require(key.isNotEmpty()) { "Email is required." }
        require(!accountIdByEmail.containsKey(key)) { "User already exists." }

        val user = User(id = makeId("user"), email = email.trim(), role = role)
        val account = UserAccount(user = user, password = password, isFirstSignup = true)

        users.add(user)
        accountsByUserId[user.id] = account
        accountIdByEmail[key] = user.id

        return user
    }

    fun findAccountByEmail(email: String): UserAccount? {
        val key = email.trim().lowercase()
        val userId = accountIdByEmail[key] ?: return null
        return accountsByUserId[userId]
    }

    fun isFirstSignup(userId: String): Boolean {
        return accountsByUserId[userId]?.isFirstSignup ?: false
    }

    fun markOnboarded(userId: String) {
        val account = accountsByUserId[userId] ?: return
        accountsByUserId[userId] = account.copy(isFirstSignup = false)
    }

    private fun ensureSeedData() {
        if (accountIdByEmail.containsKey("avon2ramesh@gmail.com")) {
            return
        }

        val admin = User(
            id = "admin-1",
            email = "avon2ramesh@gmail.com",
            role = UserRole.Admin
        )

        users.add(admin)
        accountIdByEmail[admin.email.lowercase()] = admin.id
        accountsByUserId[admin.id] = UserAccount(
            user = admin,
            password = "admin",
            isFirstSignup = false
        )
    }
}

private object SessionStore {
    var currentUserId: String? = null
}

object AuthService {
    fun signUp(email: String, password: String): User {
        val created = InMemoryStore.registerUser(email = email, password = password)
        SessionStore.currentUserId = created.id
        return created
    }

    fun login(email: String, password: String): User {
        val account = InMemoryStore.findAccountByEmail(email)
            ?: throw IllegalStateException("Invalid email or password.")

        if (account.password != password) {
            throw IllegalStateException("Invalid email or password.")
        }

        SessionStore.currentUserId = account.user.id
        return account.user
    }

    fun logout() {
        SessionStore.currentUserId = null
    }

    fun currentUser(): User? {
        val currentId = SessionStore.currentUserId ?: return null
        return InMemoryStore.users.find { it.id == currentId }
    }

    fun isFirstSignupCurrentUser(): Boolean {
        val currentId = SessionStore.currentUserId ?: return false
        return InMemoryStore.isFirstSignup(currentId)
    }
}

object SurveyService {
    fun storeSurveyForCurrentUser(data: SurveyData) {
        val user = AuthService.currentUser() ?: throw IllegalStateException("No active session.")
        InMemoryStore.surveyData[user.id] = data
        InMemoryStore.markOnboarded(user.id)
    }

    fun surveyForCurrentUser(): SurveyData? {
        val user = AuthService.currentUser() ?: return null
        return InMemoryStore.surveyData[user.id]
    }

    fun surveyForUser(userId: String): SurveyData? = InMemoryStore.surveyData[userId]
}

object PaymentHooks {
    fun sendDonation(amount: Double) {
        require(amount > 0.0) { "Amount must be positive." }
        // Existing Open Payments / Interledger hook should be called here.
    }

    fun triggerPayout(paymentPointer: String, amount: Double) {
        require(paymentPointer.isNotBlank()) { "Payment pointer is required." }
        require(amount > 0.0) { "Amount must be positive." }
        // Existing payout hook should be called here.
    }
}

object DonationService {
    fun sendDonation(amount: Double) {
        val user = AuthService.currentUser() ?: throw IllegalStateException("No active session.")
        PaymentHooks.sendDonation(amount)

        InMemoryStore.donations.add(
            0,
            Donation(
                id = makeId("donation"),
                userId = user.id,
                amount = amount,
                timestamp = nowIsoString()
            )
        )
    }
}

object FundingService {
    fun createRequest(amount: Double, reason: String, urgency: UrgencyLevel): FundingRequest {
        val user = AuthService.currentUser() ?: throw IllegalStateException("No active session.")

        val request = FundingRequest(
            id = makeId("funding"),
            userId = user.id,
            amount = amount,
            reason = reason,
            urgency = urgency,
            timestamp = nowIsoString(),
            status = FundingRequestStatus.Open
        )

        InMemoryStore.fundingRequests.add(0, request)
        return request
    }

    fun listRequests(): Array<FundingRequest> = InMemoryStore.fundingRequests.toTypedArray()
}

object AdminService {
    fun listDonations(): Array<Donation> = InMemoryStore.donations.toTypedArray()

    fun listFundingRequests(): Array<FundingRequest> = InMemoryStore.fundingRequests.toTypedArray()

    fun approve(requestId: String): FundingRequest {
        val index = InMemoryStore.fundingRequests.indexOfFirst { it.id == requestId }
        if (index < 0) throw IllegalStateException("Request not found.")

        val existing = InMemoryStore.fundingRequests[index]
        val pointer = SurveyService.surveyForUser(existing.userId)?.paymentPointer
            ?: throw IllegalStateException("User has no survey/payment pointer data.")

        PaymentHooks.triggerPayout(pointer, existing.amount)

        val updated = existing.copy(status = FundingRequestStatus.Approved)
        InMemoryStore.fundingRequests[index] = updated
        return updated
    }

    fun reject(requestId: String): FundingRequest {
        val index = InMemoryStore.fundingRequests.indexOfFirst { it.id == requestId }
        if (index < 0) throw IllegalStateException("Request not found.")

        val updated = InMemoryStore.fundingRequests[index].copy(status = FundingRequestStatus.Rejected)
        InMemoryStore.fundingRequests[index] = updated
        return updated
    }
}

@OptIn(ExperimentalJsExport::class)
@JsExport
object EmergencyFundFacade {
    fun signUp(email: String, password: String): User = AuthService.signUp(email, password)

    fun login(email: String, password: String): User = AuthService.login(email, password)

    fun logout() = AuthService.logout()

    fun currentUser(): User? = AuthService.currentUser()

    fun isFirstSignupCurrentUser(): Boolean = AuthService.isFirstSignupCurrentUser()

    fun submitSurvey(data: SurveyData) = SurveyService.storeSurveyForCurrentUser(data)

    fun currentUserSurvey(): SurveyData? = SurveyService.surveyForCurrentUser()

    fun donate(amount: Double) = DonationService.sendDonation(amount)

    fun createFundingRequest(amount: Double, reason: String, urgency: UrgencyLevel): FundingRequest =
        FundingService.createRequest(amount, reason, urgency)

    fun fundingRequests(): Array<FundingRequest> = AdminService.listFundingRequests()

    fun donationLog(): Array<Donation> = AdminService.listDonations()

    fun approveRequest(requestId: String): FundingRequest = AdminService.approve(requestId)

    fun rejectRequest(requestId: String): FundingRequest = AdminService.reject(requestId)

    fun users(): Array<User> = InMemoryStore.users.toTypedArray()
}

private fun makeId(prefix: String): String = "$prefix-${Clock.System.now().toEpochMilliseconds()}-${(1000..9999).random()}"

private fun nowIsoString(): String = Clock.System.now().toString()
