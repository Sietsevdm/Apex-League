# OpenF1 race data integration

## Sources

OpenF1 is the sole live F1 API for calendar/session times, race driver/team lists, GP replacements, classifications, qualifying and Sprint qualifying, lap times, race control and retirement telemetry. Formula1.com supplies the annual Driver of the Day award table. No live Jolpica calls remain. Open-Meteo continues to supply weather forecasts; OpenF1's session observations cannot forecast an upcoming weekend.

Historical OpenF1 data from 2023 onwards needs no API key. The app checks completed sessions, not subscription-only live data. Older seasons remain stored/playable but require manual calendar/lineup/result setup. Calendars may be available before driver lists; the previous-year lineup tool remains available. No new secret, environment variable or database migration is needed.

## Identity and compatibility

`openf1.ts` owns request pacing (at least 2.2 seconds per request per server process), up to three attempts for connection failures, 20-second timeouts and HTTP 429/500/502/503/504, with Retry-After cooldowns and response validation. OpenF1's exact 404 `No results found.` response is treated as empty data, not a successful classification. Other HTTP/format errors remain visible and retryable.

`provider.ts` imports meetings and named sessions; test meetings without a Race session are excluded. Cancelled meetings are retained with a review message. New records store `openf1MeetingKey`; existing events match through legacy circuit IDs and retain their event IDs, entries, receipts, published results, photos, deadlines and manual overrides. Round numbers are informational and may differ when a provider includes cancelled rounds; result matching never trusts the round number alone. Before calendar refresh has stored the meeting key, legacy results match a unique circuit and race date within three days. Larger manual date changes require calendar refresh/organiser review.

`openf1-circuits.json` is bundled compatibility metadata connecting OpenF1 circuit keys to existing artwork/facts identifiers, full circuit names and weather coordinates. It was assembled on 2 November 2026 from the existing 2026/2027 calendar metadata and OpenF1 circuit keys. It is not another live API dependency. Unmapped venues use OpenF1's name and identifier; missing weather coordinates are unavailable rather than guessed.

Drivers match uniquely by normalised full name, then unique family name, within the matched session's driver list. Saved league IDs and manually entered teams/colors are preserved. Car numbers are never used as cross-season driver identities. New imported driver IDs derive from names. Opening-round classification supports legacy driver IDs/name variants. Replacements compare complete GP-only OpenF1 race driver lists and retain existing manual policy and concurrency checks.

## Results and retirement order

`openf1-results.ts` validates meeting/session identities, GP versus Sprint, driver uniqueness and complete 20-24-car classifications. Pole comes from qualifying position 1, not a penalty-adjusted grid. Fastest lap uses positive recorded race lap durations excluding DNS/DSQ and race-control-deleted laps; reinstatement messages restore a lap. Unrecognised deletion messages require review. The driver's lap number is parsed from the message, not the leader's lap field. GP Driver of the Day matches the provider meeting name/circuit to the official annual award table, even if an organiser renamed the event. Sprint has no Driver of the Day.

Retirement candidates are DNF entries excluding DNS and DSQ. For candidates that could still be first, the app checks a bounded telemetry window starting up to one minute before the final lap start and ending six minutes afterwards. It requires observed powered movement, then a stop with at least 30 seconds of stationary observations and no gaps over two seconds. Last-moving/first-stationary timestamps form an uncertainty interval. A separate query checks for later movement through the session's observed end, including lap timings for delayed/red-flagged races. Cars that completed a later lap after an established stop cannot be the first permanent retirement. Overlapping intervals or less than a two-second separation require review; the code does not guess a tie or use classification rank as retirement order. Missing data or later movement remains reviewable. Some races will still require an organiser.

The full-result validator, hourly retries, replacement gating, drafts, leases, snapshot checks, audit trail and scoring remain in place. Previously published results are never automatically rewritten. Manual Fetch imports only classification, pole and fastest lap; it preserves organiser-entered retirement, award and void selections. The calendar worker allows up to nine minutes per check because public API pacing can make catch-up checks slower.

## Verification

All 151 automated tests and the production build pass. Live read-only verification on 2 November 2026 confirmed a complete Mexico GP outcome with Fernando Alonso as first retirement and Max Verstappen as Driver of the Day. A completed Singapore Sprint also produced a complete eight-driver result, Sprint qualifying pole, fastest lap and first retirement, without an award request. No live league data was written during verification.

## References

- https://openf1.org/docs/
- https://www.formula1.com/en/results/2026/awards/driver-of-the-day
- `../docs/results-investigation-2026-11-02.md` for the original same-lap failure.

## Calendar recovery - 8 November 2026

Successful calendar checks remain daily. Failed checks are eligible on the next hourly worker pass. Permanent HTTP failures are reported without immediate retries. Temporary errors have at most three request attempts; cooldowns longer than one minute are reported rather than holding a request open, and subsequent requests respect the learned cooldown. Manual Check now retains a valid calendar when the separate driver refresh fails. Both manual and automatic checks preserve the existing driver list in that case and record a warning. Empty or non-Error failures receive a fallback message; worker calendar-error outcomes include the saved reason. A legacy Check failed state without a reason displays guidance to retry for a fresh diagnostic.

Verified the live 2026 importer and full background check on 8 November: 25 events and 24 drivers in isolated demo storage. No access to the deployed league's private error state or worker logs was available, so this does not establish the precise cause of its historical failed check.
