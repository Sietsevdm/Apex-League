import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { emptyPicks, emptyResult, score, standings } from "../lib/model";
import {
  mappedPicks,
  resultImpact,
  submissionOverview,
} from "../lib/enhancements";
test("Replacement scoring preserves original picks and applies policy to every category", () => {
  const picks = {
    ...emptyPicks(),
    order: ["OLD"],
    pole: "OLD",
    fastest: "OLD",
    retirement: "OLD",
    dotd: "OLD",
  };
  const result = {
    ...emptyResult(),
    published: true,
    order: ["NEW"],
    pole: "NEW",
    fastest: "NEW",
    retirements: ["NEW"],
    dotd: "NEW",
    replacements: [
      {
        from: "OLD",
        to: "NEW",
        kind: "gp" as const,
        policy: "carry" as const,
        note: "",
      },
    ],
  };
  assert.equal(score(picks, result, "gp").total, 9);
  assert.equal(picks.pole, "OLD");
  assert.equal(
    score(
      picks,
      {
        ...result,
        replacements: [{ ...result.replacements[0], policy: "keep" }],
      },
      "gp",
    ).total,
    0,
  );
  assert.equal(
    mappedPicks({ ...picks, retirement: "none" }, result.replacements)
      .retirement,
    "none",
  );
});
test("Correction preview uses season totals and tie-break ranking without mutating published results", () => {
  const s = seed(true),
    event = s.events[0];
  const before = structuredClone(s);
  const result = {
    ...emptyResult(),
    published: true,
    order: s.seasons[0].drivers.slice(0, 10).map((d) => d.id),
    pole: "VER",
    fastest: "VER",
    retirements: ["none"],
    dotd: "VER",
  };
  const preview = resultImpact(s, event, "gp", result);
  const expected = standings(
    {
      ...s,
      events: s.events.map((e) =>
        e.id === event.id ? { ...e, gp: result } : e,
      ),
    },
    event.seasonId,
  );
  assert.deepEqual(
    preview.map((r) => [r.id, r.after, r.rank]),
    expected.map((r) => [r.id, r.total, r.rank]),
  );
  assert.deepEqual(s, before);
  event.practiceRound = true;
  assert.ok(
    resultImpact(s, event, "gp", result).every(
      (r) => r.delta === 0 && r.rank === r.oldRank,
    ),
  );
});
test("Submission overview exposes status only and distinguishes a draft from a missed entry", () => {
  const s = seed(true),
    event = s.events[0];
  event.lockedGp = false;
  event.gpDeadline = new Date(Date.now() + 86400000).toISOString();
  s.entries = s.entries.filter((p) => p.eventId !== event.id);
  s.entries.push({
    eventId: event.id,
    userId: s.users[0].id,
    kind: "gp",
    picks: emptyPicks(),
    submitted: false,
    updatedAt: new Date().toISOString(),
  });
  let rows = submissionOverview(s, event, "gp");
  assert.equal(rows[0].status, "Draft");
  assert.equal(rows[1].status, "Not started");
  assert.ok(
    rows.every((r) => Object.keys(r).sort().join(",") === "name,status,userId"),
  );
  event.lockedGp = true;
  rows = submissionOverview(s, event, "gp");
  assert.ok(rows.every((r) => r.status === "Missed"));
});
