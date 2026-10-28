# Changelog

## 0.8.22 — 28 October 2026

- Keep the Weekend forecast close control circular on phones: explicit 44 × 44 px sizing, a square aspect ratio and no flex shrinking, preserving the mobile touch target.
- Add three original ImageGen login backgrounds: Race celebration, Night garage and Golden-hour circuit, each with an optimized mobile WebP. Night garage is the user-selected bundled default.
- Extend the login background across the page, keep the existing Apex A mark and league name as a separate responsive overlay, and preserve custom desktop/mobile image uploads. Add a translucent desktop sign-in card and a stacked mobile layout.
- Save a comparison gallery and desktop/mobile screenshots under outputs/login-options; generation prompts and provenance are documented there. All 113 tests, TypeScript and the production build pass. Browser checks confirm a 44 × 44 px circular close button at 390 px and no mobile login overflow. Existing Next.js dependency advisory remains. GitHub release; VPS installation remains a separate step.

## 0.8.21 — 27 October 2026

- Replace the demo-only sample forecast with live Open-Meteo session-start forecasts for all authorised users, including qualifying, race, Sprint and practice sessions.
- Use circuit coordinates and explicit UTC hourly mapping for temperature, precipitation probability and wind. Derive the outlook from real race-start data and show attribution/update time.
- Show clear states for started sessions, unconfirmed times, dates outside forecast coverage, disabled weather and missing/provider data. Remove sample numbers and fixed weather claims.
- Fetch on open, refresh while visible/online, cancel obsolete requests, cache/deduplicate coordinate lookups and forecast requests, and preserve per-league event access.
- Pass all 113 tests, TypeScript and the production build; verify a real Suzuka forecast. Existing Next.js dependency advisory remains documented.


## 0.8.20 — 27 October 2026

- Add a demo-only Weekend forecast design preview opened from the weather badge, with sample session temperatures, rain chances, wind and practice summaries. No live forecast integration is enabled.

- Bind invitation lookup, signup and existing-account joining to one originating league. Hide season discovery without a valid invitation and reject cross-league season substitutions.

- Open invitation URLs directly on the join-account form with the invite filled in and its seasons loaded; retain Sign in for existing members. Show signup errors and open league setup after public league creation.

- Add Create your own league to login alongside invitation joining, with English/Dutch copy, account and league creation in one transaction, Organiser ownership and direct management onboarding.
- Keep invited signups as Players and enforce existing league/site permission boundaries. Validate duplicate emails, passwords and league names without leaving partial accounts.

## 0.8.19 — 27 October 2026

- Add a sourced Did you know? card between the weekend banner and championship fight: 324 researched facts across 27 circuit venues, including distinct Madrid/Barcelona and Monza/Imola banks.
- Show one fact for the banner's GP, retain it during ticking/polling and select a different one after a full browser refresh using per-tab previous-fact memory. Unknown circuits and practice rounds do not get guessed trivia.
- Add six fact-catalogue, matching, rotation and rendering checks (106 total tests passing), primary-source links and maintenance documentation in app/GP_FACTS.md. Local browser refresh, card ordering, console and width checks pass.

- Add Admin, Organiser and Player roles, owned leagues, a league selector, league creation and invitation-based joining for existing accounts. Admin can manage every league; Organiser can manage only their own leagues; Player can play and submit their own predictions.
- Enforce ownership on the server for reads, mutations and provider imports. Isolate league settings, invitations, seasons, events, results and announcements; preserve existing Admin access, predictions and season history in the default league.
- Replace two-tier management tabs with one grouped menu. Separate league membership controls from Admin-only site account/role management, backups, recovery and cleanup.
- Add migration, menu rendering and multi-league permission regressions. All 106 tests, TypeScript and production build pass; the existing Next.js dependency security advisory remains outstanding. The in-app browser verified the overview card and refresh rotation without console errors or width overflow.

- Fill session bars continuously from scheduled start, using estimated durations (60 minutes for practice/qualifying, 30 for Sprint, 120 for GP), with hidden-tab catch-up and reduced-motion support.
- Subdue the green prediction-open badge and replace the text countdown with separate Days/Hrs/Min/Sec tiles.
- Automatically confirm and publish complete GP/Sprint outcomes through the existing hourly worker, including qualifying pole, fastest lap, first retirement and official GP Driver of the Day. Catch up on unpublished past weekends in active seasons. Record provenance, audit and publication announcements; preserve published outcomes and organiser drafts.
- Retry missing data; show organiser diagnostics for unavailable sources, unmatched drivers or ambiguous retirement order. Missing data is never automatically voided.


