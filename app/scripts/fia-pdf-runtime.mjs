// Native Node entry point. This file is copied to the image, never imported by Next.js.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

// Keep PDF.js diagnostic messages out of the JSON protocol on stdout.
console.log = (...args) => console.error(...args);
console.warn = (...args) => console.error(...args);

try {
  const packaged = new URL("../vendor/fia-pdf/package.json", import.meta.url);
  const packagedPresent = existsSync(fileURLToPath(packaged));
  if (process.env.NODE_ENV === "production" && !packagedPresent)
    throw new Error("The packaged FIA PDF runtime is missing.");
  const require = createRequire(packagedPresent ? packaged : import.meta.url);
  const canvas = require("@napi-rs/canvas");
  for (const name of ["DOMMatrix", "ImageData", "Path2D"]) {
    if (typeof canvas[name] !== "function") throw new Error(`PDF runtime is missing ${name}.`);
    if (!globalThis[name]) globalThis[name] = canvas[name];
  }
  // Runtime resolution avoids hashed Next.js package names and ESM worker require wrappers.
  const pdf = await import(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
  pdf.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 5_000_000) throw new Error("FIA entry list PDF is too large.");
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  if (data.subarray(0, 5).toString() !== "%PDF-") throw new Error("FIA entry list is not a supported PDF.");
  const task = pdf.getDocument({ data: new Uint8Array(data), isEvalSupported: false, disableFontFace: true, useSystemFonts: false });
  try {
    const document = await task.promise;
    if (document.numPages > 8) throw new Error("FIA entry list PDF is too long.");
    const pages = [];
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.filter(word => "str" in word));
    }
    process.stdout.write(JSON.stringify(pages));
  } finally {
    await task.destroy();
  }
} catch (error) {
  console.error(error?.message || "FIA PDF extraction failed.");
  process.exitCode = 1;
}
