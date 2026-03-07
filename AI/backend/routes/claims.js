const express = require("express");
const router = express.Router();

const { fetchGDACS } = require("../services/gdacs");
const { fetchHDX } = require("../services/hdx");
const { fetchGDELT } = require("../services/gdelt");
const { evaluateClaim } = require("../services/gemini");
const { createPayout } = require("../services/payment");

// Map user-friendly disaster types to GDACS event type codes
const DISASTER_TYPE_MAP = {
  earthquake: "EQ",
  cyclone: "TC",
  hurricane: "TC",
  typhoon: "TC",
  flood: "FL",
  volcano: "VO",
  drought: "DR",
  wildfire: "WF",
  other: null,
};

/**
 * POST /api/claims
 * Body: { name, country, disasterType, incidentDate, description, amount }
 */
router.post("/", async (req, res) => {
  const { name, country, disasterType, incidentDate, description, amount } = req.body;

  // --- Input validation ---
  if (!name || !country || !disasterType || !incidentDate || !description || !amount) {
    return res.status(400).json({
      error: "All fields are required: name, country, disasterType, incidentDate, description, amount",
    });
  }

  if (isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number." });
  }

  const dateObj = new Date(incidentDate);
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({ error: "Invalid incidentDate format." });
  }

  // Prevent future dates
  if (dateObj > new Date()) {
    return res.status(400).json({ error: "Incident date cannot be in the future." });
  }

  const gdacsEventType = DISASTER_TYPE_MAP[disasterType.toLowerCase()] || null;
  const claimData = { name, country, disasterType, incidentDate, description, amount };

  console.log(`\n[CLAIM] Processing claim from ${name} (${country}, ${disasterType})`);

  // --- Step 1: Fetch all disaster data in parallel ---
  let gdacsData, hdxData, gdeltData;
  try {
    [gdacsData, hdxData, gdeltData] = await Promise.all([
      fetchGDACS(country, gdacsEventType, incidentDate),
      fetchHDX(country),
      fetchGDELT(country, disasterType),
    ]);
    console.log("[GDACS]", gdacsData.summary);
    console.log("[HDX]  ", hdxData.summary);
    console.log("[GDELT]", gdeltData.summary);
  } catch (err) {
    console.error("Data fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch disaster data." });
  }

  // --- Step 2: Evaluate with Gemini ---
  let evaluation;
  try {
    evaluation = await evaluateClaim(claimData, gdacsData, hdxData, gdeltData);
    console.log(`[GEMINI] Decision: ${evaluation.decision} (${evaluation.confidence}%)`);
  } catch (err) {
    console.error("Gemini evaluation error:", err.message);
    return res.status(500).json({ error: "AI evaluation failed." });
  }

  // --- Step 3: Process payment if approved ---
  let paymentInfo = null;
  if (evaluation.decision === "APPROVED" && process.env.STRIPE_SECRET_KEY) {
    try {
      paymentInfo = await createPayout(amount, name, country);
      console.log(`[STRIPE] PaymentIntent created: ${paymentInfo.paymentIntentId}`);
    } catch (err) {
      console.error("Stripe error:", err.message);
      // Non-fatal: payment failure doesn't void the approval
      paymentInfo = { error: "Payment processing failed. Manual payout required." };
    }
  }

  // --- Step 4: Return full result ---
  return res.json({
    claim: claimData,
    verdict: evaluation,
    payment: paymentInfo,
    dataSources: {
      gdacs: gdacsData,
      hdx: hdxData,
      gdelt: gdeltData,
    },
  });
});

module.exports = router;
