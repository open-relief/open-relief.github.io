"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../AppContext";

const navItems = [
  { href: "/donor",           label: "Dashboard",    icon: "▦" },
  { href: "/donor/campaigns", label: "Campaigns",    icon: "◎" },
  { href: "/donor/history",   label: "My Donations", icon: "↺" },
];

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isApp } = useApp();

  if (isApp) {
    return (
      <div className="min-h-screen flex flex-col pt-14 animate-fade-in" style={{ background: "var(--bg)" }}>
        <header style={{ background: "rgba(7,11,20,0.9)", borderBottom: "1px solid rgba(255,255,255,0.08)" }} className="fixed top-0 left-0 right-0 p-4 z-20">
          <Link href="/" className="text-lg font-bold" style={{ color: "#8b5cf6" }}>OpenRelief Donor</Link>
        </header>
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex animate-fade-in" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "#8b5cf6", color: "#fff" }}
            >
              OR
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">OpenRelief</p>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Donor Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname === item.href + "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={active ? {
                  background: "rgba(139,92,246,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(139,92,246,0.25)",
                } : {
                  color: "#64748b",
                  border: "1px solid transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs mb-2" style={{ color: "#64748b" }}>No login required to donate</p>
          <Link href="/" className="text-xs transition-colors" style={{ color: "#64748b" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          >
            ← Portal select
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-h-screen p-8" style={{ marginLeft: 260 }}>
        {children}
      </main>
    </div>
  );
}
