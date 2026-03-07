"use client";

import Link from "next/link";
import { useState } from "react";
import { createRequest } from "@/lib/api";

const DISASTER_TYPES = [
  { value: "flood", label: "Flood" },
  { value: "earthquake", label: "Earthquake" },
  { value: "cyclone", label: "Cyclone / Hurricane / Typhoon" },
  { value: "wildfire", label: "Wildfire" },
  { value: "volcano", label: "Volcanic Eruption" },
  { value: "drought", label: "Drought" },
  { value: "other", label: "Other" },
];

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
      requesterName,
      amount: String(Math.round(parseFloat(amount) * 100)), // S$ → minor units
      note: description,
      country,
      disasterType,
      incidentDate,
      description,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setSubmitted(true);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setRequesterName("");
    setAmount("");
    setCountry("");
    setDisasterType("flood");
    setIncidentDate("");
    setDescription("");
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-6xl mb-4">📩</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Submitted!</h2>
        <p className="text-slate-500 mb-2">
          Your relief request is being reviewed by our Gemini AI agent, which cross-checks
          disaster databases (GDACS, World Bank, GDELT) to verify your claim.
        </p>
        <p className="text-sm text-slate-400 mb-8">
          Approved applications are funded automatically. You can track the status below.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/recipient/status"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
          >
            Track Application
          </Link>
          <button
            onClick={resetForm}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
          >
            New Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Apply for Aid</h1>
        <p className="text-base text-slate-500 mt-1">
          Submit your claim and our AI agent will verify it against real-time disaster data.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 text-base text-emerald-800">
        <p className="font-medium mb-1">How it works</p>
        <ul className="space-y-1 text-emerald-700">
          <li>1. Fill in your details and describe the disaster that affected you</li>
          <li>2. Our Gemini AI agent verifies your claim against GDACS, World Bank & GDELT data</li>
          <li>3. Approved claims are funded automatically to your registered wallet</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-7 border border-slate-100 space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-2">Full Name *</label>
          <input
            type="text"
            required
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            placeholder="Your full name"
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-2">Country *</label>
          <input
            type="text"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Philippines, Bangladesh, Indonesia"
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Disaster Type + Incident Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Disaster Type *</label>
            <select
              value={disasterType}
              onChange={(e) => setDisasterType(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {DISASTER_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Incident Date *</label>
            <input
              type="date"
              required
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Amount Requested (S$) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">S$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              required
              min={1}
              step="0.01"
              className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Describe Your Situation *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            required
            placeholder="Describe how the disaster affected you, what you lost, and how the funds will help…"
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">{description.length} characters (min. 50 recommended)</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3.5 rounded-lg text-lg font-semibold transition-colors"
        >
          {submitting ? "Submitting & verifying with AI…" : "Submit Application"}
        </button>

        <p className="text-xs text-center text-slate-400">
          Your claim will be cross-referenced against GDACS, World Bank, and GDELT disaster databases by our Gemini AI agent.
        </p>
      </form>
    </div>
  );
}

