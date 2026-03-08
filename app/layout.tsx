import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
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
  // server-side UA check
  const ua = headers().get("user-agent") || "";
  const isAppAgent = ua.toLowerCase().includes("app1212");

  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-slate-50 text-slate-900 antialiased ${
          isAppAgent ? "app-ui" : ""
        }`}
      >
        <AppProvider initialIsApp={isAppAgent}>
          <Header />
          <div className="pt-16">{/* offset for fixed header */}
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
