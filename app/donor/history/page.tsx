import Link from "next/link";

export default function DonationHistory() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Donations</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Your complete giving history</p>
      </div>

      <div className="glass py-16 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
        >
          📋
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Donation history powered by your wallet</h2>
        <p className="text-sm max-w-md mx-auto mb-2" style={{ color: "#94a3b8" }}>
          Completed donations are recorded in your Open Payments wallet. Each donation redirected you to your wallet provider to authorise the transfer.
        </p>
        <p className="text-xs mb-8" style={{ color: "#64748b" }}>
          Check your wallet provider dashboard to see all past transactions.
        </p>
        <Link
          href="/donor/campaigns"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
          style={{ background: "#8b5cf6", color: "#fff" }}
        >
          Browse Fund Requests →
        </Link>
      </div>
    </div>
  );
}
