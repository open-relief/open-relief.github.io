
import * as shared from 'shared'

const ilp = new shared.org_maker_minds_hacko26.InterledgerClient()

ilp.setSelfAccount("$alice.example.com")
ilp.setTargetAccount("$bob.example.com")

async function pay() {
    try {
        const result = await ilp.sendPayment(100)
        console.log("Payment result:", result)
    } catch (err) {
        console.error("Payment failed", err)
    }
}