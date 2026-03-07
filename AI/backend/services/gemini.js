const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Evaluate a financial aid claim using Gemini AI, cross-referencing disaster data.
 *
 * @param {object} claim - User-submitted claim details
 * @param {object} gdacsData - Data from GDACS API
 * @param {object} hdxData - Data from HDX/HAPI API
 * @param {object} gdeltData - Data from GDELT API
 * @returns {object} { decision, confidence, reasoning, risk_flags }
 */
async function evaluateClaim(claim, gdacsData, hdxData, gdeltData) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const today = new Date().toISOString().split("T")[0];
  const prompt = `
You are an AI financial aid claim evaluator for a humanitarian disaster relief fund.
Today's date is ${today}.
Your job is to assess whether a financial aid claim is CREDIBLE and VALID based on:
1. The claimant's description of their situation
2. Real-world disaster data from authoritative sources

## CLAIM SUBMITTED BY USER
- **Name:** ${claim.name}
- **Country:** ${claim.country}
- **Disaster Type:** ${claim.disasterType}
- **Incident Date:** ${claim.incidentDate}
- **Description:** ${claim.description}
- **Amount Requested (USD):** ${claim.amount}

## DISASTER VERIFICATION DATA

### GDACS (Global Disaster Alert and Coordination System)
${JSON.stringify(gdacsData, null, 2)}

### World Bank (Socioeconomic & Vulnerability Indicators)
${JSON.stringify(hdxData, null, 2)}

### GDELT (News Coverage Corroboration)
${JSON.stringify(gdeltData, null, 2)}

## YOUR TASK
Analyze the claim against the disaster data. Consider:
- Does a real disaster matching the claimed type and location exist in GDACS near the claimed date?
- Does humanitarian data (HDX) confirm vulnerability/crisis conditions in this region?
- Does news coverage (GDELT) corroborate the disaster?
- Is the amount requested reasonable relative to the disaster scale?
- Are there any inconsistencies or red flags in the claim?

Be fair but rigorous. If data sources are unavailable or return no results for this region, note that but do NOT automatically reject — weigh available evidence holistically.

## RESPONSE FORMAT
You MUST respond with ONLY valid JSON in this exact schema — no markdown, no extra text:
{
  "decision": "APPROVED" or "REJECTED",
  "confidence": <integer 0-100>,
  "reasoning": "<2-4 sentence explanation of your decision>",
  "risk_flags": ["<flag1>", "<flag2>"] // empty array if none
}
`;

  try {
    let result;
    // Retry up to 3 times on 429 rate-limit errors (free tier: 15 RPM)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break; // success
      } catch (err) {
        const is429 = err.message?.includes("429") || err.message?.includes("Too Many Requests");
        if (is429 && attempt < 3) {
          const waitMs = attempt * 65000; // 65s, then 130s
          console.log(`[Gemini] Rate limited (attempt ${attempt}/3). Retrying in ${waitMs / 1000}s...`);
          await new Promise((res) => setTimeout(res, waitMs));
        } else {
          throw err;
        }
      }
    }
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the JSON
    const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    const parsed = JSON.parse(jsonText);

    // Validate expected fields
    if (!["APPROVED", "REJECTED"].includes(parsed.decision)) {
      throw new Error("Invalid decision value from Gemini");
    }

    return {
      decision: parsed.decision,
      confidence: Number(parsed.confidence) || 0,
      reasoning: parsed.reasoning || "",
      risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : [],
    };
  } catch (err) {
    console.error("Gemini evaluation error:", err.message);
    // Fallback: rule-based scoring when AI is unavailable
    return ruleBased(claim, gdacsData, hdxData);
  }
}

/**
 * Simple rule-based fallback when Gemini is unavailable.
 */
function ruleBased(claim, gdacsData, hdxData) {
  let score = 0;
  const flags = [];

  if (gdacsData?.found && gdacsData.events?.length > 0) {
    score += 40;
    const topAlert = gdacsData.highestAlert;
    if (topAlert === "Red") score += 30;
    else if (topAlert === "Orange") score += 20;
    else score += 10;
  } else {
    flags.push("No matching disaster event found in GDACS for this country/date");
    score -= 20;
  }

  if (hdxData?.found) {
    const poverty = hdxData.indicators?.poverty_pct?.value;
    if (poverty && poverty > 10) score += 15;
    const food = hdxData.indicators?.undernourishment_pct?.value;
    if (food && food > 5) score += 15;
  }

  const amountNum = Number(claim.amount);
  if (amountNum > 5000) flags.push("High payout amount requested — may require additional verification");
  if (amountNum <= 1000) score += 5;

  const descLength = (claim.description || "").trim().length;
  if (descLength < 50) {
    flags.push("Claim description is very brief");
    score -= 10;
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const approved = finalScore >= 50;

  return {
    decision: approved ? "APPROVED" : "REJECTED",
    confidence: finalScore,
    reasoning: approved
      ? `Rule-based assessment (AI unavailable): Disaster data from GDACS corroborates the claim for ${claim.country}. Socioeconomic indicators support vulnerability. Claim appears credible.`
      : `Rule-based assessment (AI unavailable): Insufficient corroborating disaster data found for ${claim.country} around the claimed incident date. Manual review recommended.`,
    risk_flags: flags,
    note: "AI model unavailable — result based on automated rules. A human reviewer should verify this claim.",
  };
}

module.exports = { evaluateClaim };
