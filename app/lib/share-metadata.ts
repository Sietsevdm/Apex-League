import type { Metadata } from "next";

/** Public, fixed branding only: never include league, account or invitation data. */
export function shareMetadata(appUrl = process.env.APP_URL): Metadata {
  const base = new URL(appUrl || "http://localhost:3000");
  const title = "Apex League · F1 Prediction League";
  const description = "Friends in the Paddock. Rivals on the Grid. Make your Formula 1 predictions, compete with friends and follow every race weekend.";
  const image = {
    url: "/apex-share-preview.png",
    width: 1200,
    height: 630,
    alt: "Apex League — Friends in the Paddock. Rivals on the Grid.",
  };
  return {
    metadataBase: base,
    title,
    description,
    openGraph: { type: "website", siteName: "Apex League", title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  };
}
