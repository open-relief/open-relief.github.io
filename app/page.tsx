"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicMetrics, type PublicMetrics } from "@/lib/api";
import { useApp } from "./AppContext";

const roles = [
  {
    href: "/admin",
    label: "Admin",
    icon: "🛡️",
    description: "Manage campaigns, approve payouts, and monitor the platform.",
    color: "from-slate-700 to-slate-900",
    border: "border-slate-700",
    badge: "bg-slate-800 text-white",
  },
  {
    href: "/donor",
    label: "Donor",
    icon: "💛",
    description: "Browse active disaster campaigns and send money instantly.",
    color: "from-amber-500 to-orange-600",
    border: "border-amber-500",
    badge: "bg-amber-500 text-white",
  },
  {
    href: "/recipient",
    label: "Recipient",
    icon: "🤝",
    description: "Apply for aid and receive direct payouts to your account.",
    color: "from-emerald-500 to-teal-600",
    border: "border-emerald-500",
    badge: "bg-emerald-500 text-white",
  },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `S$${(n / 1_000).toFixed(0)}K`;
  return `S$${n.toLocaleString()}`;
}

export default function Home() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const { isApp } = useApp();

  useEffect(() => {
    getPublicMetrics().then(({ data }) => { if (data) setMetrics(data); });
  }, []);

  const stats = metrics
    ? [
        { label: "Aid Requests", value: metrics.totalRequests.toString() },
        { label: "Total Requested", value: fmt(metrics.totalAmountRequested) },
        { label: "Total Funded", value: fmt(metrics.totalAmountFunded) },
      ]
    : null;

  // when the custom user-agent is detected render a simplified mobile-oriented home screen
  if (isApp) {
    return <MobileHome stats={stats} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full px-5 py-2 text-base font-medium mb-6">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block" />
          Live disaster relief operations active
        </div>
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-5 leading-tight">
          Open<span className="text-amber-400">Relief</span>
        </h1>
        <p className="text-slate-300 text-2xl max-w-2xl mx-auto leading-relaxed">
          Instant money payouts for disaster-stricken citizens — connecting
          compassionate donors with those who need help most.
        </p>
      </div>

      {/* Live metrics strip */}
      {stats && (
        <div className="w-full max-w-6xl mb-10 grid grid-cols-3 gap-6">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-2xl px-10 py-12 text-center"
            >
              <p className="text-6xl font-bold text-white mb-4">{value}</p>
              <p className="text-lg text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      )}
      {!stats && (
        <div className="w-full max-w-6xl mb-10 grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl px-10 py-12 text-center animate-pulse"
            >
              <div className="h-12 bg-white/10 rounded mb-4 mx-auto w-28" />
              <div className="h-5 bg-white/5 rounded mx-auto w-36" />
            </div>
          ))}
        </div>
      )}

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {roles.map((role) => (
          <Link
            key={role.href}
            href={role.href}
            className={`group relative overflow-hidden bg-white/5 hover:bg-white/10 border ${role.border}/40 hover:${role.border} rounded-2xl p-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
          >
            <div className="text-6xl mb-5">{role.icon}</div>
            <span className={`inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4 ${role.badge}`}>
              {role.label} Portal
            </span>
            <p className="text-slate-300 text-base leading-relaxed">
              {role.description}
            </p>
            <div className="mt-7 text-white text-lg font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
              Enter portal <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

// mobile-specific home screen rendered when `app1212` agent is detected
function MobileHome({ stats }: { stats: { label: string; value: string }[] | null }) {
  return (
    <main className="min-h-screen bg-emerald-50 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold text-emerald-600 mb-4">Open Relief</h1>
      <p className="text-slate-700 text-center mb-6">
        You're viewing the mobile-friendly interface (user agent &quot;app1212&quot;).
      </p>
      {stats && (
        <div className="w-full mb-6 space-y-4">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="bg-white rounded-xl p-4 shadow-sm flex justify-between"
            >
              <span className="font-medium text-slate-800">{label}</span>
              <span className="font-bold text-emerald-600">{value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="w-full space-y-3">
        {roles.map((role) => (
          <Link
            key={role.href}
            href={role.href}
            className="block bg-white rounded-lg p-4 text-center font-semibold text-emerald-600 shadow hover:bg-emerald-50"
          >
            {role.icon} {role.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
