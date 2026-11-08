import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseHaasDriverUpdate,
  fetchOfficialDriverUpdates,
  applyOfficialDriverUpdates,
  updateApplies,
} from "../lib/official-driver-updates";

export const statementURL =
  "https://www.haasf1team.com/news/team-statement-driver-update-0";
export const statement = `<article><p>TGR Haas F1 Team can confirm that Esteban Ocon will no longer compete on its behalf in the 2026 FIA Formula 1 World Championship.</p><p>Rafael C&#226;mara will now partner Ollie Bearman in the team at the São Paulo Grand Prix – hosted at the Autódromo José Carlos Pace, São Paulo, Brazil, 6-8 November 2026 – Round 20 of the 2026 FIA Formula 1 World Championship.</p></article>`;
const raceStart = "2026-11-08T17:00:00Z";
function rows() {
  return [
    { first_name: "Esteban", last_name: "Ocon", driver_number: 31 },
    { first_name: "Oliver", last_name: "Bearman", driver_number: 87 },
  ].map((r) => ({
    ...r,
    team_name: "Haas F1 Team",
    session_key: 11412,
    meeting_key: 1299,
  }));
}
function qualifying() {
  const result = rows();
  result[0] = {
    ...result[0],
    first_name: "Rafael",
    last_name: "Câmara",
    driver_number: 51,
  };
  return result.map((r) => ({ ...r, session_key: 11408 }));
}
test("official statement confirms a named GP appointment only for its dated weekend", () => {
  const update = parseHaasDriverUpdate(statement, statementURL)!;
  assert.equal(update.toName, "Rafael Câmara");
  assert.equal(update.fromName, "Esteban Ocon");
  assert.equal(update.url, statementURL);
  assert.ok(updateApplies(update, 2026, raceStart));
  for (const date of [
    "2026-11-01T17:00:00Z",
    "2026-11-09T00:00:00Z",
    "2026-11-28T17:00:00Z",
  ])
    assert.equal(updateApplies(update, 2026, date), false);
  assert.equal(updateApplies(update, 2027, raceStart), false);
});
test("rumours, future signings, practice seats, contradictory paragraphs and invalid dates do not confirm a GP", () => {
  for (const html of [
    statement.replace("will now partner", "may partner"),
    statement.replace("Grand Prix – hosted", "FP1 session – hosted"),
    statement.replace("Round 20 of the 2026", "Round 20 of the 2027"),
    statement.replace("6-8 November", "31-32 November"),
    statement.replace(
      "</article>",
      statement.match(/<p>TGR.*?<\/p>/)![0] + "</article>",
    ),
    statement.replace(/<article>|<\/article>/g, ""),
    `<article><script>${statement}</script></article>`,
  ])
    assert.equal(parseHaasDriverUpdate(html, statementURL), undefined);
  assert.throws(
    () =>
      parseHaasDriverUpdate(
        statement,
        "https://example.com/news/team-statement-driver-update-0",
      ),
    /URL/,
  );
  assert.throws(
    () => parseHaasDriverUpdate(statement, statementURL + "?copy=1"),
    /URL/,
  );
});
test("discovery follows only bounded official statement links and propagates source outages", async () => {
  const calls: string[] = [];
  const mock: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return new Response(
      url.endsWith("/news")
        ? `<a href="https://example.com/news/team-statement-driver-update">Rumour</a><a href="/news/team-statement-driver-update-0">Statement</a><a href="${statementURL}">Duplicate</a>`
        : statement,
    );
  };
  assert.equal(
    (await fetchOfficialDriverUpdates(2026, raceStart, mock)).length,
    1,
  );
  assert.deepEqual(calls, ["https://www.haasf1team.com/news", statementURL]);
  assert.deepEqual(await fetchOfficialDriverUpdates(2027, raceStart, mock), []);
  await assert.rejects(
    fetchOfficialDriverUpdates(
      2026,
      raceStart,
      async () => new Response("error", { status: 503 }),
    ),
    /unavailable/,
  );
});
test("official appointment fixes stale race entries before qualifying without changing input or future races", () => {
  const update = parseHaasDriverUpdate(statement, statementURL)!,
    before = rows();
  const corrected = applyOfficialDriverUpdates(
    before,
    [update],
    2026,
    raceStart,
  );
  assert.equal(corrected[0].last_name, "Câmara");
  assert.equal(before[0].last_name, "Ocon");
  assert.deepEqual(
    applyOfficialDriverUpdates(before, [update], 2026, "2026-11-29T17:00:00Z"),
    before,
  );
});
test("qualifying corroborates the official GP driver and supplies their actual car number", () => {
  const update = parseHaasDriverUpdate(statement, statementURL)!;
  const corrected = applyOfficialDriverUpdates(
    rows(),
    [update],
    2026,
    raceStart,
    qualifying(),
  );
  assert.equal(corrected[0].driver_number, 51);
  assert.equal(corrected[0].session_key, 11412);
  assert.equal(corrected[0].meeting_key, 1299);
  assert.deepEqual(
    applyOfficialDriverUpdates(
      corrected,
      [update],
      2026,
      raceStart,
      qualifying(),
    ),
    corrected,
  );
  assert.throws(
    () => applyOfficialDriverUpdates(rows(), [update], 2026, raceStart, rows()),
    /disagree/,
  );
  assert.throws(
    () =>
      applyOfficialDriverUpdates(
        [...rows(), rows()[0]],
        [update],
        2026,
        raceStart,
      ),
    /unique/,
  );
  const duplicate = qualifying();
  duplicate[0].driver_number = 87;
  assert.throws(
    () =>
      applyOfficialDriverUpdates(rows(), [update], 2026, raceStart, duplicate),
    /duplicated/,
  );
});
