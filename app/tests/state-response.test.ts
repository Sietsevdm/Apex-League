import { test } from "node:test";
import assert from "node:assert/strict";
import { versioned, mutationResponse } from "../lib/state-response";
import { applyDelta, changesBetween } from "../lib/state-delta";

test("compact saves reproduce full state, including removals and resized arrays", () => {
  const before = versioned({
    authenticated: true,
    userId: "one",
    context: { scope: "season" },
    state: {
      settings: { name: "League", optional: "remove", large: "x".repeat(5000) },
      entries: [{ picks: ["a", "b"] }],
      championPicks: [{ constructor: "Old" }],
    },
  });
  const after = versioned({
    ...before,
    state: {
      ...before.state,
      settings: { name: "Updated", large: "x".repeat(5000) },
      entries: [{ picks: ["c"] }],
      championPicks: [{ constructor: "New" }],
    },
  });
  const response = mutationResponse(before, after, before.revision!);
  assert.equal(response.delta, true);
  assert.deepEqual(applyDelta(before as any, response), after);
  assert.equal(
    applyDelta({ ...before, revision: "stale" } as any, response),
    undefined,
  );
  assert.ok(JSON.stringify(response).length < JSON.stringify(after).length / 4);
});

test("versions bind identity, scope and visible content; mismatches fall back to full data", () => {
  const before = versioned({
    authenticated: true,
    userId: "one",
    context: { scope: "season" },
    state: { name: "A" },
  });
  const after = versioned({ ...before, state: { name: "B" } });
  assert.notEqual(before.revision, after.revision);
  assert.equal(versioned({ ...before }).revision, before.revision);
  assert.deepEqual(mutationResponse(before, after, "stale"), after);
  const switched = versioned({ ...after, userId: "two" });
  assert.deepEqual(
    mutationResponse(before, switched, before.revision!),
    switched,
  );
  assert.equal(versioned({ authenticated: false }).revision, undefined);
  assert.deepEqual(changesBetween({ a: 1 }, { a: 1 }), []);
});
