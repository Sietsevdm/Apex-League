import { createRequire } from "node:module";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const target = resolve(process.argv[2] || "vendor/fia-pdf");
const modules = join(target, "node_modules");
function copyPackage(name, resolver = require) {
  let root = dirname(resolver.resolve(name));
  while (true) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
      if (pkg.name === name) break;
    } catch { /* Walk from the resolved entry point to this package's root. */ }
    const parent = dirname(root);
    if (parent === root) throw new Error(`Could not find package root: ${name}`);
    root = parent;
  }
  cpSync(root, join(modules, name), { recursive: true, dereference: true });
  return createRequire(join(root, "package.json"));
}
mkdirSync(modules, { recursive: true });
copyPackage("pdfjs-dist");
const canvasRequire = copyPackage("@napi-rs/canvas");
const suffix = process.platform === "linux" ? `linux-${process.arch}-gnu`
  : process.platform === "win32" ? `win32-${process.arch}-msvc`
  : process.platform === "darwin" ? `darwin-${process.arch}` : "";
if (!suffix) throw new Error("Unsupported FIA PDF runtime platform.");
copyPackage(`@napi-rs/canvas-${suffix}`, canvasRequire);
writeFileSync(join(target, "package.json"), JSON.stringify({ private: true, name: "apex-fia-pdf-runtime", type: "module" }));
console.log(`Packaged FIA PDF runtime for ${process.platform}/${process.arch}.`);
