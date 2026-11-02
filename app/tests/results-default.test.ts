import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { resultsEvent } from "../lib/results-event";
import { bannerEvent } from "../lib/model";

test("results follow the current weekend, explicit links and organiser override", () => {
  const s = seed(true), season = s.seasons[0];
  const events = s.events.filter(e => e.seasonId === season.id && !e.practiceRound);
  assert.ok(events.length > 1);
  const now = Date.parse(events[1].race);
  assert.equal(resultsEvent(s, season, "", now)?.id, bannerEvent(s, season.id, now)?.id);
  assert.equal(resultsEvent(s, season, events[0].id, now)?.id, events[0].id);
  assert.equal(resultsEvent(s, season, "stale-id", now)?.id, bannerEvent(s, season.id, now)?.id);
  s.settings.bannerOverride = events[0].id;
  assert.equal(resultsEvent(s, season, "", now)?.id, events[0].id);
  season.archived = true;
  assert.equal(resultsEvent(s, season, events[1].id, now)?.id, events[1].id);
});

test("automatic results and replacement requests send the required provider identity", async () => {
  const { fetchAutomaticResult } = await import("../lib/automatic-results");
  const { fetchReplacementLineups } = await import("../lib/automatic-replacements");
  const { providerHeaders } = await import("../lib/provider-http");
  const s = seed(true), season = s.seasons[0], event = s.events[0];
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get("User-Agent"), providerHeaders["User-Agent"]);
    return new Response("unavailable", { status: 503 });
  };
  try {
    await assert.rejects(fetchAutomaticResult(season, event, "gp"), /503/);
    await assert.rejects(fetchReplacementLineups(season, event), /503/);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});
