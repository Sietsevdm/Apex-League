import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { seed } from "../lib/seed";
import Home from "../components/screens/Home";
import AgainstTheGrid from "../components/AgainstTheGrid";

test("next step disappears only after all of the player's applicable weekend sets are submitted", () => {
  const s = seed(true), season = s.seasons[0], event = s.events.find(e => e.id === "singapore")!;
  s.settings.bannerOverride = event.id;
  const visible = () => renderToStaticMarkup(createElement(Home, { s, season, meId: "demo-admin", go: () => {} })).includes('class="next-action-card"');
  assert.equal(visible(), true);
  const gp = { userId: "demo-admin", eventId: event.id, kind: "gp" as const, submitted: true, picks: structuredClone(s.entries[0].picks), updatedAt: "" };
  s.entries.push(gp);
  assert.equal(visible(), true);
  const sprint = { ...gp, kind: "sprint" as const, submitted: false };
  s.entries.push(sprint);
  assert.equal(visible(), true);
  sprint.submitted = true;
  assert.equal(visible(), false);
  gp.submitted = false;
  assert.equal(visible(), true);
  gp.submitted = true;
  event.hasSprint = false; event.sprintQualifying = undefined; event.sprintRace = undefined;
  sprint.submitted = false;
  assert.equal(visible(), false);
});

test("expanded majority details omit the outer disclosure heading and counter", () => {
  const s = seed(true), season = s.seasons[0], event = s.events[0];
  const html = renderToStaticMarkup(createElement(AgainstTheGrid, { s, season, event, kind: "gp", meId: "demo-admin" }));
  assert.doesNotMatch(html, /against-grid-heading/);
  assert.doesNotMatch(html, /different calls/);
  assert.match(html, /Where you disagree/);
});
