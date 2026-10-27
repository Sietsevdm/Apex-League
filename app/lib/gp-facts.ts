import type { Event } from "./model";
import { factPacks, type FactPack, type GrandPrixFact } from "./gp-facts-data";
export { factPacks } from "./gp-facts-data";
export type { FactPack, GrandPrixFact } from "./gp-facts-data";
const normal = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Circuit identity wins over race names: Spain and Italy each have multiple venues. */
export function factsForEvent(
  event: Pick<
    Event,
    "providerCircuitId" | "circuit" | "name" | "practiceRound"
  >,
): FactPack | undefined {
  if (event.practiceRound) return;
  for (const value of [event.providerCircuitId, event.circuit]) {
    if (!value) continue;
    const match = factPacks.find((pack) =>
      pack.circuits.some((alias) => normal(alias) === normal(value)),
    );
    if (match) return match;
  }
  // Do not guess between venues when an unrecognised circuit is explicitly supplied.
  if (event.providerCircuitId || event.circuit) return;
  return factPacks.find((pack) =>
    pack.races.some((alias) => normal(alias) === normal(event.name)),
  );
}

export function chooseFact(
  facts: readonly GrandPrixFact[],
  previousId?: string | null,
  random = Math.random,
) {
  const choices = facts.filter((f) => f.id !== previousId);
  const available = choices.length ? choices : facts;
  if (!available.length) return;
  const value = random();
  const fraction = Number.isFinite(value)
    ? Math.max(0, Math.min(value, 1 - Number.EPSILON))
    : 0;
  return available[Math.floor(fraction * available.length)];
}
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
/** One choice per document visit. Remounts, Strict Mode and polling must not reroll it. */
export function createFactPicker(storage?: Storage, random = Math.random) {
  const visits = new Map<string, GrandPrixFact>();
  return (pack: FactPack) => {
    const existing = visits.get(pack.key);
    if (existing) return existing;
    const key = `apex:gp-fact:last:${pack.key}`;
    let previous: string | null = null;
    try {
      previous = storage?.getItem(key) || null;
    } catch {
      /* Private browsers can disable storage. */
    }
    const fact = chooseFact(pack.facts, previous, random);
    if (fact) {
      visits.set(pack.key, fact);
      try {
        storage?.setItem(key, fact.id);
      } catch {
        /* Showing a fact must not depend on storage. */
      }
    }
    return fact;
  };
}
