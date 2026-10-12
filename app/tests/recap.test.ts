import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { recap, cardSvg } from "../lib/recap";
test("share card uses published points and excludes future rounds from historic standings", () => {
  const s = seed(true),
    season = s.seasons[0],
    event = s.events[0];
  const info = recap(s, season, event, "demo-admin");
  assert.equal(info.myPoints, 23);
  assert.equal(info.standings.find((r) => r.id === "demo-admin")!.total, 23);
  assert.equal(info.podiums, 1);
});
test("share card escapes user content and clearly labels pending Sprint results", () => {
  const s = seed(true);
  s.settings.name = "<script>&League";
  const event = s.events[0];
  event.hasSprint = true;
  const svg = cardSvg(s, s.seasons[0], event, "demo-admin");
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;&amp;League"));
  assert.ok(svg.includes("Sprint results pending"));
  assert.ok(svg.includes('width="1080" height="1350"'));
});