Newest versions appear first. Versions before 0.8.0 were distributed as local release packages; 0.8.0 onward also publish GitHub releases and Docker images. Historical entries describe behavior at release time; use the deployment guide for current instructions.

## 0.8.18 — 19 October 2026

- Reduce excess vertical space between banner season statistics and the bottom weekend tracker.

- Apply the approved banner layout locally: group prediction/submission badges at the top right, use a turquoise action with its countdown below and anchor the tracker at the bottom.
- Remove the dedicated overview summary cards; show position/season points beneath the banner timer and expand the championship table to full width.
- Move paddock announcements to a dedicated page below Season archive, retaining the existing organiser editor and showing all messages newest first.

- Add sunny, cloudy, rainy and night image variants for all 24 included circuits, selected using current circuit weather and daylight.
- Add cached, authenticated weather retrieval outside league loading/saving, accurate weather labels and provider attribution, automatic fallback and organiser-only image previews.
- Retain circuit coordinates during calendar imports and resolve older calendars by circuit ID. Preserve manual photos, custom image precedence and archived/practice artwork.
- Add 8 automated checks covering the 96-image set, classification, provider cache/recovery, calendar locations, refresh scheduling, matching, access control and manual image preservation. All 91 tests and TypeScript checks pass locally.

## 0.8.17

- Show separate own GP/Sprint submission status with direct session navigation.
- Add standings movement since the previous completed GP weekend, using existing tie-breaks.
- Record published-result corrections with mandatory reasons, before/after outcomes and per-player session-point changes.
- Add hashed, revocable season calendar subscriptions with stable event identifiers and schedule revisions.
- Read league snapshots without writer locks; skip unchanged persistence and cache database initialization.
- Pause the banner ticker while hidden and resynchronize immediately on return.

- Show FP1, FP2, FP3, Quali and Race on normal weekend banners; FP1, Sprint Quali, Sprint Race, Quali and Race on Sprint banners.
- Import/sync FP2 and FP3 session times and allow optional manual editing. Existing records remain compatible; missing times are not estimated.

## 0.8.16

- Add a live banner countdown to the next open GP/Sprint prediction deadline, then race start.
- Show green Predictions open and red Predictions closed badges, plus a Sprint weekend badge.
- Add scheduled weekend session progress and remove the bottom circuit-facts strip.
- Add relative points bars to overview and full standings, highlighting the current player.
- Retain the original head-to-head prediction comparison. Local preview test accounts and predictions are excluded.

## 0.8.15

- Extend private prediction receipts with a season-wide timeline, changes between saves, draft-after-submission history and driver-name snapshots.
- Add per-player GP/Sprint category explanations with predicted/actual drivers and replacement treatment.
- Add championship position and leader-gap charts, accessible data tables and separate title-bonus checkpoints using existing scoring/tie rules.
- Add opt-in browser push reminders through the existing worker, with per-device controls, test notifications, private persistent signing keys and no email server requirement.

## 0.8.14

- Add private conditional refreshes: unchanged authenticated data returns empty HTTP 304 responses without updating the interface.
- Return compact save changes against a matching client revision, with full-response/refetch fallbacks for stale state, changed identity or scope. Preserve privacy and deadline checks.
- Record a fresh live PageSpeed result: mobile 98, desktop 100; all other scored categories 100. Add API/delta regression coverage (64 tests total).

## 0.8.13

- Send selected-season data and lightweight season metadata to the updated client. Fetch archive summaries and historical details on demand, preserving scoring/privacy checks, admin controls and reusable banner matching. Older clients retain their compatible response shape.
- Fetch manual calendar, lineup and results imports outside the league write lock. Revalidate the actor and target before commit; reject concurrent schedule, lineup, archive or publication changes.
- Split player screens and admin tabs into separate on-demand modules. Keep navigation/save response races from replacing the selected season with stale data.
- Exclude local runtime/test data from standalone build tracing.

- Pause automatic league refreshes in hidden/offline tabs, refresh stale data when returning, and prevent overlapping refreshes. Cancel and discard stale reads around saves and logout; keep manual saves running. Add deterministic scheduling/cancellation regression checks.

- Render public login branding, text and responsive image hints in the initial server HTML. Load the league interface only after authentication and fetch registration choices only when requested.
- Read public appearance settings without locking or rewriting league data; return no private league state in initial HTML. Keep API session validation and no-store page responses.
- Preserve custom login copy after logout, avoid deferred-feature page flashes, and add public-rendering/privacy and login-flow regression checks.

## 0.8.12

- Optimize public-page loading: self-host fonts, defer optional features and passkey libraries, and prioritize responsive login artwork. Add the login main landmark and configured font inheritance. See app/PERFORMANCE.md for the baseline, measurements and deployment verification.

