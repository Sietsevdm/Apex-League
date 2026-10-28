import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import "./globals.css";
import { shareMetadata } from "@/lib/share-metadata";
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-barlow" });
// Read APP_URL at request time: the Docker image is built before host settings exist.
export function generateMetadata(): Metadata {
  return shareMetadata();
}
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
