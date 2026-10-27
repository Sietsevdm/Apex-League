# Version 0.8.21

Weekend forecasts now work with live data in production. Open the weather badge on the race banner to see temperature, precipitation probability and wind for qualifying, race, Sprint and practice sessions. Data comes from Open-Meteo at the circuit coordinates, matched to the UTC hour containing each scheduled session start. The race outlook follows the real race-start forecast, and the panel shows its source and last-fetch time.

The sample forecast and fixed weather narrative are removed. Sessions already started, unconfirmed session times, dates outside the provider's forecast coverage, disabled weather and missing/provider data show explicit messages without fabricated values. Forecasts cover up to 16 days, depending on actual hourly availability. Session timestamps display in the viewer's timezone; precipitation probability describes the start hour rather than the whole session.

Forecasts load on opening the panel and refresh every 15 minutes while visible and online. Requests cancel on close/navigation, old data expires, shared caches deduplicate provider traffic and failures retry. Existing league membership/ownership checks protect forecast access. Existing current-weather banners remain available independently of the forecast request.

All 113 tests and TypeScript checks pass. The production build passes, and a real Suzuka lookup verified upcoming session temperatures, precipitation probabilities and winds. The existing Next.js dependency security advisory remains outstanding.

Update the stack to `ghcr.io/sietsevdm/apex-league:0.8.21` with Re-pull image enabled for app and calendar-worker. Take an encrypted backup and preserve secrets and volumes. No new required settings or container is introduced. Existing `BANNER_WEATHER_ENABLED` and optional `OPEN_METEO_API_KEY` apply. GitHub publication does not install the update on the VPS.
