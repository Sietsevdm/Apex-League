import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { submissionOverview } from "../lib/enhancements";
import { organiserTasks, weekendTasks } from "../lib/weekend-guidance";

test("dashboard tasks separate submitted GP and incomplete Sprint with independent lock deadlines", () => {
  const s = seed(true),
    e = s.events.find((e) => e.id === "singapore")!;
  const now = Date.now();
  e.gpDeadline = new Date(now + 20000).toISOString();
  e.sprintDeadline = new Date(now + 10000).toISOString();
  s.entries.push({
    userId: "demo-admin",
    eventId: e.id,
    kind: "gp",
    submitted: true,
    picks: s.entries[0].picks,
    updatedAt: new Date().toISOString(),
  });
  const tasks = weekendTasks(s, e, "demo-admin", now);
  assert.equal(tasks[0].submitted, true);
  assert.equal(tasks[1].submitted, false);
  assert.equal(tasks[1].locked, false);
  assert.equal(weekendTasks(s, e, "demo-admin", now + 11000)[1].locked, true);
  assert.equal(weekendTasks(s, e, "demo-admin", now + 11000)[0].locked, false);
});

test("organiser checklist includes only missing data, unpublished completed sessions and outstanding active entries", () => {
  const s = seed(true),
    e = s.events.find((e) => e.id === "singapore")!;
  const now = Date.now();
  e.practice = new Date(now - 1000).toISOString();
  e.gpDeadline = new Date(now + 20000).toISOString();
  e.sprintDeadline = new Date(now + 10000).toISOString();
  e.sprintRace = new Date(now + 100000).toISOString();
  s.users[1].active = false;
  Object.assign(s, {
    submissionOverview: {
      [e.id]: {
        gp: submissionOverview(s, e, "gp"),
        sprint: submissionOverview(s, e, "sprint"),
      },
    },
  });
  const open = organiserTasks(s, s.seasons[0].id, now);
  assert.equal(open.find((task) => task.key === "entries-gp")?.count, 5);
  assert.ok(!open.some((task) => task.key === "results"));
  e.sprintRace = new Date(now - 1000).toISOString();
  assert.equal(
    organiserTasks(s, s.seasons[0].id, now).find(
      (task) => task.key === "results",
    )?.count,
    1,
  );
  e.qualifying = "";
  assert.ok(
    organiserTasks(s, s.seasons[0].id, now).some(
      (task) => task.key === "calendar",
    ),
  );
  s.seasons[0].archived = true;
  assert.deepEqual(organiserTasks(s, s.seasons[0].id, now), []);
});

test("missing overview data never guesses player submission counts from privacy-filtered entries", () => {
  const s = seed(true);
  s.entries = [];
  assert.ok(
    !organiserTasks(s, s.seasons[0].id).some((task) =>
      task.key.startsWith("entries-"),
    ),
  );
});
