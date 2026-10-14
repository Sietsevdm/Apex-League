import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { State } from "./model";
const directory = () =>
  process.env.BACKUP_DIR || path.join(process.cwd(), ".data", "backups");
function key() {
  const secret = process.env.BACKUP_SECRET;
  if (!secret || secret.length < 32 || secret.includes("CHANGE_"))
    throw new Error(
      "Configure BACKUP_SECRET with at least 32 random characters.",
    );
  return createHash("sha256").update(secret).digest();
}
export function encryptBackup(s: State, now = new Date().toISOString()) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const snapshot = structuredClone(s);
  delete snapshot.passkeyChallenges;
  for (const season of snapshot.seasons) {
    if (season.calendarSync) {
      delete season.calendarSync.lease;
      delete season.calendarSync.leaseUntil;
    }
  }
  const data = Buffer.concat([
    cipher.update(
      JSON.stringify({
        format: "apex-backup",
        version: 1,
        createdAt: now,
        state: snapshot,
      }),
    ),
    cipher.final(),
  ]);
  return JSON.stringify({
    format: "apex-encrypted-backup",
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}
export function decryptBackup(contents: string): State {
  if (contents.length > 100_000_000) throw new Error("Backup is too large.");
  const outer = JSON.parse(contents);
  if (outer.format !== "apex-encrypted-backup" || outer.version !== 1)
    throw new Error("Choose an encrypted league backup.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(outer.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(outer.tag, "base64"));
  const payload = JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(outer.data, "base64")),
      decipher.final(),
    ]).toString(),
  );
  const s = payload.state as State;
  if (
    payload.format !== "apex-backup" ||
    payload.version !== 1 ||
    !s ||
    s.schema !== 1 ||
    !s.settings ||
    !s.settings.theme ||
    !Array.isArray(s.users) ||
    !s.users.some((u) => u.active && u.role === "admin") ||
    ["events", "seasons", "entries", "championPicks", "audit"].some(
      (k) => !Array.isArray((s as any)[k]),
    )
  )
    throw new Error("Invalid league backup.");
  delete s.passkeyChallenges;
  // Restores revoke device subscriptions; each player explicitly opts in again.
  if(s.push) { s.push.subscriptions=[]; s.push.deliveries={}; }
  s.users.forEach((u) => {
    u.version = (u.version || 0) + 1;
  });
  return s;
}
export async function listBackups() {
  await fs.mkdir(directory(), { recursive: true, mode: 0o700 });
  const names = (await fs.readdir(/*turbopackIgnore: true*/ directory()))
    .filter((n) => /^league-[\dT-]+-[a-f\d]{8}\.json$/.test(n))
    .sort()
    .reverse();
  return Promise.all(
    names.map(async (name) => ({
      name,
      bytes: (
        await fs.stat(
          /*turbopackIgnore: true*/ path.join(
            /*turbopackIgnore: true*/ directory(),
            name,
          ),
        )
      ).size,
    })),
  );
}
export async function createBackup(s: State) {
  const now = new Date().toISOString();
  s.backupHealth = { ...s.backupHealth, lastAttempt: now };
  try {
    const content = encryptBackup(s, now);
    await fs.mkdir(directory(), { recursive: true, mode: 0o700 });
    const name = `league-${now.replace(/[:.Z]/g, "-")}-${randomBytes(4).toString("hex")}.json`;
    await fs.writeFile(
      path.join(/*turbopackIgnore: true*/ directory(), name),
      content,
      { flag: "wx", mode: 0o600 },
    );
    s.backupHealth = { lastAttempt: now, lastSuccess: now };
    const files = await listBackups();
    for (const file of files.slice(30))
      await fs.unlink(
        path.join(/*turbopackIgnore: true*/ directory(), file.name),
      );
    return { name, content };
  } catch (e) {
    s.backupHealth.error = (e as Error).message;
    throw e;
  }
}
export async function readBackup(name: string) {
  if (!(await listBackups()).some((f) => f.name === name))
    throw new Error("Unknown backup.");
  return fs.readFile(
    /*turbopackIgnore: true*/ path.join(
      /*turbopackIgnore: true*/ directory(),
      name,
    ),
    "utf8",
  );
}
