"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recipientLogin, recipientSignup } from "@/lib/api";

export default function RecipientLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup extra fields
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
        email,
        password,
        pointer,
        keyId,
        privateKey,
        householdSize: parseInt(householdSize),
        perCapitaIncomeSgd: parseFloat(perCapita),
      });
      setLoading(false);
      if (err) { setError(err); return; }

      // backend now creates a session cookie on signup, but it doesn't
      // hurt to re‑authenticate in case the new cookie hasn't propagated yet
      // or the server doesn't.  we ignore any error because the user will be
      // sent to the dashboard anyway and the layout check will redirect them
      // back to login if necessary.
      recipientLogin(email, password).catch(() => {});
    }

    // trailingSlash config will append a `/` automatically, but
    // push it explicitly to avoid an extra redirect.
    router.push("/recipient/");
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-700 rounded-xl mb-5">
            <span className="text-3xl">🤝</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Recipient Portal</h1>
          <p className="text-slate-500 text-lg mt-1">Open Relief — Aid Applications</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2.5 text-base font-medium rounded-md transition ${
                mode === m ? "bg-white shadow text-slate-900" : "text-slate-500"
              }`}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Wallet Address (pointer URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://wallet.example.com/alice"
                  value={pointer}
                  onChange={(e) => setPointer(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Key ID</label>
                <input
                  type="text"
                  required
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Private Key (PEM contents)
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Household Size</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Per-Capita Income (S$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={perCapita}
                    onChange={(e) => setPerCapita(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 text-white py-3.5 rounded-lg text-lg font-medium hover:bg-emerald-800 disabled:opacity-50 transition"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
