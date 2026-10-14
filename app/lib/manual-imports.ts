import type { State, User } from "./model";

export type ImportAction =
  "calendarImport" | "previousYearLineup" | "resultsImport";
type ImportRequest = {
  action: ImportAction;
  seasonId?: string;
  eventId?: string;
  kind?: string;
};
function reject(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
function target(s: State, request: ImportRequest) {
  const event =
    request.action === "resultsImport"
      ? s.events.find((e) => e.id === request.eventId)
      : undefined;
  const season = s.seasons.find(
    (season) => season.id === (event?.seasonId || request.seasonId),
  );
  if (!season || (request.action === "resultsImport" && !event))
    reject("Unknown season or event.");
  if (
    request.action === "previousYearLineup" &&
    (season.archived || season.drivers.length)
  )
    reject("Choose an active season with an empty lineup.");
  const round = event
    ? event.providerRound || Number(event.id.split("-").at(-1))
    : undefined;
  if (request.action === "resultsImport" && !Number.isInteger(round))
    reject("Automatic imports require an event imported from the calendar.");
  return {
    seasonId: season.id,
    year: season.year,
    round,
    // Changes to schedule, lineup, publication or archive state require a fresh import.
    fingerprint: JSON.stringify({
      season,
      events:
        request.action === "calendarImport"
          ? s.events.filter((e) => e.seasonId === season.id)
          : event,
    }),
  };
}
export function importSnapshot(s: State, user: User, request: ImportRequest) {
  return {
    request,
    actorId: user.id,
    actorVersion: user.version,
    ...target(s, request),
  };
}
export function validateImportSnapshot(
  s: State,
  user: User,
  snapshot: ReturnType<typeof importSnapshot>,
) {
  if (
    user.id !== snapshot.actorId ||
    user.version !== snapshot.actorVersion ||
    user.role !== "admin"
  )
    reject("Your access changed while importing. Please sign in again.", 403);
  let current: ReturnType<typeof target>;
  try {
    current = target(s, snapshot.request);
  } catch {
    reject(
      "The season or event changed while importing. Refresh and try again.",
      409,
    );
  }
  if (current.fingerprint !== snapshot.fingerprint)
    reject(
      "The season or event changed while importing. Refresh and try again.",
      409,
    );
}
