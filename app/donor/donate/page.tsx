"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getRequests, initDonation, type FundRequest } from "@/lib/api";

const presets = [500, 1000, 2500, 5000, 10000];

function DonateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get("id") ?? "";

  const [request, setRequest] = useState<FundRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Step state
  const [step, setStep] = useState<"amount" | "wallet" | "confirm">("amount");
  const [amount, setAmount] = useState<number | "">("");
  const [custom, setCustom] = useState("");

  // Wallet credentials
  const [donorWalletAddress, setDonorWalletAddress] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKeyPath, setPrivateKeyPath] = useState("");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRequests().then(({ data }) => {
      const found = data?.find((r) => r.requestId === requestId);
      setRequest(found ?? null);
      setLoading(false);
    });
  }, [requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">😕</p>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Request not found</h2>
        <Link href="/donor/campaigns" className="text-amber-600 hover:underline text-sm">
          ← Back to fund requests
        </Link>
      </div>
    );
  }

  const finalAmount = amount || Number(custom) || 0;

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    const { data, error: err } = await initDonation({
      donorWalletAddress,
      amount: finalAmount,
      keyId,
      privateKeyPath,
      requestId,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
    } else if (data?.redirectUrl) {
      window.location.href = data.redirectUrl;
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/donor/campaigns" className="text-sm text-amber-600 hover:underline">
          ← Back to fund requests
        </Link>
      </div>

      {/* Request summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-slate-100">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-bold text-slate-800">{request.requesterName}</h2>
          <span className="text-lg font-bold text-amber-600">
            S${Number(request.amount).toLocaleString()} requested
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-3">{request.note}</p>
        <p className="text-xs text-slate-400">
          Submitted {new Date(request.createdAt).toLocaleDateString()} · Status:{" "}
          <span className="capitalize font-medium">{request.status}</span>
        </p>
      </div>

      {/* Donation form */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        {step === "amount" && (
          <>
            <h3 className="font-semibold text-slate-800 mb-5">Choose Donation Amount</h3>
            <div className="grid grid-cols-5 gap-3 mb-4">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => { setAmount(p); setCustom(""); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                    amount === p
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-600 hover:border-amber-300"
                  }`}
                >
                  S${p >= 1000 ? `${p / 1000}K` : p}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Or enter custom amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">S$</span>
                <input
                  type="number"
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setAmount(""); }}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              </div>
            </div>

            <button
              disabled={!finalAmount || finalAmount < 1}
              onClick={() => setStep("wallet")}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Continue — S${finalAmount ? finalAmount.toLocaleString() : "–"}
            </button>
          </>
        )}

        {step === "wallet" && (
          <>
            <h3 className="font-semibold text-slate-800 mb-5">Your Wallet Credentials</h3>
            <p className="text-sm text-slate-500 mb-4">
              Provide your Open Payments wallet details to complete the donation.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Wallet Address (pointer URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://wallet.example.com/you"
                  value={donorWalletAddress}
                  onChange={(e) => setDonorWalletAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Key ID</label>
                <input
                  type="text"
                  required
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Private Key File Path (server-side)
                </label>
                <input
                  type="text"
                  required
                  placeholder="/absolute/path/to/private.key"
                  value={privateKeyPath}
                  onChange={(e) => setPrivateKeyPath(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Path accessible on the Open Relief server.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep("amount")}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-lg font-semibold transition-colors text-sm"
              >
                Back
              </button>
              <button
                disabled={!donorWalletAddress || !keyId || !privateKeyPath}
                onClick={() => setStep("confirm")}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-lg font-semibold transition-colors text-sm"
              >
                Review Donation
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
              <p className="text-sm text-slate-600">You are donating</p>
              <p className="text-4xl font-bold text-amber-600 my-1">S${finalAmount.toLocaleString()}</p>
              <p className="text-sm text-slate-600">
                to <span className="font-medium">{request.requesterName}</span>
              </p>
            </div>

            <div className="mb-4 text-sm text-slate-500 space-y-1">
              <p>🔏 From wallet: <span className="font-mono text-xs">{donorWalletAddress}</span></p>
              <p>🔒 100% of your donation goes directly to the recipient</p>
              <p>➡️ You will be redirected to your wallet to authorize the transfer</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("wallet")}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-lg font-semibold transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-lg font-semibold transition-colors text-sm"
              >
                {submitting ? "Processing…" : `Confirm Donation – S$${finalAmount.toLocaleString()}`}
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
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-slate-400">Loading…</p></div>}>
      <DonateContent />
    </Suspense>
  );
}
