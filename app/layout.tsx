import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { AppProvider } from "./AppContext";

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
  // server-side check for the custom user agent
  const ua = headers().get("user-agent") || "";
  const isAppAgent = ua.toLowerCase().includes("app1212");

  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-slate-50 text-slate-900 antialiased ${
          isAppAgent ? "app-ui" : ""
        }`}
      >
        <AppProvider isApp={isAppAgent}>{children}</AppProvider>
      </body>
    </html>
  );
}
