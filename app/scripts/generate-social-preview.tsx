import { ImageResponse } from "next/og";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

async function main() {
  const require = createRequire(import.meta.url);
  const sharp = require(require.resolve("sharp", { paths: [require.resolve("next")] }));
  const background = await sharp(await readFile("public/login-garage.webp")).resize({ width: 1200 }).png().toBuffer();
  const logo = await readFile("public/apex-logo.svg");
  const response = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#0B1020", color: "#F4F7FB", fontFamily: "sans-serif" }}>
      <img src={`data:image/png;base64,${background.toString("base64")}`} width={1200} height={630} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", background: "linear-gradient(90deg, rgba(11,16,32,.98) 0%, rgba(11,16,32,.86) 45%, rgba(11,16,32,.25) 100%)" }} />
      <div style={{ display: "flex", flexDirection: "column", padding: "54px 64px", width: "100%", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={`data:image/svg+xml;base64,${logo.toString("base64")}`} width={62} height={62} alt="Apex" />
          <span style={{ fontSize: 32, fontWeight: 700 }}>Apex League</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 58, fontWeight: 700, letterSpacing: -2 }}>Friends in the Paddock.</span>
          <span style={{ fontSize: 58, fontWeight: 700, letterSpacing: -2, color: "#2DE2C4", fontStyle: "italic" }}>Rivals on the Grid.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 36, height: 3, background: "#F4C76B" }} />
          <span style={{ fontSize: 22, color: "#C2CDDD", letterSpacing: 3 }}>YOUR F1 PREDICTION LEAGUE</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
  await writeFile("public/apex-share-preview.png", await sharp(Buffer.from(await response.arrayBuffer())).png({ palette: true, quality: 85 }).toBuffer());
  console.log("Saved public/apex-share-preview.png (1200 × 630).");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
