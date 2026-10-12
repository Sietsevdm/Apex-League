import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DriverLabel from "../components/DriverLabel";
import { Season } from "../lib/model";

const season = { drivers: [{ id: "NOR", name: "Lando Norris", team: "McLaren", color: "#FF8700" }] } as Season;

test("driver labels render a finite name and team marker, with safe empty and retirement labels", () => {
  const known = renderToStaticMarkup(createElement(DriverLabel, { season, id: "NOR" }));
  assert.match(known, /Lando Norris/);
  assert.match(known, /background-color:#FF8700/);
  assert.equal((known.match(/class="driver-label"/g) || []).length, 1);
  for (const [id, text] of [["none", "No retirements"], ["missing", "—"], ["", "—"]]) {
    const html = renderToStaticMarkup(createElement(DriverLabel, { season, id }));
    assert.ok(html.includes(text));
    assert.ok(!html.includes("driver-color"));
  }
});
