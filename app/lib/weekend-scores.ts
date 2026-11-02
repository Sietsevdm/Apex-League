import type { Event } from "./model";

export function weekendScoresReady(event: Event) {
  return (
    !event.practiceRound &&
    Boolean(event.gp?.published) &&
    (!(event.hasSprint || event.sprintQualifying || event.sprintRace) ||
      Boolean(event.sprint?.published))
  );
}
/** Only a new complete weekend queues a notification; edits and legacy results do not. */
export function recordWeekendScores(
  event: Event,
  wasReady: boolean,
  now = Date.now(),
) {
  if (!wasReady && weekendScoresReady(event) && !event.scoresPublishedAt)
    event.scoresPublishedAt = new Date(now).toISOString();
}
