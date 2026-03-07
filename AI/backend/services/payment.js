const Stripe = require("stripe");

/**
 * Create a Stripe PaymentIntent in test mode to simulate a payout.
 * @param {number} amountUSD - Amount in USD (will be converted to cents)
 * @param {string} claimantName - Name of the claimant for metadata
 * @param {string} country - Country of the claimant
 * @returns {object} { clientSecret, paymentIntentId, amount, currency }
 */
async function createPayout(amountUSD, claimantName, country) {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  // Cap payout at $10,000 per claim for safety in hackathon demo
  const cappedAmount = Math.min(Number(amountUSD) || 100, 10000);
  const amountCents = Math.round(cappedAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    payment_method_types: ["card"],
    description: `Disaster financial aid payout for ${claimantName} in ${country}`,
    metadata: {
      claimant: claimantName,
      country: country,
      source: "disaster-aid-verifier",
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: cappedAmount,
    currency: "USD",
    status: paymentIntent.status,
  };
}

module.exports = { createPayout };
