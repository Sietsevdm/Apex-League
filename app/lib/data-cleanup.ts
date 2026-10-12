import type { State } from "./model";

export function deleteArchivedSeasons(s: State, ids: string[]) {
  if (!ids.length || new Set(ids).size !== ids.length || ids.some((id) => !s.seasons.some((season) => season.id === id && season.archived)))
    throw new Error("Select archived seasons only.");
  removeSeasons(s, new Set(ids));
}
function preservePhotos(s: State, ids: Set<string>) {
  for (const event of s.events.filter((e) => ids.has(e.seasonId) && e.photo && !["/circuit-night.svg", "/circuit-day.svg"].includes(e.photo) && !e.photo.startsWith("/api/images/") && !e.photo.startsWith("/banners/"))) {
    const year = s.seasons.find((season) => season.id === event.seasonId)!.year;
    const photos = s.settings.savedBannerPhotos ??= [];
    const old = photos.findIndex((photo) => photo.year === year && photo.name === event.name && photo.circuit === event.circuit);
    const photo = { year, name: event.name, circuit: event.circuit, photo: event.photo, focal: event.focal, credit: event.credit };
    if (old >= 0) photos[old] = photo; else photos.push(photo);
  }
}
function removeSeasons(s: State, ids: Set<string>) {
  preservePhotos(s, ids);
  const events = new Set(s.events.filter((e) => ids.has(e.seasonId)).map((e) => e.id));
  s.seasons = s.seasons.filter((season) => !ids.has(season.id));
  s.events = s.events.filter((e) => !ids.has(e.seasonId));
  s.entries = s.entries.filter((e) => !events.has(e.eventId));
  s.receipts = (s.receipts || []).filter((r) => !events.has(r.eventId));
  s.championPicks = s.championPicks.filter((p) => !ids.has(p.seasonId));
  s.users.forEach((u) => { u.seasonIds = u.seasonIds.filter((id) => !ids.has(id)); });
  if (events.has(s.settings.bannerOverride)) s.settings.bannerOverride = "";
}
export function purgeSeasonData(s: State) {
  preservePhotos(s, new Set(s.seasons.map((season) => season.id)));
  s.seasons = [];
  s.events = [];
  s.entries = [];
  s.receipts = [];
  s.championPicks = [];
  s.users.forEach((u) => { u.seasonIds = []; });
  s.settings.bannerOverride = "";
}