- Driver selectors group teammates by constructor alphabetically, then by driver name. Applies to predictions, championship picks, result entry and replacement controls; drivers without a constructor appear last. Saved picks and result positions are unchanged.

## 0.8.11

- Fixed infinite rendering in driver-name labels: the label accidentally rendered itself instead of the driver name, consuming memory and freezing pages that display labels.
- Added a rendering regression check for driver names, team markers, empty selections and no-retirement labels.

## 0.8.10

- Race weekend editing and driver replacement forms load only when opened, reducing work when entering Admin Studio → Race weekends.
- Compatibility workaround for reported browser hangs; the root cause remains unconfirmed and requires verification on affected devices.

## 0.8.9
- Automatic banners switch to the next race on Monday at midnight after the current race weekend, in Europe/Amsterdam time, rather than waiting for first practice.
- Saturday races, gaps between races, daylight saving and unconfirmed session times are handled. Manual overrides and the final season banner remain supported.

## 0.8.8
- Spaced Jolpica requests to stay within the documented burst limit, including multi-request lineup/team imports.
- Includes the lineup, team-marker and registration-text fixes below.

## 0.8.7
- Calendar imports fill empty driver/constructor lineups even after the championship-pick deadline. Background sync also fetches missing lineups.
- Imported drivers include team names/colors where provider results supply constructor associations; manual lineups and saved IDs are preserved.
- Added small team-color bars beside selected drivers and driver names in results/comparisons.
- Replaced the outdated registration deadline message with manual open/closed status, fixing its missing space.
- Empty/unpublished provider lineups explain how to copy or enter the season lineup and offer an optional previous-year import for review.

## 0.8.6
- Registration controls remain visible in Members, including when an archived season is selected. Each active season has manual open/close controls.
- Deletion confirmation accepts the complete name despite case, Unicode or invisible whitespace differences. Added a copy-name control.
- Consolidated documentation and introduced this changelog. Removed local temporary test/preview artifacts and superseded release packages.

## 0.8.5
- Added explicit Delete season on archived cards, requiring name confirmation and a successful encrypted backup.
- Added editable login copy and independent login heading/body font controls.

## 0.8.4
- Added automatic identification of substitutes in existing imported lineups; saved records and results are retained.
- Included the manual registration and grouped admin navigation changes from 0.8.3.

## 0.8.3
- Added manual player registration controls, independent of championship-pick deadlines.
- Grouped admin tools into Overview, Racing, Players and Settings; moved replacement confirmation to Race weekends.
- Scoped replacements to their confirmed race/session; new imports distinguish starters from later substitutes.

## 0.8.2
- Moved archive/reopen and per-season Purge controls inside season cards.
- Removed the separate deletion panel and admin archive/purge controls.
- Purge can target an active season, preserving other seasons, accounts, settings and banners.

## 0.8.1
- Added archive controls to Season Archive and corrected points spacing.
- Reused included banners across season years and improved circuit matching.

## 0.8.0
- Added public versioned AMD64/ARM64 Docker images, automated publication and GitHub releases.
- Added admin update notices and Portainer updates through APEX_IMAGE.

## 0.7.1
- Kept GP maximum at 23; set Sprint maximum to 12 (8 exact positions, pole 2, fastest lap 1, first retirement 1).
- Corrected mobile avatar sizing so badges stay circular.

## 0.7.0
- Included 2027 banners in the app; retained custom-folder and manual image priority.
- Added protected season cleanup with backups and account/settings/banner preservation.
- Moved receipts and copy-previous-picks beside Closes in.
- Changed the calendar to three desktop columns and placed Sprint badges below round numbers; corrected spacing.

## 0.6.0
- Added circuit image-folder matching and responsive login artwork with optional desktop/mobile overrides.

## 0.5.1
- Distributed a patch package following 0.5.0. Separate historical patch notes were not recorded.

## 0.5.0
- Added session-specific driver replacement/scoring policies and audited announcements.
- Added scoring previews, season setup wizard, submission status, app installation guidance and accessibility improvements.

## 0.4.1
- Corrected font-group mappings across player/admin pages and preserved responsive sizes.

## 0.4.0
- Added encrypted backups/recovery, submission receipts, copy-previous-picks and deadline calendar downloads.
- Added passkeys, season awards, result provenance, backup health and launch checks.
- Added detailed typography controls and persistent circuit facts in banners.

## 0.3.0
- Added English/Dutch interface controls, circuit details and adjustable font sizes.

## 0.2.0
- Added daily calendar sync with history and manual checks, plus downloadable/shared results artwork.

## 0.1.0
- Initial self-hosted prediction league with GP/Sprint picks, scoring, admin tools, PostgreSQL and Docker deployment.
