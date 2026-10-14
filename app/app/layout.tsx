import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import "./globals.css";
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-barlow" });
export const metadata: Metadata = {
  title: "Apex · Prediction League",
  description: "Your friends. Your predictions. Your racing league.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1020",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
