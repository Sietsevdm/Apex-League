import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { seed } from "../lib/seed";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `automatic-results-${process.pid}.json`;

async function fixture() {
  const { confirmedResult } = await import("../lib/automatic-results");
  const season = seed(true).seasons[0];
  const rows = season.drivers.slice(0, 12).map((d, i) => ({
    driver: {
      given_name: d.name.split(" ").slice(0, -1).join(" "),
      family_name: d.name.split(" ").at(-1),
    },
    position: i + 1,
    status: "FINISHED",
    laps: 56,
    components: { FLAP: { position: i + 1 } },
  }));
  const race = {
    season: { year: season.year },
    round: { id: "test" },
    code: "R",
    results: rows,
  };
  const qualifying = { ...race, code: "Q" };
  return {
    season,
    rows,
    race,
    qualifying,
    confirmedResult,
    dotd: season.drivers[0].id,
  };
}

test("automatic GP and Sprint confirm every category, excluding lapped finishers, DNS and DSQ from retirements", async () => {
  const { season, rows, race, qualifying, confirmedResult, dotd } =
    await fixture();
  rows[8].status = "LAPPED";
  rows[8].laps = 55;
  rows[9].status = "DID_NOT_START";
  rows[9].laps = 0;
  rows[10].status = "DISQUALIFIED";
  rows[10].laps = 1;
  let result = confirmedResult(race, qualifying, season, "gp", dotd);
  assert.deepEqual(result.retirements, ["none"]);
  assert.equal(result.published, true);
  assert.equal(result.order.length, 10);
  assert.equal(result.dotd, dotd);
  rows[11].status = "RETIRED";
  rows[11].laps = 12;
  result = confirmedResult(race, qualifying, season, "gp", dotd);
  assert.deepEqual(result.retirements, [season.drivers[11].id]);
  const sprint = confirmedResult(
    { ...race, code: "SR" },
    { ...qualifying, code: "SQ" },
    season,
    "sprint",
  );
  assert.equal(sprint.order.length, 8);
  assert.equal(sprint.dotd, "");
  assert.equal(sprint.pole, dotd);
});

test("missing awards, mismatched sessions, unknown statuses and ambiguous first retirements remain pending", async () => {
  const { season, rows, race, qualifying, confirmedResult, dotd } =
    await fixture();
  assert.throws(() => confirmedResult(race, qualifying, season, "gp"), /award/);
  assert.throws(
    () =>
      confirmedResult(race, { ...qualifying, code: "SQ" }, season, "gp", dotd),
    /identity/,
  );
  rows[10].status = "UNKNOWN";
  assert.throws(
    () => confirmedResult(race, qualifying, season, "gp", dotd),
    /status/,
  );
  rows[10].status = rows[11].status = "RETIRED";
  rows[10].laps = rows[11].laps = 5;
  assert.throws(
    () => confirmedResult(race, qualifying, season, "gp", dotd),
    /ambiguous/,
  );
});

test("official award parser matches the exact event, tolerates markup and rejects missing awards", async () => {
  const { awardWinner } = await import("../lib/automatic-results");
  const { season } = await fixture();
  const name = season.drivers[0].name.replace(/ /g, "&nbsp;");
  const html = `<table><tr><td><a><svg><title>Flag of United States of America</title></svg>United States</a></td><td><b>${name}</b> ABC</td></tr></table>`;
  assert.equal(
    awardWinner(html, "United States", season),
    season.drivers[0].id,
  );
  assert.equal(awardWinner(html, "Miami", season), "");
});

test("scheduler catches up, retries failures, avoids duplicate publication and rejects concurrent organiser changes", async () => {
  const { syncDueResults } = await import("../lib/automatic-results");
  const { transaction } = await import("../lib/store");
  const { season, race, qualifying, confirmedResult, dotd } = await fixture();
  const result = confirmedResult(race, qualifying, season, "gp", dotd);
  const now = Date.parse("2030-01-10T00:00:00Z");
  await transaction((s) => {
    s.seasons = [season];
    s.events = [
      {
        ...s.events[0],
        id: "catchup",
        seasonId: season.id,
        providerRound: 1,
        practiceRound: false,
        qualifying: "2030-01-01T00:00:00Z",
        race: "2030-01-02T00:00:00Z",
        sprintRace: "",
        gp: undefined,
        gpDraft: undefined,
        resultSync: undefined,
      },
    ];
  });
  try {
    assert.equal(
      (
        await syncDueResults(async () => {
          throw new Error("Not yet available");
        }, now)
      )[0].status,
      "waiting",
    );
    assert.deepEqual(await syncDueResults(async () => result, now + 1000), []);
    const changed = await syncDueResults(async () => {
      await transaction((s) => {
        s.events[0].focal = 15;
      });
      return result;
    }, now + 3600000);
    assert.equal(changed[0].status, "skipped");
    assert.equal(
      (await syncDueResults(async () => result, now + 7200000))[0].status,
      "published",
    );
    assert.deepEqual(
      await syncDueResults(async () => result, now + 10800000),
      [],
    );
    const state = await transaction((s) => s);
    assert.equal(
      state.events[0].gp?.provenance?.confirmedBy,
      "Automatic results",
    );
    assert.equal(
      state.audit.filter((x) => x.actor === "Automatic results").length,
      1,
    );
    assert.equal(state.events[0].gp?.published, true);
  } finally {
    await fs.unlink(`.data/${process.env.DEMO_DATA_FILE}`).catch(() => {});
  }
});
