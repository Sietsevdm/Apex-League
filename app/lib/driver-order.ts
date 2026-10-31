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

/** Use the saved team color with whichever text color has stronger WCAG contrast. */
export function driverOptionStyle(color: string) {
  const backgroundColor = /^#[0-9a-f]{6}$/i.test(color) ? color : "#8BA7BD";
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(backgroundColor.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return { backgroundColor, color: luminance > 0.179 ? "#000000" : "#FFFFFF" };
}
