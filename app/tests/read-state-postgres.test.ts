import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
process.env.DEMO_MODE = "false";
process.env.DATABASE_URL = "postgresql://unused.invalid/test";
const queries: string[] = [];
const saved = seed(false);
(globalThis as unknown as { apexPool: unknown }).apexPool = {
  query: async (sql: string) => {
    queries.push(sql);
    if (sql !== "SELECT payload FROM league_state WHERE id=1")
      throw new Error(`Unexpected SQL: ${sql}`);
    return { rows: [{ payload: structuredClone(saved) }] };
  },
};
test("PostgreSQL snapshot reads use SELECT only, without transactions, row locks or updates", async () => {
  const { readState } = await import("../lib/store");
  const first = await readState();
  first.settings.welcome = "Only in this snapshot";
  const second = await readState();
  assert.notEqual(second.settings.welcome, first.settings.welcome);
  assert.equal(queries.length, 2);
  assert.ok(
    queries.every(
      (sql) =>
        !sql.includes("FOR UPDATE") &&
        !sql.includes("BEGIN") &&
        !sql.includes("UPDATE"),
    ),
  );
});

test("write path keeps row locks but skips unchanged updates and initializes schema only once", async () => {
  const calls: string[] = [];
  let payload = seed(false);
  const client = {
    query: async (sql: string, args?: string[]) => {
      calls.push(sql);
      if (sql.includes("SELECT payload")) return {rows: [{payload: structuredClone(payload)}]};
      if (sql.startsWith("UPDATE")) payload = JSON.parse(args![0]);
      return {rows: []};
    },
    release() {},
  };
  (globalThis as unknown as {apexPool: unknown}).apexPool = {query: client.query, connect: async () => client};
  const {transaction} = await import("../lib/store");
  await transaction(() => undefined);
  assert.ok(!calls.some(sql => sql.startsWith("UPDATE")));
  await transaction(s => { s.settings.welcome = "Changed"; });
  assert.equal(calls.filter(sql => sql.startsWith("CREATE TABLE")).length, 1);
  assert.equal(calls.filter(sql => sql.includes("FOR UPDATE")).length, 2);
  assert.equal(calls.filter(sql => sql.startsWith("UPDATE")).length, 1);
  assert.equal(payload.settings.welcome, "Changed");
  await assert.rejects(transaction(s => { s.settings.welcome = "Rolled back"; throw new Error("cancel"); }), /cancel/);
  assert.equal(payload.settings.welcome, "Changed");
  assert.equal(calls.at(-1), "ROLLBACK");
});
