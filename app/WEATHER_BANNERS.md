# Circuit weather banners

Included in version 0.8.18. Artwork and implementation prepared on 18–19 October 2026.

The overview selects **sunny, cloudy, rainy or night** artwork for its displayed circuit. All 24 included circuit scenes have four versions. Existing day/night scenes are reused where appropriate; other conditions are individual AI weather/lighting edits. These are illustrative artwork, not live circuit photographs.

## Selection and fallback

- The circuit's current daylight flag determines day/night. **Night takes priority**, including during rain; the weather label continues to show the actual condition.
- By day, clear/mainly clear selects sunny; partly cloudy, overcast and fog select cloudy; drizzle, rain, showers and thunderstorms select rainy. Snow uses cloudy artwork and a Snow label.
- Conditions are current model-based weather at the circuit coordinates, not a race-time forecast. The viewer's time zone does not determine the image.
- Archived seasons and practice rounds retain original artwork. Manual uploads, including saved reusable uploads, keep their image. Custom folder base images switch only when corresponding custom weather variants exist.
- Missing coordinates, provider failures, disabled weather or missing variants retain the normal banner. A failed image load falls through to the original background. No prediction, score, deadline, result or saved photo changes.

## Organiser preview and image files

19 October layout update: the overview now uses the approved preview styling, with the open/closed and own GP/Sprint submission badges together at the upper right, a turquoise prediction action, its countdown below, and the weekend tracker anchored at the bottom. Weather occupies the lower right; on narrow screens it sits just above the tracker. All four dedicated summary cards are removed. Position and season points now appear beneath the banner countdown, with player-count and leader-gap context. The championship table fills the overview width. Announcements has its own navigation entry directly below Season archive and shows all organiser messages newest first, including an empty state when none exist. The existing admin message editor is unchanged. The local layout preview is `outputs/weather-preview/weekend-banner-preview.html`. Layout changes are included in version 0.8.18.

In **Admin → Banners**, choose a race and use **Weather image preview** to inspect each condition. The selector is preview-only and never saves an override. Manual uploaded photos retain their image. A standalone local gallery is available in the workspace at `outputs/weather-preview/weather-variants-preview.html`.

Append `-sunny`, `-cloudy`, `-rainy` or `-night` before the image extension, for example `belgian-grand-prix-rainy.webp`. Put custom images in the existing image folder, optionally in a year folder (`2027/`). Normal event/circuit aliases and year precedence apply. Root custom variants work across years; custom year folders apply only to that year. Included `public/banners/2027/` assets are reusable in other seasons. Keep an unsuffixed base image as the fallback. Custom folder images need separate backups.

## Requests and configuration

`GET /api/banner-weather?eventId=...` requires an active signed-in account and access to the season. Its response contains only event ID, weather and an optional image URL. The organiser-only `preview=sunny|cloudy|rainy|night` query returns artwork without a weather request or state write. HTTP responses are private/no-store.

Weather loads separately from league loading and saving. The visible overview requests immediately and refreshes every 15 minutes while visible and online. Reads abort when hidden/offline or unmounted; old event/account/photo responses are ignored. Server processes share bounded caches and concurrent request deduplication: 15 minutes for weather, 24 hours for locations and one minute after a failure. Failed refreshes discard stale weather; the client drops weather older than 30 minutes. Caches are temporary and do not write league data.

Calendar imports retain validated latitude/longitude and update existing events. Old calendars resolve coordinates by circuit ID from the calendar provider, cached for 24 hours. There is no city-name geocoding. Each provider request times out after five seconds. Unknown/unpublished circuit coordinates remain unavailable until the provider supplies them.

No API key is required for Open-Meteo's non-commercial endpoint. Optional `OPEN_METEO_API_KEY` selects its customer endpoint. `BANNER_WEATHER_ENABLED=false` disables automatic weather globally; organiser image previews remain available. Compose forwards both options. Existing stacks use the defaults once this updated app is installed. An Open-Meteo attribution link appears beside the weather label.

Sources: [Open-Meteo documentation and weather codes](https://open-meteo.com/en/docs), [Open-Meteo terms](https://open-meteo.com/en/terms), [Jolpi F1 API](https://api.jolpi.ca/ergast/).

## Artwork provenance and validation

The built-in image-generation tool produced one edit per missing circuit/condition. Prompts preserve camera, framing, circuit geometry, landmarks, buildings, trees and kerbs while changing only weather and lighting. Sunny uses clear daylight/dry asphalt; cloudy uses overcast diffuse light/dry asphalt; rainy uses grey skies, rain haze and reflective wet asphalt; night uses a dark sky and existing circuit/building lights. Prompts request no added cars, people, text, logos or structures. Exact prompts and source/output paths are recorded locally in `work/weather-image-manifest.json`. Packaging converts PNG artwork to WebP without changing its composition.

Tests cover daylight/condition mapping, invalid/stale responses, coordinates and calendar merging, caching/deduplication/recovery, hidden-page refreshes, circuit/year/condition matching, manual photos, authenticated access, organiser-only previews and four-image coverage per circuit. Run `npm run check`, `npm test` and `npm run build` from the app directory.

Verified on 18 October 2026: all 91 tests, TypeScript and the production build pass. The Windows sandbox initially blocked generated build junctions; the same build passed with normal host permissions. A real end-to-end Spa lookup resolved the circuit coordinates and returned current night/cloudy conditions from Open-Meteo. All 96 packaged images were visually reviewed on four contact sheets. The standalone gallery's 96 circuit/condition selections, file paths and labels were checked programmatically. Browser interaction/layout verification remains limited because this session's browser tool could not access the desktop preview; responsive styles are included for narrow screens.

19 October compact-height follow-up: reduced the banner minimum height from 543 to 485 pixels on desktop and 600 to 550 pixels on narrow screens, closing excess space between season statistics and the bottom tracker. Content can still expand the banner to prevent clipping. Both the app and local preview use the compact sizing.
