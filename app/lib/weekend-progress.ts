import type { Event } from "./model";

/** Keep all five stages visible even when the calendar has unconfirmed times. */
export function weekendSessions(e: Event) {
  const isSprint = Boolean(e.hasSprint || e.sprintQualifying || e.sprintRace);
  return [
    { label: "FP1", time: e.practice, published: false },
    ...(isSprint ? [
      { label: "Sprint Quali", time: e.sprintQualifying || "", published: Boolean(e.sprint?.published) },
      { label: "Sprint Race", time: e.sprintRace || "", published: Boolean(e.sprint?.published) },
    ] : [
      { label: "FP2", time: e.practice2 || "", published: false },
      { label: "FP3", time: e.practice3 || "", published: false },
    ]),
    { label: "Quali", time: e.qualifying, published: Boolean(e.gp?.published) },
    { label: "Race", time: e.race, published: Boolean(e.gp?.published) },
  ];
}
