"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/donor", label: "Dashboard", icon: "🏠" },
  { href: "/donor/campaigns", label: "Campaigns", icon: "🌍" },
  { href: "/donor/history", label: "My Donations", icon: "📜" },
];

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-amber-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-amber-100 flex flex-col fixed h-full z-10">
        <div className="px-7 py-6 border-b border-amber-100">
          <Link href="/" className="text-2xl font-bold text-amber-600 hover:text-amber-500">
            Open Relief
          </Link>
          <p className="text-sm text-slate-400 mt-0.5">Donor Portal</p>
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
                    ? "bg-amber-500 text-white"
                    : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-7 py-5 border-t border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-base font-bold text-white">
              R
            </div>
            <div>
              <p className="text-base font-medium text-slate-800">Rajan Pillai</p>
              <p className="text-sm text-slate-400">rajan@example.com</p>
            </div>
          </div>
          <Link href="/" className="mt-3 block text-sm text-slate-400 hover:text-slate-600">
            ← Portal select
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-72 p-10">{children}</main>
    </div>
  );
}
