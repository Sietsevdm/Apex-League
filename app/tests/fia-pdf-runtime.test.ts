import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("an isolated production PDF runtime reads the official fixture with its shipped Node dependencies", async () => {
  const root = await mkdtemp(join(tmpdir(), "apex-fia-pdf-"));
  try {
    await mkdir(join(root, "scripts"));
    for (const name of ["fia-pdf-runtime.mjs", "verify-fia-pdf-runtime.mjs"])
      await cp(resolve("scripts", name), join(root, "scripts", name));
    execFileSync(process.execPath, [resolve("scripts/prepare-fia-pdf-runtime.mjs"), join(root, "vendor/fia-pdf")], { timeout: 30000, windowsHide: true });
    const output = execFileSync(process.execPath, [join(root, "scripts/verify-fia-pdf-runtime.mjs"), fileURLToPath(new URL("./fixtures/fia-2026-brazil-entry-list.pdf", import.meta.url))], {
      cwd: root, env: { ...process.env, NODE_ENV: "production", NODE_PATH: "" }, encoding: "utf8", timeout: 30000, windowsHide: true,
    });
    assert.match(output, /22 race driver codes, including CAM and car 51/);
  } finally {
    assert.ok(root.startsWith(join(tmpdir(), "apex-fia-pdf-")));
    await rm(root, { recursive: true, force: true });
  }
});
