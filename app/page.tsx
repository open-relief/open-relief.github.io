"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicMetrics, type PublicMetrics } from "@/lib/api";
import { useApp } from "./AppContext";

const roles = [
  {
    href: "/admin",
    label: "Admin",
    sublabel: "Control Centre",
    icon: "⚡",
    description: "Manage campaigns, approve payouts, oversee the platform in real time.",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.3)",
  },
  {
    href: "/donor",
    label: "Donor",
    sublabel: "Give Relief",
    icon: "💜",
    description: "Browse active disaster campaigns and send money instantly to verified recipients.",
    accent: "#8b5cf6",
    glow: "rgba(139,92,246,0.15)",
    border: "rgba(139,92,246,0.3)",
  },
  {
    href: "/recipient",
    label: "Recipient",
    sublabel: "Receive Aid",
    icon: "🌿",
    description: "Apply for aid and receive direct payouts once your claim is AI-verified.",
    accent: "#10b981",
    glow: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.3)",
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
        { label: "Aid Requests", value: metrics.totalRequests.toString(), icon: "📋" },
        { label: "Total Requested", value: fmt(metrics.totalAmountRequested), icon: "💰" },
        { label: "Total Funded", value: fmt(metrics.totalAmountFunded), icon: "✅" },
      ]
    : null;

  if (isApp) return <MobileHome stats={stats} />;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-20 animate-fade-in"
      style={{ position: "relative", zIndex: 1 }}
    >
      {/* Live badge */}
      <div
        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-8 animate-slide-down"
        style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#fca5a5",
        }}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse inline-block"
          style={{ background: "#ef4444" }}
        />
        Live disaster-relief operations active
      </div>

      {/* Hero */}
      <div className="text-center mb-14 animate-slide-down" style={{ animationDelay: "0.05s" }}>
        <h1
          className="text-6xl md:text-8xl font-black tracking-tight mb-5 leading-none"
          style={{
            background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Open<span style={{ WebkitTextFillColor: "#f59e0b" }}>Relief</span>
        </h1>
        <p className="text-slate-400 text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed">
          AI-powered instant payouts for disaster-stricken citizens —<br className="hidden md:block" />
          connecting compassionate donors with people who need help most.
        </p>
      </div>

      {/* Stats strip */}
      <div
        className="w-full max-w-5xl mb-14 grid grid-cols-3 gap-4 animate-slide-up"
        style={{ animationDelay: "0.1s" }}
      >
        {stats
          ? stats.map(({ label, value, icon }) => (
              <div
                key={label}
                className="glass text-center px-6 py-8"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <p className="text-3xl mb-2">{icon}</p>
                <p className="text-4xl font-bold text-white mb-1">{value}</p>
                <p className="text-slate-400 text-sm">{label}</p>
              </div>
            ))
          : Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass px-6 py-8 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="h-8 rounded-lg bg-white/10 mb-3 mx-auto w-24" />
                <div className="h-4 rounded bg-white/5 mx-auto w-32" />
              </div>
            ))}
      </div>

      {/* Portal cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl animate-slide-up"
        style={{ animationDelay: "0.15s" }}
      >
        {roles.map((role) => (
          <Link
            key={role.href}
            href={role.href}
            className="group relative overflow-hidden rounded-2xl p-7 transition-all duration-300 hover:scale-[1.03]"
            style={{
              background: role.glow,
              border: `1px solid ${role.border}`,
              backdropFilter: "blur(20px)",
            }}
          >
            {/* accent glow blob */}
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl transition-all duration-500 group-hover:opacity-60"
              style={{ background: role.accent }}
            />
            <div className="relative">
              <div className="text-4xl mb-4">{role.icon}</div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: role.accent }}>
                {role.sublabel}
              </p>
              <h2 className="text-2xl font-bold text-white mb-3">{role.label} Portal</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">{role.description}</p>
              <div
                className="inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200 group-hover:gap-3"
                style={{ color: role.accent }}
              >
                Enter portal
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-16 text-slate-600 text-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
        Powered by Gemini AI · GDACS · World Bank · GDELT
      </p>
    </main>
  );
}

function MobileHome({ stats }: { stats: { label: string; value: string }[] | null }) {
  return (
    <main className="min-h-screen flex flex-col items-center p-5 animate-fade-in" style={{ position: "relative", zIndex: 1 }}>
      <div className="text-center py-10">
        <h1 className="text-3xl font-black" style={{ color: "#f59e0b" }}>OpenRelief</h1>
        <p className="text-slate-400 text-sm mt-1">Disaster Relief Platform</p>
      </div>
      {stats && (
        <div className="w-full mb-6 space-y-3">
          {stats.map(({ label, value }) => (
            <div key={label} className="glass px-5 py-4 flex justify-between items-center">
              <span className="text-slate-300 text-sm">{label}</span>
              <span className="font-bold text-white">{value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="w-full space-y-3">
        {roles.map((role) => (
          <Link
            key={role.href}
            href={role.href}
            className="flex items-center gap-3 rounded-xl px-5 py-4 font-semibold transition-all"
            style={{ background: role.glow, border: `1px solid ${role.border}`, color: role.accent }}
          >
            <span className="text-2xl">{role.icon}</span>
            {role.label} Portal
          </Link>
        ))}
      </div>
    </main>  );
}