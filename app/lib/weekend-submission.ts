import type { Event, State } from "./model";
type Summary = { userId: string; status: string };
/** Read only the API's privacy-safe status summary, never infer from filtered picks. */
export function weekendSubmission(s: State, event: Event, userId: string) {
  const overview = (s as State & { submissionOverview?: Record<string, Partial<Record<"gp" | "sprint", Summary[]>>> }).submissionOverview?.[event.id];
  const kinds: ("gp" | "sprint")[] = event.hasSprint || event.sprintQualifying || event.sprintRace ? ["gp", "sprint"] : ["gp"];
  return kinds.map(kind => ({ kind, status: overview?.[kind]?.find(row => row.userId === userId)?.status || "Unavailable" }));
}
