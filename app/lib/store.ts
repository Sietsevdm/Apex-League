import { migrateRegistration } from "./season-controls";
import { migrateLeagues } from "./leagues";
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
  apexSchemaReady?: Promise<void>;
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
async function ensureDatabase() {
  if (!globalStore.apexSchemaReady) {
    globalStore.apexSchemaReady = (async () => {
      await pool().query(
        "CREATE TABLE IF NOT EXISTS league_state (id INTEGER PRIMARY KEY, payload JSONB NOT NULL)",
      );
      await pool().query(
        "INSERT INTO league_state(id,payload) VALUES(1,$1) ON CONFLICT DO NOTHING",
        [JSON.stringify(seed(false))],
      );
    })().catch((error) => {
      globalStore.apexSchemaReady = undefined;
      throw error;
    });
  }
  await globalStore.apexSchemaReady;
}

/** Read public presentation only, without locking or rewriting the league document. */
export async function readPublicSettings(): Promise<
  ReturnType<typeof publicLoginData>
> {
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
/** A committed snapshot: no writer queue, row lock, or UPDATE on ordinary reads. */
export async function readState(): Promise<State> {
  if (demoMode) {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as State;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await transaction(() => undefined);
      return readState();
    }
  }
  try {
    const row = await pool().query(
      "SELECT payload FROM league_state WHERE id=1",
    );
    if (row.rows.length) {
      return row.rows[0].payload as State;
    }
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") throw error;
  }
  await transaction(() => undefined);
  return readState();
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
        const before = JSON.stringify(s);
        migrateRegistration(s);
        migrateLeagues(s);
        const result = await work(s);
        const after = JSON.stringify(s);
        if (before !== after || !(await fs.stat(file).catch(() => null))) {
          await fs.writeFile(file + ".tmp", after);
          await fs.rename(file + ".tmp", file);
        }
        return result;
      });
    globalStore.apexQueue = job;
    return job;
  }
  await ensureDatabase();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const row = await client.query(
      "SELECT payload FROM league_state WHERE id=1 FOR UPDATE",
    );
    const s: State = row.rows[0].payload;
    const before = JSON.stringify(s);
    migrateRegistration(s);
    migrateLeagues(s);
    const result = await work(s);
    const after = JSON.stringify(s);
    if (before !== after)
      await client.query("UPDATE league_state SET payload=$1 WHERE id=1", [
        after,
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
