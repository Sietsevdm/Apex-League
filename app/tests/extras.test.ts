import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { encryptBackup, decryptBackup } from "../lib/backups";
import { deadlineCalendar, seasonAwards } from "../lib/league-extras";
import { defaultFonts, validFonts } from "../lib/typography";
test("Encrypted backups round-trip private state, reject tampering and revoke sessions", () => {
  process.env.BACKUP_SECRET = "test-backup-secret-more-than-32-characters";
  const s = seed(true);
  s.passkeyChallenges = [
    {
      id: "secret",
      challenge: "secret",
      purpose: "login",
      expires: Date.now() + 300000,
    },
  ];
  const encrypted = encryptBackup(s);
  assert.ok(!encrypted.includes(s.users[0].email));
  const restored = decryptBackup(encrypted);
  assert.deepEqual(restored.entries, s.entries);
  assert.equal(restored.users[0].password, s.users[0].password);
  assert.equal(restored.users[0].version, s.users[0].version + 1);
  assert.equal(restored.passkeyChallenges, undefined);
  const payload = JSON.parse(encrypted);
  payload.tag = Buffer.alloc(16).toString("base64");
  assert.throws(() => decryptBackup(JSON.stringify(payload)));
  process.env.BACKUP_SECRET = "different-secret-more-than-32-characters";
  assert.throws(() => decryptBackup(encrypted));
});
test("Calendar exports deadline instants, GP and Sprint alarms and escapes user text", () => {
  const s = seed(true),
    season = s.seasons[0];
  const e = s.events.find(
    (e) => e.seasonId === season.id && e.sprintQualifying,
  )!;
  e.name = "Race, Friends;\nBEGIN:VEVENT";
  const ics = deadlineCalendar(s, season);
  const unfolded = ics.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("Race\\, Friends\\;\\nBEGIN:VEVENT"));
  assert.ok(ics.includes(`UID:${e.id}-sprint@apex-league`));
  assert.ok(ics.includes("TRIGGER:-PT24H"));
  assert.ok(ics.includes("TRIGGER:-PT1H"));
  const date = new Date(Date.parse(e.qualifying) - 3600000)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  assert.ok(ics.includes(`DTSTART:${date}`));
  for (const line of ics.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
});
test("Awards share ties and exclude practice rounds and unpublished picks", () => {
  const s = seed(true);
  s.entries = [];
  s.events.forEach((e) => {
    delete e.gp;
    delete e.sprint;
  });
  assert.ok(
    seasonAwards(s, s.seasons[0].id).every(
      (a) => a.value === 0 && a.winners.length === 0,
    ),
  );
  const e = s.events.find((e) => !e.practiceRound)!;
  const order = s.seasons[0].drivers.slice(0, 10).map((d) => d.id);
  e.gp = {
    order,
    pole: order[0],
    fastest: order[0],
    dotd: order[0],
    retirements: ["none"],
    voids: [],
    published: true,
  };
  for (const u of s.users.slice(0, 2))
    s.entries.push({
      userId: u.id,
      eventId: e.id,
      kind: "gp",
      picks: {
        order,
        pole: order[0],
        fastest: order[0],
        dotd: order[0],
        retirement: "none",
      },
      submitted: true,
      updatedAt: new Date().toISOString(),
    });
  const awards = seasonAwards(s, e.seasonId);
  assert.equal(
    awards.find((a) => a.label === "Perfect sessions")!.winners.length,
    2,
  );
});
test("Font controls reject injected families, missing groups and invalid numeric limits", () => {
  assert.equal(validFonts(defaultFonts), true);
  assert.equal(
    validFonts({
      ...defaultFonts,
      body: { ...defaultFonts.body, family: "url(evil)" },
    }),
    false,
  );
  assert.equal(
    validFonts({
      ...defaultFonts,
      tables: { ...defaultFonts.tables, size: 999 },
    }),
    false,
  );
  assert.equal(validFonts({ body: defaultFonts.body }), false);
});

test("Older typography settings retain their fonts and gain login defaults", async () => {
  const { defaultFonts, resolvedFonts, validFonts } = await import("../lib/typography");
  const old = structuredClone(defaultFonts) as any;
  delete old.loginTitle; delete old.loginText;
  old.body.family = "georgia";
  const merged = resolvedFonts({ text: 100, headings: 100, banner: 100, groups: old });
  assert.equal(merged.body.family, "georgia");
  assert.equal(merged.loginTitle.family, "barlow");
  assert.equal(merged.loginText.family, "dm");
  assert.equal(validFonts(merged), true);
});
