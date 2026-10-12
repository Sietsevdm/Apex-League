import { Pool } from "pg";
import { promises as fs } from "node:fs";
import path from "node:path";
import { State } from "./model";
import { seed } from "./seed";
export const demoMode = process.env.DEMO_MODE === "true";
const globalStore = globalThis as unknown as {
  apexPool?: Pool;
  apexQueue?: Promise<unknown>;
};
const file = path.join(
  process.cwd(),
  ".data",
  process.env.DEMO_DATA_FILE || "demo.json",
);
function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Set DATABASE_URL for production, or DEMO_MODE=true for local preview.",
    );
  return (globalStore.apexPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
  }));
}
export async function transaction<T>(
  work: (s: State) => T | Promise<T>,
): Promise<T> {
  if (demoMode) {
    const previous = globalStore.apexQueue || Promise.resolve();
    const job = previous
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(path.dirname(file), { recursive: true });
        let s: State;
        try {
          s = JSON.parse(await fs.readFile(file, "utf8"));
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
          s = seed(true);
        }
        const result = await work(s);
        await fs.writeFile(file + ".tmp", JSON.stringify(s));
        await fs.rename(file + ".tmp", file);
        return result;
      });
    globalStore.apexQueue = job;
    return job;
  }
  const client = await pool().connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS league_state (id INTEGER PRIMARY KEY, payload JSONB NOT NULL)",
    );
    await client.query(
      "INSERT INTO league_state(id,payload) VALUES(1,$1) ON CONFLICT DO NOTHING",
      [JSON.stringify(seed(false))],
    );
    await client.query("BEGIN");
    const row = await client.query(
      "SELECT payload FROM league_state WHERE id=1 FOR UPDATE",
    );
    const s: State = row.rows[0].payload;
    const result = await work(s);
    await client.query("UPDATE league_state SET payload=$1 WHERE id=1", [
      JSON.stringify(s),
    ]);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
