// Runs in the finished container as the app user, with only the shipped runtime available.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixture = process.argv[2];
assert.ok(fixture, "Pass the official FIA PDF fixture path.");
const result = spawnSync(process.execPath, ["--max-old-space-size=256", fileURLToPath(new URL("./fia-pdf-runtime.mjs", import.meta.url))], {
  input: readFileSync(fixture), encoding: "utf8", timeout: 30000, maxBuffer: 8_000_000, windowsHide: true,
  env: { ...process.env, NODE_ENV: "production" },
});
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr);
const pages = JSON.parse(result.stdout);
assert.ok(pages.length > 0 && pages.length <= 8);
const words = pages.flat().map(w => w.str);
for (const code of ["PIA", "NOR", "RUS", "ANT", "VER", "HAD", "LEC", "HAM", "ALB", "SAI", "LIN", "LAW", "STR", "ALO", "CAM", "BEA", "HUL", "BOR", "GAS", "COL", "PER", "BOT"])
  assert.ok(words.includes(code), `FIA fixture is missing ${code}.`);
assert.ok(words.includes("51"), "FIA fixture is missing Camara's car number.");
console.log("Production FIA PDF runtime passed: 22 race driver codes, including CAM and car 51.");
