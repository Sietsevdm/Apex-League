import { driverIdentity } from "./fia-entry-list";

export const formula1RosterURL = "https://www.formula1.com/en/drivers";

export type Formula1Roster = {
  source: "formula1";
  url: typeof formula1RosterURL;
  year: number;
  drivers: { name: string; team: string; code?: never; number?: never }[];
};

export function parseFormula1Roster(html: string, year: number): Formula1Roster {
  const invalid = () => new Error("Formula 1's current roster could not be verified for this season.");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  const heading = main?.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const plain = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!main || !heading || plain(heading) !== `F1 Drivers ${year}`) throw invalid();

  const drivers = new Map<string, Formula1Roster["drivers"][number]>();
  for (const [, slug, card] of main.matchAll(/<a\b[^>]*\bhref=["']\/en\/drivers\/([a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const words = plain(card.replace(/&nbsp;/gi, " ")).split(" ");
    const nameEnd = words.findIndex((_, index) => driverIdentity(words.slice(0, index + 1).join(" ")) === driverIdentity(slug));
    if (nameEnd < 1 || nameEnd >= words.length - 1) continue;
    const driver = { name: words.slice(0, nameEnd + 1).join(" "), team: words.slice(nameEnd + 1).join(" ") };
    // Driver cards can appear twice for different screen sizes.
    const existing = drivers.get(slug);
    if (existing && (existing.name !== driver.name || existing.team !== driver.team)) throw invalid();
    drivers.set(slug, driver);
  }
  if (drivers.size < 20 || drivers.size > 24) throw invalid();
  return { source: "formula1", url: formula1RosterURL, year, drivers: [...drivers.values()] };
}

export async function fetchFormula1Roster(year: number) {
  const response = await fetch(formula1RosterURL, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Formula 1's current roster is unavailable.");
  const html = await response.text();
  if (html.length > 5_000_000) throw new Error("Formula 1's current roster format needs review.");
  return parseFormula1Roster(html, year);
}
