"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getRequests, initDonation, type FundRequest } from "@/lib/api";

type Step = "amount" | "wallet" | "confirm";

function DonateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get("requestId") ?? "";

  const [request, setRequest] = useState<FundRequest | null>(null);
  const [step, setStep] = useState<Step>("amount");
  const [inputAmount, setInputAmount] = useState("");
  const [donorWalletAddress, setDonorWalletAddress] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKeyPath, setPrivateKeyPath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);

  useEffect(() => {
    if (!requestId) { setLoadingRequest(false); return; }
    getRequests().then(({ data }) => {
      const r = data?.find(x => x.requestId === requestId);
      if (r) setRequest(r);
      setLoadingRequest(false);
    });
  }, [requestId]);

  const finalAmount = inputAmount ? Math.round(parseFloat(inputAmount) * 100) / 100 : 0;

  async function handleConfirm() {
    if (!request) return;
    setError(null);
    setSubmitting(true);
    const { error: err } = await initDonation({
      requestId: request.requestId,
      amount: Math.round(finalAmount * 100),
      donorWalletAddress,
      keyId,
      privateKeyPath,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    router.push("/donor/history");
  }

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1.25rem",
    padding: "2rem",
  } as React.CSSProperties;

  const inpStyle = { background: "var(--bg2)" };

  if (loadingRequest) {
    return <div className="flex items-center justify-center h-64"><div className="flex gap-2"><div className="checking-dot" /><div className="checking-dot" /><div className="checking-dot" /></div></div>;
  }
  if (!request) {
    return (
      <div className="text-center py-20" style={{ color: "#475569" }}>
        <p className="text-3xl mb-3">—</p>
        <p>No fund request found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-white">Make a Donation</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Direct payout to the recipient's registered wallet.</p>
      </div>

      {/* Request summary */}
      <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#a78bfa" }}>Recipient</p>
        <p className="font-semibold text-white">{request.requesterName}</p>
        <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>{request.note}</p>
        <p className="text-sm font-bold mt-2 text-white">Requested: S${Number(request.amount).toLocaleString()}</p>
      </div>

      <div style={cardStyle}>
        {/* Step indicators */}
        <div className="flex items-center gap-3 mb-6">
          {(["amount", "wallet", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={step === s ? { background: "#8b5cf6", color: "#fff" } :
                  (["amount","wallet","confirm"].indexOf(step) > i) ? { background: "rgba(139,92,246,0.3)", color: "#a78bfa" } :
                  { background: "rgba(255,255,255,0.06)", color: "#475569" }}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="flex-1 h-px" style={{ background: ["amount","wallet","confirm"].indexOf(step) > i ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.07)" }} />}
            </div>
          ))}
        </div>

        {step === "amount" && (
          <>
            <p className="text-sm font-semibold text-white mb-3">Donation Amount</p>
            <div className="relative mb-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "#475569" }}>S$</span>
              <input
                type="number" min={1} step="0.01"
                value={inputAmount} onChange={e => setInputAmount(e.target.value)}
                placeholder="e.g. 100"
                className="inp inp-violet" style={{ paddingLeft: "2.5rem", ...inpStyle }}
              />
            </div>
            <button
              disabled={!finalAmount}
              onClick={() => setStep("wallet")}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: !finalAmount ? "rgba(139,92,246,0.3)" : "#8b5cf6", color: finalAmount ? "#fff" : "#64748b", opacity: !finalAmount ? 0.5 : 1 }}
            >
              Continue — S${finalAmount ? finalAmount.toLocaleString() : "–"}
            </button>
          </>
        )}

        {step === "wallet" && (
          <>
            <p className="text-sm font-semibold text-white mb-4">Your Wallet Credentials</p>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Wallet Address</label>
                <input type="url" required placeholder="https://wallet.example.com/you" value={donorWalletAddress} onChange={e => setDonorWalletAddress(e.target.value)} className="inp inp-violet" style={inpStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Key ID</label>
                <input type="text" required value={keyId} onChange={e => setKeyId(e.target.value)} className="inp inp-violet" style={inpStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Private Key Path (server-side)</label>
                <input type="text" required placeholder="/absolute/path/to/private.key" value={privateKeyPath} onChange={e => setPrivateKeyPath(e.target.value)} className="inp inp-violet font-mono" style={inpStyle} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("amount")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                Back
              </button>
              <button disabled={!donorWalletAddress || !keyId || !privateKeyPath} onClick={() => setStep("confirm")}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "#8b5cf6", color: "#fff", opacity: (!donorWalletAddress || !keyId || !privateKeyPath) ? 0.5 : 1 }}>
                Review
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="rounded-xl p-5 mb-5" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <p className="text-xs" style={{ color: "#94a3b8" }}>You are donating</p>
              <p className="text-4xl font-bold my-1" style={{ color: "#a78bfa" }}>S${finalAmount.toLocaleString()}</p>
              <p className="text-sm" style={{ color: "#94a3b8" }}>to <span className="font-semibold text-white">{request.requesterName}</span></p>
            </div>
            <div className="mb-4 text-xs space-y-1.5" style={{ color: "#64748b" }}>
              <p>🔏 From wallet: <span className="font-mono text-white">{donorWalletAddress}</span></p>
              <p>🔒 100% goes directly to the recipient</p>
              <p>➡️ You will be redirected to authorize the transfer</p>
            </div>
            {error && <div className="text-sm rounded-lg px-4 py-3 mb-4"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => setStep("wallet")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                Back
              </button>
              <button onClick={handleConfirm} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "#8b5cf6", color: "#fff", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Processing…" : `Confirm S$${finalAmount.toLocaleString()}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="flex gap-2"><div className="checking-dot" /><div className="checking-dot" /><div className="checking-dot" /></div></div>}>
      <DonateContent />
    </Suspense>
  );
}
