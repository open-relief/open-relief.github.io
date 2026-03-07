import Link from "next/link";

export default function DonationHistory() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">My Donations</h1>
        <p className="text-slate-500 mt-1">Your complete giving history</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-10 text-center text-slate-400">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-slate-600 font-medium mb-2">Donation history powered by your wallet</p>
        <p className="text-sm mb-6">
          Completed donations are recorded in your Open Payments wallet. Each donation
          redirected you to your wallet provider to authorise the transfer.
        </p>
        <Link
          href="/donor/campaigns"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          Browse Fund Requests
        </Link>
      </div>
    </div>
  );
}
