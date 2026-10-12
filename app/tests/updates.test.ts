import { test } from "node:test";
import assert from "node:assert/strict";
import { newerVersion, checkUpdates } from "../lib/updates";
test("Version comparison is numeric and ignores unstable or malformed versions", () => {
  assert.equal(newerVersion("0.10.0", "0.9.0"), true);
  assert.equal(newerVersion("0.8.0", "0.8.0"), false);
  assert.equal(newerVersion("0.7.1", "0.8.0"), false);
  assert.equal(newerVersion("0.9.0-beta"), false);
});
test("Release checks distinguish missing configuration, unavailable releases, updates and errors", async () => {
  const original = process.env.UPDATES_REPOSITORY;
  try {
    delete process.env.UPDATES_REPOSITORY;
    assert.equal((await checkUpdates()).status, "unconfigured");
    process.env.UPDATES_REPOSITORY = "Sietsevdm/Apex-League";
    const fetcher = (async (url: string) => { assert.equal(url, "https://api.github.com/repos/Sietsevdm/Apex-League/releases/latest"); return Response.json({ tag_name: "v0.9.0", body: "Changes", draft: false, prerelease: false }); }) as typeof fetch;
    const result = await checkUpdates(fetcher);
    assert.equal(result.status, "available");
    assert.equal(result.image, "ghcr.io/sietsevdm/apex-league:0.9.0");
    assert.equal((await checkUpdates((async () => new Response(null, { status: 404 })) as typeof fetch)).status, "unavailable");
    await assert.rejects(() => checkUpdates((async () => new Response(null, { status: 403 })) as typeof fetch));
    process.env.UPDATES_REPOSITORY = "https://bad.example";
    await assert.rejects(() => checkUpdates(fetcher));
  } finally { if (original === undefined) delete process.env.UPDATES_REPOSITORY; else process.env.UPDATES_REPOSITORY = original; }
});
