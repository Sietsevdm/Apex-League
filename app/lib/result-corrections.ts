import { randomUUID } from "node:crypto";
import { score, type State, type Event, type Result } from "./model";

export function resultValues(result: Result) {
  return JSON.stringify({
    order: result.order,
    pole: result.pole,
    fastest: result.fastest,
    retirements: [...result.retirements].sort(),
    dotd: result.dotd,
    voids: [...result.voids].sort(),
    replacements: result.replacements || [],
  });
}
/** Store outcomes and score changes, never prediction contents. */
export function recordCorrection(
  s: State,
  event: Event,
  kind: "gp" | "sprint",
  after: Result,
  organiser: string,
  reason: string,
) {
  const before = event[kind];
  if (
    !before?.published ||
    !after.published ||
    resultValues(before) === resultValues(after)
  )
    return;
  if (!reason.trim())
    throw Object.assign(
      new Error("Enter a reason for correcting published results."),
      { status: 400 },
    );
  const changes = s.users
    .filter((user) => user.seasonIds.includes(event.seasonId))
    .map((user) => {
      const entry = s.entries.find(
        (entry) =>
          entry.eventId === event.id &&
          entry.kind === kind &&
          entry.userId === user.id &&
          entry.submitted,
      );
      return {
        userId: user.id,
        name: user.name,
        before: entry ? score(entry.picks, before, kind).total : 0,
        after: entry ? score(entry.picks, after, kind).total : 0,
      };
    })
    .filter((change) => change.before !== change.after);
  (s.resultCorrections ||= []).unshift({
    id: randomUUID(),
    eventId: event.id,
    seasonId: event.seasonId,
    kind,
    date: new Date().toISOString(),
    organiser,
    reason: reason.trim(),
    before: structuredClone(before),
    after: structuredClone(after),
    changes,
  });
}
