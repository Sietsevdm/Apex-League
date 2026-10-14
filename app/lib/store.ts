import { migrateRegistration } from "./season-controls";
import { Pool } from "pg";
import { promises as fs } from "node:fs";
import path from "node:path";
import { State } from "./model";
import { seed } from "./seed";
import { publicLoginData, type PublicSettings } from "./public-login";
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
/** Read public presentation only, without locking or rewriting the league document. */
export async function readPublicSettings(): Promise<ReturnType<typeof publicLoginData>> {
  if (demoMode) {
    let settings: PublicSettings;
    try {
      settings = JSON.parse(await fs.readFile(file, "utf8")).settings;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      settings = seed(true).settings;
    }
    return publicLoginData(settings, true);
  }
  try {
    const result = await pool().query(`SELECT jsonb_build_object(
      'name', payload->'settings'->'name',
      'loginText', payload->'settings'->'loginText',
      'typography', payload->'settings'->'typography',
      'theme', payload->'settings'->'theme'
    ) AS settings FROM league_state WHERE id=1`);
    return publicLoginData(result.rows[0]?.settings);
  } catch (error) {
    // A fresh installation initializes its table on the first API operation.
    if ((error as { code?: string }).code === "42P01") return publicLoginData();
    throw error;
  }
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
        migrateRegistration(s);
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
    migrateRegistration(s);
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
