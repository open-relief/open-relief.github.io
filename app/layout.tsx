import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./AppContext";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Open Relief – Instant Relief for Those Who Need It Most",
  description:
    "A platform connecting donors and disaster-stricken citizens for instant money payouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // force dark mode by default
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100 overflow-hidden`}>
        <AppProvider>
          <Header />
          {/* content area fills the remaining viewport height; only it scrolls */}
          <div className="pt-16 h-screen overflow-hidden">
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
