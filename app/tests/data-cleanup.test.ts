import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
import { seed } from "../lib/seed";
import { deleteArchivedSeasons, purgeSeasonData } from "../lib/data-cleanup";
process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `cleanup-test-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.BACKUP_DIR = `.data/cleanup-backups-${process.pid}`;
process.env.BACKUP_SECRET = "cleanup-tests-secret-more-than-32-characters";

test("Archived season deletion removes dependent records and preserves active seasons and accounts", () => {
  const s = seed(true);
  const archived = { ...structuredClone(s.seasons[0]), id: "old", archived: true };
  s.seasons.push(archived);
  s.events.push({ ...structuredClone(s.events[0]), id: "old-race", seasonId: "old" });
  s.users[0].seasonIds.push("old");
  s.entries.push({ ...structuredClone(s.entries[0]), eventId: "old-race" });
  s.receipts = [{ id: "old-receipt", userId: s.users[0].id, eventId: "old-race", kind: "gp", picks: s.entries[0].picks, submittedAt: "date", deadline: "date" }];
  s.championPicks.push({ userId: s.users[0].id, seasonId: "old", driver: "VER", constructor: "Red Bull" });
  s.settings.bannerOverride = "old-race";
  const before = structuredClone(s);
  assert.throws(() => deleteArchivedSeasons(s, ["old", "sample-season"]));
  assert.deepEqual(s, before);
  deleteArchivedSeasons(s, ["old"]);
  assert.equal(s.seasons.length, 1);
  assert.equal(s.users.length, before.users.length);
  assert.ok(s.events.every((e) => e.seasonId !== "old"));
  assert.ok(s.entries.every((e) => e.eventId !== "old-race"));
  assert.equal(s.receipts.length, 0);
  assert.ok(s.championPicks.every((e) => e.seasonId !== "old"));
  assert.deepEqual(s.users[0].seasonIds, ["sample-season"]);
  assert.equal(s.settings.bannerOverride, "");
});
test("Purge retains account credentials, settings and history while clearing all season records", () => {
  const s = seed(true), before = structuredClone(s);
  purgeSeasonData(s);
  for (const key of ["seasons", "events", "entries", "receipts", "championPicks"] as const) assert.equal(s[key]!.length, 0);
  assert.deepEqual(s.settings, before.settings);
  assert.deepEqual(s.audit, before.audit);
  assert.deepEqual(s.users, before.users.map((u) => ({ ...u, seasonIds: [] })));
});
test("Deletion API enforces admin access, confirmation, archive state and successful recoverable backup", async () => {
  const { POST } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const { decryptBackup } = await import("../lib/backups");
  async function post(body: object, user = "demo-admin") {
    return POST(new NextRequest("http://127.0.0.1:3000/api/league", { method: "POST", headers: { origin: "http://127.0.0.1:3000", cookie: `apex_demo=${user}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  }
  try {
    const request = { action: "purgeSeasonData", confirmation: "PURGE SEASON DATA" };
    assert.equal((await post(request, "demo-1")).status, 403);
    assert.equal((await post({ ...request, confirmation: "wrong" })).status, 400);
    assert.equal((await post({ action: "deleteSeasons", confirmation: "DELETE ARCHIVED SEASONS", seasonIds: ["sample-season"] })).status, 400);
    delete process.env.BACKUP_SECRET;
    assert.equal((await post(request)).status, 400);
    await transaction((s) => { assert.equal(s.seasons.length, 1); });
    process.env.BACKUP_SECRET = "cleanup-tests-secret-more-than-32-characters";
    await transaction((s) => { s.seasons.push({ ...structuredClone(s.seasons[0]), id: "old", archived: true }); });
    assert.equal((await post({ action: "deleteSeasons", confirmation: "DELETE ARCHIVED SEASONS", seasonIds: ["old"] })).status, 200);
    await transaction((s) => { assert.equal(s.seasons.length, 1); });
    await transaction((s) => { s.seasons.push({ ...structuredClone(s.seasons[0]), id: "active-test", name: "Active test", archived: false }); });
    const single = { action: "purgeSeason", seasonId: "active-test", confirmation: "Active test" };
    assert.equal((await post(single, "demo-1")).status, 403);
    assert.equal((await post({ ...single, confirmation: "wrong" })).status, 400);
    delete process.env.BACKUP_SECRET;
    assert.equal((await post(single)).status, 400);
    await transaction((s) => { assert.equal(s.seasons.length, 2); });
    process.env.BACKUP_SECRET = "cleanup-tests-secret-more-than-32-characters";
    assert.equal((await post(single)).status, 200);
    await transaction((s) => { assert.deepEqual(s.seasons.map((season) => season.id), ["sample-season"]); assert.ok(s.entries.length > 0); });
    assert.equal((await post(single)).status, 400);
    const response = await post(request);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.state.seasons.length, 0);
    assert.equal(data.state.users.length, 6);
    const names = await fs.readdir(process.env.BACKUP_DIR!);
    const snapshots = await Promise.all(names.map(async (name) => decryptBackup(await fs.readFile(`${process.env.BACKUP_DIR}/${name}`, "utf8"))));
    assert.ok(snapshots.some((s) => s.seasons.length === 1 && s.entries.length > 0));
    assert.ok(snapshots.some((s) => s.seasons.length === 2));
  } finally {
    await fs.rm(`.data/${process.env.DEMO_DATA_FILE}`, { force: true });
    await fs.rm(process.env.BACKUP_DIR!, { recursive: true, force: true });
  }
});

test("Purge preserves uploaded banner photos and reuses them on a recreated calendar", async () => {
  const s = seed(true);
  const event = s.events[0];
  event.photo = "data:image/png;base64,manual";
  event.focal = 32;
  const season = structuredClone(s.seasons[0]), recreated = structuredClone(event);
  purgeSeasonData(s);
  assert.equal(s.settings.savedBannerPhotos![0].photo, event.photo);
  s.seasons.push(season);
  s.events.push({ ...recreated, photo: "", focal: 50 });
  const { decorateImages } = await import("../lib/banner-images");
  const response = await decorateImages({ authenticated: true, state: s, userId: s.users[0].id });
  assert.equal(response.state.events[0].photo, event.photo);
  assert.equal(response.state.events[0].focal, 32);
});
