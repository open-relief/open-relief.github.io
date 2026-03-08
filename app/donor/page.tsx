"use client";

import { useState } from "react";
import { initDonation } from "@/lib/api";

const PLATFORM_WALLET = "https://ilp.interledger-test.dev/shawn";

export default function DonorDashboard() {
  const [amount, setAmount]         = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [keyId, setKeyId]           = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [done, setDone]             = useState(false);

  const amountSgd = parseFloat(amount) || 0;
  const valid = amountSgd > 0 && walletAddr.trim() && keyId.trim() && privateKey.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    setSubmitting(true);
    const { data, error: err } = await initDonation({
      donorWalletAddress: walletAddr.trim(),
      amount: Math.round(amountSgd * 100),
      keyId: keyId.trim(),
      privateKey: privateKey.trim(),
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    if (data?.redirectUrl) {
      setConsentUrl(data.redirectUrl);
    } else {
      setDone(true);
    }
  }

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1.25rem",
    padding: "2rem",
  };
  const inp: React.CSSProperties = { background: "var(--bg2)" };
  const labelCls = "block text-xs font-semibold uppercase tracking-widest mb-1.5";
  const labelStyle = { color: "#64748b" };

  if (consentUrl) {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div style={card} className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-white mb-2">Authorize Payment</h2>
          <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
            Your Interledger wallet requires authorization before the transfer can proceed.
            Click below to open the consent page, then return here.
          </p>
          <a
            href={consentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-sm font-bold text-center mb-3 transition-all"
            style={{ background: "#8b5cf6", color: "#fff" }}
          >
            Open Authorization Page ↗
          </a>
          <button
            onClick={() => setDone(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
          >
            I&apos;ve Authorized — Mark as Donated
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto animate-fade-in text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Your donation of <span className="font-semibold text-white">S${amountSgd.toFixed(2)}</span> has been sent to the relief fund.
        </p>
        <button
          onClick={() => { setDone(false); setAmount(""); setWalletAddr(""); setKeyId(""); setPrivateKey(""); }}
          className="mt-8 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "#8b5cf6", color: "#fff" }}
        >
          Donate Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-white">Donate to the Fund</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Funds are received into the OpenRelief platform wallet and distributed to approved recipients.
        </p>
      </div>

      <div className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
        style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
        <span className="text-lg">🏦</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#a78bfa" }}>Destination Wallet</p>
          <p className="text-sm font-mono mt-0.5" style={{ color: "#e2e8f0" }}>{PLATFORM_WALLET}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={card} className="space-y-5">
        <div>
          <label className={labelCls} style={labelStyle}>Donation Amount (SGD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "#475569" }}>S$</span>
            <input
              type="number" min={1} step="0.01" required
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 50"
              className="inp inp-violet" style={{ paddingLeft: "2.5rem", ...inp }}
            />
          </div>
        </div>

        <div className="pt-1 pb-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Your Wallet Credentials</p>
          <div className="mt-2 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div>
          <label className={labelCls} style={labelStyle}>Wallet Address</label>
          <input
            type="url" required
            placeholder="https://ilp.interledger-test.dev/your-wallet"
            value={walletAddr} onChange={e => setWalletAddr(e.target.value)}
            className="inp inp-violet" style={inp}
          />
        </div>

        <div>
          <label className={labelCls} style={labelStyle}>Key ID</label>
          <input
            type="text" required
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={keyId} onChange={e => setKeyId(e.target.value)}
            className="inp inp-violet font-mono" style={inp}
          />
        </div>

        <div>
          <label className={labelCls} style={labelStyle}>Private Key</label>
          <textarea
            required rows={5}
            placeholder={"-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n\n(or paste raw base64 PKCS#8 value)"}
            value={privateKey} onChange={e => setPrivateKey(e.target.value)}
            className="inp inp-violet font-mono resize-none"
            style={{ ...inp, lineHeight: "1.5", fontSize: "0.75rem" }}
          />
          <p className="text-xs mt-1" style={{ color: "#475569" }}>Paste PEM or raw base64 PKCS#8 — processed server-side and discarded immediately.</p>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-3"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
          style={{ background: valid && !submitting ? "#8b5cf6" : "rgba(139,92,246,0.3)", color: valid && !submitting ? "#fff" : "#64748b", opacity: (!valid || submitting) ? 0.6 : 1 }}
        >
          {submitting ? "Initiating transfer…" : `Donate S${amountSgd > 0 ? `$${amountSgd.toFixed(2)}` : "$–"} →`}
        </button>
      </form>
    </div>
  );
}
