"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { recipientMe, recipientLogout, type RecipientUser } from "@/lib/api";
import { useApp } from "../AppContext";

const navItems = [
  { href: "/recipient",         label: "Dashboard",       icon: "▦" },
  { href: "/recipient/apply",   label: "Apply for Aid",   icon: "✦" },
  { href: "/recipient/status",  label: "My Applications", icon: "◈" },
  { href: "/recipient/profile", label: "Profile",         icon: "◉" },
];

export default function RecipientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RecipientUser | null>(null);
  const [checking, setChecking] = useState(true);
  const { isApp } = useApp();

  const isLoginPage = pathname === "/recipient/login" || pathname === "/recipient/login/";

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    setChecking(true);
    recipientMe().then(({ data }) => {
      if (!data?.authenticated) {
        router.replace("/recipient/login");
      } else {
        setUser(data.user);
        setChecking(false);
      }
    });
  }, [isLoginPage]);

  if (isLoginPage) return <>{children}</>;
  if (checking) {
    return (
      <div className="checking-screen">
        <div className="checking-dot" />
        <div className="checking-dot" />
        <div className="checking-dot" />
      </div>
    );
  }

  async function handleLogout() {
    await recipientLogout();
    router.push("/recipient/login");
  }

  if (isApp) {
    return (
      <div className="min-h-screen flex flex-col pt-14 animate-fade-in" style={{ background: "var(--bg)" }}>
        <header style={{ background: "rgba(7,11,20,0.9)", borderBottom: "1px solid rgba(255,255,255,0.08)" }} className="fixed top-0 left-0 right-0 p-4 z-20">
          <Link href="/" className="text-lg font-bold" style={{ color: "#10b981" }}>OpenRelief</Link>
        </header>
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex animate-fade-in" style={{ background: "var(--bg)" }}>
      <aside className="sidebar">
        <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "#10b981", color: "#fff" }}
            >
              OR
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">OpenRelief</p>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Recipient Portal</p>
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
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.25)",
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
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              {user?.email?.[0]?.toUpperCase() ?? "R"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.email ?? "Recipient"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#10b981" }} />
                <span className="text-xs" style={{ color: "#64748b" }}>Signed in</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleLogout} className="text-xs transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
            >
              Sign out
            </button>
            <Link href="/" className="text-xs transition-colors" style={{ color: "#64748b" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
            >
              ← Portal select
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-h-screen p-8" style={{ marginLeft: 260 }}>
        {children}
      </main>
    </div>
  );
}
