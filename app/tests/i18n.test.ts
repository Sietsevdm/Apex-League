import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../lib/i18n";
test("Dutch translation covers navigation, circuit information and font controls without changing user content", () => {
  assert.equal(translate("Results & recap", "nl"), "Resultaten & terugblik");
  assert.equal(translate("Know the circuit", "nl"), "Ontdek het circuit");
  assert.equal(translate("Banner titles", "nl"), "Bannertitels");
  assert.equal(
    translate("Let’s race, Sietse.", "nl"),
    "Tijd om te racen, Sietse.",
  );
  assert.equal(
    translate("6 players on the grid", "nl"),
    "6 spelers op de grid",
  );
  assert.equal(translate("Know the circuit", "en"), "Know the circuit");
  assert.equal(translate("Sietse", "nl"), "Sietse");
  const picks = { pole: "NOR", order: ["VER", "NOR"] };
  assert.equal(translate(picks, "nl"), picks);
});
