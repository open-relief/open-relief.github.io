"use client";

import { useEffect, useState } from "react";
import { recipientMe, type RecipientUser } from "@/lib/api";

export default function RecipientProfile() {
  const [user, setUser] = useState<RecipientUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recipientMe().then(({ data }) => {
      if (data?.user) setUser(data.user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-2"><div className="checking-dot" /><div className="checking-dot" /><div className="checking-dot" /></div>
      </div>
    );
  }
  if (!user) {
    return <div className="flex items-center justify-center h-64"><p style={{ color: "#475569" }}>Could not load profile.</p></div>;
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Your account and wallet details</p>
      </div>

      {/* Avatar + info */}
      <div className="glass p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}
          >
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#10b981" }} />
              <span className="text-xs" style={{ color: "#64748b" }}>Active recipient account</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {[
            { label: "Email", value: user.email },
            { label: "Household Size", value: `${user.householdSize} member${user.householdSize !== 1 ? "s" : ""}` },
            { label: "Per-Capita Income", value: `S$${user.perCapitaIncomeSgd.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#475569" }}>{label}</p>
              <p className="text-sm text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div className="glass p-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#475569" }}>Open Payments Wallet</p>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#334155" }}>Wallet Address</p>
          <p
            className="text-sm font-mono break-all p-3 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
          >
            {user.pointer || <span style={{ color: "#334155", fontFamily: "inherit" }}>— not set —</span>}
          </p>
          <p className="text-xs mt-2" style={{ color: "#334155" }}>Approved payouts are sent directly to this wallet address.</p>
        </div>
      </div>
    </div>
  );
}
