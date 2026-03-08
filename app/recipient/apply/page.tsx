"use client";

import Link from "next/link";
import { useState } from "react";
import { createRequest } from "@/lib/api";

const DISASTER_TYPES = [
  { value: "flood",       label: "Flood" },
  { value: "earthquake",  label: "Earthquake" },
  { value: "cyclone",     label: "Cyclone / Hurricane / Typhoon" },
  { value: "wildfire",    label: "Wildfire" },
  { value: "volcano",     label: "Volcanic Eruption" },
  { value: "drought",     label: "Drought" },
  { value: "other",       label: "Other" },
];

const inputStyle = { background: "var(--bg2)" } as React.CSSProperties;

export default function ApplyForAid() {
  const [requesterName, setRequesterName] = useState("");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("");
  const [disasterType, setDisasterType] = useState("flood");
  const [incidentDate, setIncidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await createRequest({
      requesterName, amount: String(Math.round(parseFloat(amount) * 100)),
      note: description, country, disasterType, incidentDate, description,
    });
    setSubmitting(false);
    if (err) { setError(err); } else { setSubmitted(true); }
  }

  function resetForm() {
    setSubmitted(false);
    setRequesterName(""); setAmount(""); setCountry("");
    setDisasterType("flood"); setIncidentDate(""); setDescription("");
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-scale-in">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          ✓
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Application Submitted!</h2>
        <p className="text-sm mb-2" style={{ color: "#94a3b8" }}>
          Your relief request is being reviewed by our Gemini AI agent, which cross-checks GDACS, World Bank, and GDELT disaster databases.
        </p>
        <p className="text-xs mb-8" style={{ color: "#64748b" }}>
          Approved applications are funded automatically to your registered wallet.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/recipient/status"
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: "#10b981", color: "#000" }}>
            Track Application
          </Link>
          <button onClick={resetForm}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
            New Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-white">Apply for Aid</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Submit your claim — our AI agent verifies it against real-time disaster data in minutes.
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#34d399" }}>How it works</p>
        <div className="space-y-2">
          {[
            "Fill in your details and describe the disaster that affected you",
            "Gemini AI verifies your claim against GDACS, World Bank & GDELT data",
            "Approved claims are funded automatically to your registered wallet",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                {i + 1}
              </span>
              <p className="text-sm" style={{ color: "#94a3b8" }}>{step}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass p-7 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Full Name *</label>
          <input type="text" required value={requesterName} onChange={e => setRequesterName(e.target.value)} placeholder="Your full name" className="inp inp-emerald" style={inputStyle} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Country *</label>
          <input type="text" required value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Philippines, Bangladesh, Indonesia" className="inp inp-emerald" style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Disaster Type *</label>
            <select value={disasterType} onChange={e => setDisasterType(e.target.value)} required className="inp inp-emerald" style={inputStyle}>
              {DISASTER_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Incident Date *</label>
            <input type="date" required value={incidentDate} onChange={e => setIncidentDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="inp inp-emerald" style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Amount Requested (S$) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "#475569" }}>S$</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" required min={1} step="0.01"
              className="inp inp-emerald" style={{ paddingLeft: "2.5rem", ...inputStyle }} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Describe Your Situation *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} required
            placeholder="Describe how the disaster affected you, what you lost, and how the funds will help…"
            className="inp inp-emerald resize-none" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "#334155" }}>{description.length} characters (min. 50 recommended)</p>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-3"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: submitting ? "rgba(16,185,129,0.4)" : "#10b981", color: "#000", opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Submitting & verifying with AI…" : "Submit Application"}
        </button>

        <p className="text-xs text-center" style={{ color: "#334155" }}>
          Cross-referenced against GDACS, World Bank, and GDELT by our Gemini AI agent.
        </p>
      </form>
    </div>
  );
}
