import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  extractFIAPDF,
  parseFIAEntryList,
  fetchFIAEntryList,
  discoverFIAEntryDocument,
  fiaDocumentURL,
  fiaDriverUpdates,
  teamIdentity,
  type PDFWord,
  type FIAEntryList,
} from "../lib/fia-entry-list";
import { applyOfficialDriverUpdates } from "../lib/official-driver-updates";

const url =
  "https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_entry_list.pdf";
const race = "2026-11-08T17:00:00Z";
const teams = [
  "McLaren",
  "Mercedes",
  "Red Bull Racing",
  "Ferrari",
  "Williams",
  "Racing Bulls",
  "Aston Martin",
  "Haas F1 Team",
  "Audi",
  "Alpine",
  "Cadillac",
];
function fixture() {
  const opening = Array.from({ length: 22 }, (_, i) => ({
    first_name: "Driver",
    last_name: `Person${String.fromCharCode(65 + i)}`,
    team_name: teams[Math.floor(i / 2)],
    driver_number: i + 1,
    session_key: 101,
    meeting_key: 1,
  }));
  const list: FIAEntryList = {
    url,
    year: 2026,
    eventName: "São Paulo Grand Prix",
    startsOn: "2026-11-06",
    endsOn: "2026-11-08",
    drivers: opening.map((r, i) => ({
      name: `${r.first_name} ${r.last_name}`,
      team: "Sponsor " + r.team_name,
      number: r.driver_number,
      code:
        "D" +
        String.fromCharCode(65 + Math.floor(i / 26)) +
        String.fromCharCode(65 + (i % 26)),
    })),
  };
  const word = (str: string, x: number, y: number, height = 10): PDFWord => ({
    str,
    height,
    transform: [height, 0, 0, height, x, y],
  });
  const words = [
    word("2026 SÃO PAULO GRAND PRIX", 30, 780),
    word("06 – 08 November 2026", 30, 750),
    ...["No.", "TLA", "Driver", "Nat", "Team", "Constructor"].map((h, i) =>
      word(h, [30, 60, 100, 220, 260, 450][i], 700),
    ),
  ];
  for (const [i, d] of list.drivers.entries())
    words.push(
      ...[String(d.number), d.code, d.name, "GBR", d.team, d.team].map((s, c) =>
        word(s, [30, 60, 100, 220, 260, 450][c], 680 - i * 13),
      ),
    );
  words.push(
    word(
      "In addition to the list of cars and drivers eligible to take part in the event",
      30,
      375,
    ),
    word("FP1 in accordance with Articles B1.7.3 and B1.7.4", 30, 360),
  );
  words.push(
    ...["51", "RES", "Practice Only", "GBR", "Sponsor Ferrari", "Ferrari"].map(
      (s, i) => word(s, [30, 60, 100, 220, 260, 450][i], 345),
    ),
  );
  // A footnote above the first number is neither a car nor part of its number.
  words.push(word("9", 42, 683.5, 6));
  return { opening, list, words };
}
test("FIA parser covers all eleven teams and excludes FP1 substitutes and superscripts", () => {
  const f = fixture();
  const parsed = parseFIAEntryList(
    [f.words],
    url,
    2026,
    "São Paulo Grand Prix",
    race,
  );
  assert.equal(parsed.drivers.length, 22);
  assert.equal(
    new Set(parsed.drivers.map((d) => teamIdentity(d.team))).size,
    11,
  );
  assert.equal(parsed.drivers[0].number, 1);
  assert.ok(!parsed.drivers.some((d) => d.name === "Practice Only"));
});
test("every team can independently confirm a GP replacement and its actual car number", () => {
  for (let team = 0; team < teams.length; team++) {
    const { opening, list } = fixture(),
      i = team * 2,
      before = structuredClone(opening);
    list.drivers[i] = {
      ...list.drivers[i],
      name: `Rookie Team${String.fromCharCode(65 + team)}`,
      number: 70 + team,
    };
    const updates = fiaDriverUpdates(list, opening, opening, 1);
    assert.equal(updates.length, 1, teams[team]);
    assert.equal(updates[0].source, "fia");
    const fixed = applyOfficialDriverUpdates(opening, updates, 2026, race);
    assert.equal(fixed[i].driver_number, 70 + team);
    assert.equal(fixed[i].first_name, "Rookie");
    assert.deepEqual(opening, before);
    assert.equal(fiaDriverUpdates(list, opening, fixed, 1).length, 1);
    assert.throws(
      () => applyOfficialDriverUpdates(opening, updates, 2026, race, opening),
      /disagree/,
    );
    assert.throws(
      () =>
        applyOfficialDriverUpdates(
          opening,
          [{ ...updates[0], meetingKey: 2 }],
          2026,
          race,
        ),
      /meeting/,
    );
  }
});
test("multiple teams can change together while incomplete or inconsistent rosters require review", () => {
  const { opening, list } = fixture();
  list.drivers[0] = { ...list.drivers[0], name: "New McLaren", number: 70 };
  list.drivers[20] = { ...list.drivers[20], name: "New Cadillac", number: 71 };
  const updates = fiaDriverUpdates(list, opening, opening, 1);
  assert.equal(updates.length, 2);
  assert.equal(
    applyOfficialDriverUpdates(opening, updates, 2026, race)[20].first_name,
    "New",
  );
  assert.throws(
    () =>
      fiaDriverUpdates(
        { ...list, drivers: list.drivers.slice(1) },
        opening,
        opening,
        1,
      ),
    /disagree/,
  );
  const wrong = structuredClone(opening);
  wrong[4].last_name = "Unexpected";
  assert.throws(() => fiaDriverUpdates(list, opening, wrong, 1), /disagree/);
});
test("wrong GP, season, weekend, duplicated drivers and truncated tables are rejected", () => {
  const { words } = fixture();
  assert.throws(
    () => parseFIAEntryList([words], url, 2026, "Mexico City Grand Prix", race),
    /event/,
  );
  assert.throws(
    () => parseFIAEntryList([words], url, 2027, "São Paulo Grand Prix", race),
    /season/,
  );
  assert.throws(
    () =>
      parseFIAEntryList(
        [words],
        url,
        2026,
        "São Paulo Grand Prix",
        "2026-11-29T17:00:00Z",
      ),
    /weekend/,
  );
  assert.throws(
    () =>
      parseFIAEntryList(
        [words.filter((w) => w.transform[5] > 450)],
        url,
        2026,
        "São Paulo Grand Prix",
        race,
      ),
    /complete/,
  );
  const duplicate = structuredClone(words);
  duplicate.find((w) => w.str === "Driver PersonB")!.str = "Driver PersonA";
  assert.throws(
    () =>
      parseFIAEntryList([duplicate], url, 2026, "São Paulo Grand Prix", race),
    /unambiguous/,
  );
  assert.throws(
    () =>
      fiaDocumentURL(
        "https://example.com/system/files/decision-document/entry.pdf",
      ),
    /URL/,
  );
});
test("document discovery uses the newest entry list and detects later driver-change decisions", () => {
  const a = (number: number, name: string, link = url) =>
    `<a href="${link}"><div>Doc ${number} - ${name}</div></a>`;
  assert.equal(
    discoverFIAEntryDocument(
      a(13, "Entry List") +
        a(20, "Revised Entry List", url.replace(".pdf", "_v2.pdf")),
    ),
    url.replace(".pdf", "_v2.pdf"),
  );
  assert.throws(
    () =>
      discoverFIAEntryDocument(a(13, "Entry List") + a(14, "Change of Driver")),
    /newer FIA/,
  );
  assert.throws(
    () =>
      discoverFIAEntryDocument(
        a(13, "Entry List") +
          a(13, "Entry List", url.replace(".pdf", "_other.pdf")),
      ),
    /conflicting/,
  );
  assert.equal(
    discoverFIAEntryDocument(a(14, "Free Practice 1 Classification")),
    undefined,
  );
});
test("FIA fetch is event-scoped and source outages or unpublished lists are retryable", async () => {
  const { words } = fixture(),
    calls: string[] = [];
  const index = `<option value="/documents/championships/110/2026/event/S%C3%A3o%20Paulo%20Grand%20Prix">São Paulo Grand Prix</option>`;
  const mock: typeof fetch = async (input) => {
    const value = String(input);
    calls.push(value);
    return new Response(
      value.endsWith("/2026")
        ? index
        : value.endsWith(".pdf")
          ? "%PDF-fixture"
          : `<a href="${url}">Doc 13 - Entry List</a>`,
    );
  };
  const result = await fetchFIAEntryList(2026, "São Paulo Grand Prix", race, {
    fetcher: mock,
    extract: async () => [words],
  });
  assert.equal(result.drivers.length, 22);
  assert.equal(calls.length, 3);
  await assert.rejects(
    fetchFIAEntryList(2026, "São Paulo Grand Prix", race, {
      fetcher: async () => new Response("down", { status: 503 }),
    }),
    /unavailable/,
  );
  await assert.rejects(
    fetchFIAEntryList(2026, "São Paulo Grand Prix", race, {
      fetcher: async (input) =>
        new Response(String(input).endsWith("/2026") ? index : "Not published"),
    }),
    /not published/,
  );
});
test("real FIA PDF extracts all race entries, actual car numbers and replacement identity", async () => {
  const data = await readFile(
    new URL("./fixtures/fia-2026-brazil-entry-list.pdf", import.meta.url),
  );
  const result = parseFIAEntryList(
    await extractFIAPDF(data),
    url,
    2026,
    "São Paulo Grand Prix",
    race,
  );
  assert.equal(result.drivers.length, 22);
  assert.deepEqual(
    result.drivers
      .filter((d) => /Haas/.test(d.team))
      .map((d) => [d.number, d.name]),
    [
      [51, "Rafael Camara"],
      [87, "Oliver Bearman"],
    ],
  );
  for (const [code, number] of [
    ["PIA", 81],
    ["LEC", 16],
    ["HUL", 27],
    ["GAS", 10],
  ] as const)
    assert.equal(result.drivers.find((d) => d.code === code)!.number, number);
  assert.ok(!result.drivers.some((d) => d.code === "FOR"));
  await assert.rejects(extractFIAPDF(new Uint8Array([1, 2, 3])), /PDF/);
});

