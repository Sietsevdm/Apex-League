import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  factPacks,
  factsForEvent,
  chooseFact,
  createFactPicker,
} from "../lib/gp-facts";
import { bannerEvent } from "../lib/model";
import { seed } from "../lib/seed";
import Home from "../components/screens/Home";

test("fact bank covers 27 distinct venues with 324 sourced, unique facts", () => {
  assert.equal(factPacks.length, 27);
  const facts = factPacks.flatMap((p) => p.facts);
  assert.equal(facts.length, 324);
  assert.equal(new Set(facts.map((f) => f.id)).size, facts.length);
  assert.equal(new Set(facts.map((f) => f.text)).size, facts.length);
  for (const pack of factPacks) {
    assert.ok(pack.facts.length >= 12);
    for (const fact of pack.facts) {
      const url = new URL(fact.source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(fact.source.title.length > 0);
      assert.ok(fact.text.length > 20 && fact.text.length < 250);
      assert.ok(!/[<>]/.test(fact.text));
    }
  }
});

test("circuit identity keeps Spain/Madrid/Barcelona and Italian venues separate", () => {
  const event = (
    circuit: string,
    name = "Spanish Grand Prix",
    providerCircuitId?: string,
  ) => ({ circuit, name, providerCircuitId, practiceRound: false });
  assert.equal(factsForEvent(event("Madring"))?.key, "madrid");
  assert.equal(
    factsForEvent(event("Circuit de Barcelona-Catalunya"))?.key,
    "barcelona",
  );
  assert.equal(
    factsForEvent(event("Imola", "Italian Grand Prix"))?.key,
    "imola",
  );
  assert.equal(
    factsForEvent(event("Autodromo Nazionale di Monza", "Italian Grand Prix"))
      ?.key,
    "monza",
  );
  assert.equal(factsForEvent(event("", "Japanese Grand Prix"))?.key, "suzuka");
  assert.equal(
    factsForEvent(event("Future Japanese venue", "Japanese Grand Prix")),
    undefined,
  );
  assert.equal(factsForEvent(event("", "Spanish Grand Prix")), undefined);
  assert.equal(
    factsForEvent(event("", "Race", "yas_marina"))?.key,
    "yas-marina",
  );
  assert.equal(
    factsForEvent(event("Autódromo José Carlos Pace", "Race"))?.key,
    "interlagos",
  );
  assert.equal(
    factsForEvent({ ...event("Suzuka"), practiceRound: true }),
    undefined,
  );
});

test("all supported provider circuit IDs resolve to the intended facts", () => {
  const ids = [
    "bahrain",
    "jeddah",
    "albert_park",
    "shanghai",
    "suzuka",
    "miami",
    "villeneuve",
    "monaco",
    "catalunya",
    "silverstone",
    "red_bull_ring",
    "spa",
    "hungaroring",
    "zandvoort",
    "monza",
    "baku",
    "marina_bay",
    "americas",
    "rodriguez",
    "interlagos",
    "vegas",
    "losail",
    "yas_marina",
    "istanbul",
    "portimao",
    "madring",
    "imola",
  ];
  assert.equal(
    new Set(
      ids.map(
        (id) =>
          factsForEvent({
            providerCircuitId: id,
            circuit: "",
            name: "",
            practiceRound: false,
          })?.key,
      ),
    ).size,
    27,
  );
  for (const id of ids)
    assert.ok(
      factsForEvent({
        providerCircuitId: id,
        circuit: "",
        name: "",
        practiceRound: false,
      }),
      id,
    );
});

test("refresh selection excludes the previous fact across the full random range", () => {
  const facts = factPacks[0].facts;
  for (const previous of facts)
    for (const draw of [0, 0.1, 0.5, 0.99, 1]) {
      const next = chooseFact(facts, previous.id, () => draw)!;
      assert.notEqual(next.id, previous.id);
      assert.ok(facts.includes(next));
    }
  assert.equal(
    chooseFact([], undefined, () => 0),
    undefined,
  );
  assert.equal(
    chooseFact([facts[0]], facts[0].id, () => 0),
    facts[0],
  );
});

test("a fact stays fixed through ticking, polling and remounts; a new document chooses a different fact", () => {
  const data = new Map<string, string>();
  let writes = 0;
  const storage = {
    getItem: (key: string) => data.get(key) || null,
    setItem: (key: string, value: string) => {
      writes++;
      data.set(key, value);
    },
  };
  const pack = factPacks.find((p) => p.key === "suzuka")!,
    firstPage = createFactPicker(storage, () => 0);
  const first = firstPage(pack)!;
  for (let i = 0; i < 100; i++) assert.equal(firstPage(pack), first);
  assert.equal(writes, 1);
  const secondPage = createFactPicker(storage, () => 0),
    second = secondPage(pack)!;
  assert.notEqual(second.id, first.id);
  const other = secondPage(factPacks[0])!;
  assert.ok(other.id.startsWith("bahrain-"));
  assert.equal(secondPage(pack), second);
  const unavailable = {
    getItem: () => {
      throw new Error("storage blocked");
    },
    setItem: () => {
      throw new Error("storage blocked");
    },
  };
  const blocked = createFactPicker(unavailable, () => 0.5);
  assert.equal(blocked(pack), blocked(pack));
});

test("fact section follows the banner GP and renders between the banner and championship fight", () => {
  const s = seed(true),
    season = s.seasons[0];
  const event = s.events.find((e) => !e.practiceRound)!;
  event.circuit = "Suzuka";
  event.name = "Japanese Grand Prix";
  s.settings.bannerOverride = event.id;
  const chosen = bannerEvent(s, season.id)!;
  assert.equal(factsForEvent(chosen)?.key, "suzuka");
  const html = renderToStaticMarkup(
    createElement(Home, { s, season, meId: s.users[0].id, go: () => {} }),
  );
  const banner = html.indexOf('class="hero hero-weekend"'),
    fact = html.indexOf('class="panel gp-fact"'),
    standings = html.indexOf("The championship fight");
  assert.ok(banner >= 0 && fact > banner && standings > fact);
  assert.match(html, /Did you know\?/);
  event.circuit = "Custom unknown track";
  const fallback = renderToStaticMarkup(
    createElement(Home, { s, season, meId: s.users[0].id, go: () => {} }),
  );
  assert.ok(!fallback.includes('class="panel gp-fact"'));
});
