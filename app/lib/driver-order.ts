import type { Driver } from "./model";

/** Display teammates together without changing the stored lineup or saved picks. */
export function driversByConstructor(drivers: readonly Driver[]): Driver[] {
  const compare = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  return [...drivers].sort((a, b) => {
    const teamA = a.team?.trim() || "";
    const teamB = b.team?.trim() || "";
    if (!teamA && teamB) return 1;
    if (teamA && !teamB) return -1;
    return compare.compare(teamA, teamB) || compare.compare(a.name, b.name) || compare.compare(a.id, b.id);
  });
}
