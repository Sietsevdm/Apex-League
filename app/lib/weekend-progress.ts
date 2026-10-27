import type { Event } from "./model";

/** Keep all five stages visible even when the calendar has unconfirmed times. */
export function weekendSessions(e: Event) {
  const isSprint = Boolean(e.hasSprint || e.sprintQualifying || e.sprintRace);
  return [
    { label: "FP1", time: e.practice, published: false },
    ...(isSprint
      ? [
          {
            label: "Sprint Quali",
            time: e.sprintQualifying || "",
            published: Boolean(e.sprint?.published),
          },
          {
            label: "Sprint Race",
            time: e.sprintRace || "",
            published: Boolean(e.sprint?.published),
          },
        ]
      : [
          { label: "FP2", time: e.practice2 || "", published: false },
          { label: "FP3", time: e.practice3 || "", published: false },
        ]),
    { label: "Quali", time: e.qualifying, published: Boolean(e.gp?.published) },
    { label: "Race", time: e.race, published: Boolean(e.gp?.published) },
  ];
}

/** Calendar-based estimates, not live timing: do not fill through overnight gaps. */
export function weekendProgress(e: Event, now: number) {
  const sessions = weekendSessions(e);
  return sessions.map((session, i) => {
    const start = Date.parse(session.time);
    const minutes =
      session.label === "Race"
        ? 120
        : session.label === "Sprint Race"
          ? 30
          : 60;
    const next = sessions
      .slice(i + 1)
      .map((s) => Date.parse(s.time))
      .find((t) => t > start);
    const end = Math.min(start + minutes * 60_000, next ?? Infinity);
    const done = session.published || (Number.isFinite(start) && now >= end);
    const progress = done
      ? 1
      : Number.isFinite(start)
        ? Math.max(0, Math.min(1, (now - start) / (end - start)))
        : 0;
    return {
      ...session,
      done,
      progress,
      running: !done && Number.isFinite(start) && now >= start,
    };
  });
}
