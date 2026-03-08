"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { recipientMe, recipientLogout, type RecipientUser } from "@/lib/api";

const navItems = [
  { href: "/recipient", label: "Dashboard", icon: "🏠" },
  { href: "/recipient/apply", label: "Apply for Aid", icon: "📝" },
  { href: "/recipient/status", label: "My Applications", icon: "📋" },
  { href: "/recipient/profile", label: "Profile", icon: "👤" },
];

export default function RecipientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RecipientUser | null>(null);
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === "/recipient/login";

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    recipientMe()
      .then(({ data }) => {
        if (!data?.authenticated) {
          router.replace("/recipient/login");
        } else {
          setUser(data.user);
          setChecking(false);
        }
      })
      .catch(() => {
        router.replace("/recipient/login");
      })
      .finally(() => {
        setChecking(false);
      });
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <p className="text-slate-500 text-sm">Checking session…</p>
      </div>
    );
  }

  async function handleLogout() {
    await recipientLogout();
    router.push("/recipient/login");
  }

  return (
    <div className="min-h-screen flex bg-emerald-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-emerald-100 flex flex-col fixed h-full z-10">
        <div className="px-7 py-6 border-b border-emerald-100">
          <Link href="/" className="text-2xl font-bold text-emerald-600 hover:text-emerald-500">
            Open Relief
          </Link>
          <p className="text-sm text-slate-400 mt-0.5">Recipient Portal</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  active
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-7 py-5 border-t border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-base font-bold text-white">
              {user?.email?.[0]?.toUpperCase() ?? "R"}
            </div>
            <div>
              <p className="text-base font-medium text-slate-800 truncate max-w-[140px]">
                {user?.email ?? "Recipient"}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            <span className="text-sm text-slate-500">Signed in</span>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 block text-sm text-slate-400 hover:text-red-500 transition"
          >
            Sign out
          </button>
          <Link href="/" className="mt-1 block text-sm text-slate-400 hover:text-slate-600">
            ← Portal select
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-72 p-10">{children}</main>
    </div>
  );
}
