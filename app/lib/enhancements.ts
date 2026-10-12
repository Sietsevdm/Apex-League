import { State, Event, Result, Picks, locked, standings, score } from "./model";

export type Replacement = {
  from: string;
  to: string;
  kind: "gp" | "sprint";
  policy: "keep" | "carry";
  note: string;
};
export function mappedPicks(p: Picks, replacements: Replacement[] = []): Picks {
  const map = (id: string) =>
    replacements.find((r) => r.from === id && r.policy === "carry")?.to || id;
  return {
    order: p.order.map(map),
    pole: map(p.pole),
    fastest: map(p.fastest),
    retirement: map(p.retirement),
    dotd: map(p.dotd),
  };
}
export function submissionOverview(
  s: State,
  event: Event,
  kind: "gp" | "sprint",
) {
  return s.users
    .filter((u) => u.active && u.seasonIds.includes(event.seasonId))
    .map((u) => {
      const entry = s.entries.find(
        (p) => p.userId === u.id && p.eventId === event.id && p.kind === kind,
      );
      return {
        userId: u.id,
        name: u.name,
        status: entry?.submitted
          ? "Submitted"
          : locked(event, kind)
            ? "Missed"
            : entry
              ? "Draft"
              : "Not started",
      };
    });
}
export function resultImpact(
  s: State,
  event: Event,
  kind: "gp" | "sprint",
  result: Result,
) {
  const before = standings(s, event.seasonId);
  const next = {
    ...result,
    published: true,
    replacements: event.replacements?.filter((r) => r.kind === kind),
  };
  const after = standings(
    {
      ...s,
      events: s.events.map((e) =>
        e.id === event.id ? { ...e, [kind]: next } : e,
      ),
    },
    event.seasonId,
  );
  return after.map((row) => {
    const old = before.find((x) => x.id === row.id)!;
    const entry = s.entries.find(
      (p) =>
        p.userId === row.id &&
        p.eventId === event.id &&
        p.kind === kind &&
        p.submitted,
    );
    return {
      id: row.id,
      name: row.name,
      before: old.total,
      after: row.total,
      oldRank: old.rank,
      rank: row.rank,
      sessionPoints: entry ? score(entry.picks, next, kind).total : 0,
      delta: row.total - old.total,
    };
  });
}
