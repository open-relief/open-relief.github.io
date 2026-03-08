"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recipientLogin, recipientSignup } from "@/lib/api";
import Link from "next/link";

export default function RecipientLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pointer, setPointer] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [householdSize, setHouseholdSize] = useState("1");
  const [perCapita, setPerCapita] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === "login") {
      const { error: err } = await recipientLogin(email, password);
      setLoading(false);
      if (err) { setError(err); return; }
    } else {
      const { error: err } = await recipientSignup({
        email, password, pointer, keyId, privateKey,
        householdSize: parseInt(householdSize),
        perCapitaIncomeSgd: parseFloat(perCapita),
      });
      setLoading(false);
      if (err) { setError(err); return; }
      recipientLogin(email, password).catch(() => {});
    }
    router.push("/recipient/");
  }

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1.25rem",
    padding: "2.5rem",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)", position: "relative", zIndex: 1 }}>
      <div className="w-full max-w-lg animate-scale-in" style={cardStyle}>
        {/* Header */}
        <div className="text-center mb-7">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black mx-auto mb-4"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}
          >
            🌿
          </div>
          <h1 className="text-2xl font-bold text-white">Recipient Portal</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>OpenRelief — Aid Applications</p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex rounded-xl p-1 mb-6 gap-1"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {(["login", "signup"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={mode === m ? {
                background: "rgba(16,185,129,0.2)",
                color: "#34d399",
                border: "1px solid rgba(16,185,129,0.3)",
              } : {
                color: "#64748b",
              }}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="inp inp-emerald" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="inp inp-emerald" placeholder="••••••••" />
          </div>

          {mode === "signup" && (
            <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Wallet Details</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Wallet Address</label>
                    <input type="url" required placeholder="https://wallet.example.com/you" value={pointer} onChange={e => setPointer(e.target.value)} className="inp inp-emerald" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Key ID</label>
                    <input type="text" required value={keyId} onChange={e => setKeyId(e.target.value)} className="inp inp-emerald" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Private Key (PEM)</label>
                    <textarea
                      required rows={3}
                      placeholder={"-----BEGIN PRIVATE KEY-----\n..."}
                      value={privateKey} onChange={e => setPrivateKey(e.target.value)}
                      className="inp inp-emerald font-mono resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Household Size</label>
                      <input type="number" min={1} required value={householdSize} onChange={e => setHouseholdSize(e.target.value)} className="inp inp-emerald" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Per-Capita Income (S$)</label>
                      <input type="number" min={0} required value={perCapita} onChange={e => setPerCapita(e.target.value)} className="inp inp-emerald" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm rounded-lg px-4 py-3"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: loading ? "rgba(16,185,129,0.4)" : "#10b981", color: "#000", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 pt-5 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" className="text-xs" style={{ color: "#64748b" }}>← Back to portal select</Link>
        </div>
      </div>
    </div>
  );
}