test("FIA dates support month boundaries and the local date of a night race", () => {
  const month = fixture().words;
  month.find((w) => w.str === "06 – 08 November 2026")!.str =
    "30 October – 01 November 2026";
  assert.equal(
    parseFIAEntryList(
      [month],
      url,
      2026,
      "São Paulo Grand Prix",
      "2026-11-01T17:00:00Z",
    ).startsOn,
    "2026-10-30",
  );
  const night = fixture().words;
  night.find((w) => w.str === "2026 SÃO PAULO GRAND PRIX")!.str =
    "2026 LAS VEGAS GRAND PRIX";
  night.find((w) => w.str === "06 – 08 November 2026")!.str =
    "19 – 21 November 2026";
  const start = "2026-11-22T06:00:00Z";
  const list = parseFIAEntryList(
    [night],
    url,
    2026,
    "Las Vegas Grand Prix",
    start,
    "-08:00:00",
  );
  assert.equal(list.endsOn, "2026-11-21");
  assert.throws(
    () => parseFIAEntryList([night], url, 2026, "Las Vegas Grand Prix", start),
    /weekend/,
  );
  const { opening } = fixture();
  list.drivers[0] = { ...list.drivers[0], name: "Night Reserve", number: 51 };
  assert.equal(
    applyOfficialDriverUpdates(
      opening,
      fiaDriverUpdates(list, opening, opening, 1),
      2026,
      start,
    )[0].driver_number,
    51,
  );
});
