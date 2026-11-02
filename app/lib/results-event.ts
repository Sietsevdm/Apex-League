import { bannerEvent, type State, type Season } from "./model";

/** Explicit race links win; the active season follows the shared weekend. */
export function resultsEvent(s: State, season: Season, initialId = "", now = Date.now()) {
  const events = s.events.filter(e => e.seasonId === season.id);
  return events.find(e => e.id === initialId) ||
    (!season.archived ? bannerEvent(s, season.id, now) : undefined) ||
    events.filter(e => e.gp?.published || e.sprint?.published)
      .sort((a, b) => Date.parse(a.race) - Date.parse(b.race)).at(-1) || events[0];
}
