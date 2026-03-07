require("dotenv").config();
const express = require("express");
const cors = require("cors");

const claimsRouter = require("./routes/claims");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/api/claims", claimsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Disaster Aid Verifier backend running on http://localhost:${PORT}`);
  console.log(`   GEMINI key: ${process.env.GEMINI_API_KEY ? "✓ set" : "✗ MISSING"}`);
  console.log(`   STRIPE key: ${process.env.STRIPE_SECRET_KEY ? "✓ set" : "✗ not set (payments disabled)"}`);
});
