## 0.8.50 — Event-scoped FIA entry-list discovery

Fixed mixed/fallback FIA pages selecting a different GP/year PDF. Document revisions and driver-change decisions are scoped to the requested event before download; missing verified entry lists produce a waiting state and preserve saved lineups. Existing PDF identity, night-race date and roster validation remain. See docs/fia-entry-list-discovery.md.

## 0.8.49 — Production FIA PDF runtime fix

Fixed DOMMatrix import failures by extracting PDFs in a separate native Node process with explicit graphics initialization and runtime dependency packaging. Both production image architectures now run an official FIA PDF fixture check as the application user before publication. Existing lineup data and submissions are preserved. See docs/fia-pdf-runtime.md.

## 0.8.48 — Official FIA lineup refresh

Added a per-weekend/session FIA refresh in Administration > Race weekends > Driver replacements. Verified outgoing drivers leave the prediction options while historical records, existing organiser policies and original submissions remain intact. Saves the official source link and displays timestamped failures without replacing the saved roster. Event editing preserves replacement state. Includes the unified results comparison from 0.8.47. See docs/driver-lineup-refresh.md for use and validation.

## 0.8.47 — Unified results and points

Merged the repeated outcome into the prediction comparison. Added driver team markers, earned-point numbers and matching-row highlights. Source confirmation and correction history remain expandable. Scoring and stored picks are preserved.

## 0.8.46 - All-team weekend driver checks, 8 November 2026

Every team is now checked hourly against the FIA's official entry list for the matched GP and OpenF1. The shared FIA source covers all 11 current teams, recognises their sponsor-name differences, excludes practice-only drivers and reads actual car numbers without superscript footnotes. Explicit weekend/year/meeting checks, local race timezones and latest-document selection prevent applying another event's roster. The earlier Haas announcement check remains supplemental.

Confirmed GP replacements carry existing picks and save a link to the FIA proof. Complete FIA entries can confirm replacements before qualifying even when OpenF1's future race roster is empty; completed qualifying must corroborate the driver and car number. The results importer uses that identity. Current-weekend checks take priority over old unfinished races. Existing manual policies, submissions, receipts, Sprint/championship picks and published results are preserved.

Source outages remain visible and retry hourly; contradictory evidence and newer driver-change decisions require updated official entries or organiser review. Updates depend on official publication, so instant availability cannot be guaranteed. PDF reading and its runtime are included in the app; no new service, key or migration is required. Live read-only verification checked 22 drivers across 11 teams and confirmed Ocon → Câmara with FIA proof. All 183 tests, TypeScript and the production build pass; the packaged PDF runtime also passed. Included in 0.8.46. Details: docs/all-team-driver-checks-2026-11-08.md.

## 0.8.45 - Calendar API recovery, 8 November 2026

Failed calendar checks retry hourly instead of daily. Temporary OpenF1 connection/timeout/server/rate-limit failures get bounded retries with Retry-After support and endpoint-specific errors. Calendar updates survive separate driver refresh failures, keeping the saved lineup and showing a warning. Error capture now covers blank/non-Error failures, the panel shows a visible fallback, and worker logs include failure reasons.

Validation: all 162 tests and production build pass; live isolated background sync imported 25 events and 24 drivers. Existing player walkthrough and score notifications retained. Update both app and calendar-worker to ghcr.io/sietsevdm/apex-league:0.8.45 with Re-pull image enabled after the build succeeds. No VPS installation performed.

## 0.8.43 - Reopenable player walkthrough, 8 November 2026

Added the six-topic English/Dutch guide with automatic first-visit display, permanent menu/top-bar entry points, topic shortcuts and consistent left alignment. Covers submission, GP/Sprint deadlines, reminders, calendars, season picks and scores. Browser-local dismissal; no new server configuration or data migration. TypeScript and all 156 tests pass. User reviewed local preview; automated browser and local production build verification remain restricted. GitHub Actions verifies the release build.

## Player-guide alignment - 8 November 2026

Left-aligned walkthrough topic button contents so number badges and labels line up consistently, including the selected topic. CSS-only change; mobile navigation retains its horizontal layout.

## Local player-guide preview - 6 November 2026

Added a six-topic English/Dutch walkthrough with first-visit display per account/browser, permanent sidebar/top-bar entry points, direct topic selection and relevant-screen shortcuts. Covers actual submission vs drafts, GP/Sprint deadlines, push reminders, iOS installation, calendar subscription vs download, season picks and results privacy. Native modal keyboard behavior; responsive layout. Details: app/PLAYER_GUIDE.md. TypeScript and all 156 tests pass. Browser verification blocked by loopback restrictions and failed preview-panel handoff. Local-only; no publication or VPS changes.

# Changelog

## 0.8.42 - Result status and weekend score notifications, 2 November 2026

Results & scoring now stacks the automatic status, last provider attempt and hourly-check explanation with consistent alignment. Published results hide stale waiting warnings. Checks remain hourly, starting three hours after GP start or one hour after Sprint start; saved organiser drafts and unresolved replacement checks still block automatic publication. Manual Fetch fills the form without publishing.

Newly published complete weekends now queue a push notification for existing opted-in player devices. GP and applicable Sprint must both be published; automatic and manual publication are supported. The existing push worker checks every five minutes. Corrections and repeated checks do not queue another notification. Practice/archived seasons, inactive/non-member accounts, old results and devices subscribing after publication are excluded. Profile copy explains both deadline reminders and weekend scores. No email service or new configuration is needed.

Podium cards now include explicit spaces between POSITION and the rank, and between the score and points.

Standings clarify competition ranking: four tied players at P3 occupy places 3-6, so the next place is P7. Ties use total points, weekend wins, then exact positions; scoring and ranks are unchanged.

Validation: all 156 tests and production build pass. Browser verified aligned single-column status text and last-attempt timestamp, and that published results suppress a stale retirement warning. Push delivery tested with mocked senders, including concurrency, manual/automatic publication, complete Sprint weekends, eligibility and batches beyond 20 devices. No real player notifications sent. Screenshot: outputs/results-status-aligned.png. Approved for GitHub publication as 0.8.42. No VPS installation performed.

## 0.8.41 - OpenF1 migration, 2 November 2026

Replaced live Jolpica race-data requests with OpenF1 for calendars, GP/Sprint results, qualifying, fastest laps, race entries and driver/team lists. Formula1.com remains the Driver of the Day source. Added paced requests, identity checks, deleted-lap handling and telemetry-based retirement order. Existing predictions, IDs, deadlines, organiser drafts and published results are preserved. Unsupported or ambiguous data remains available for manual review. Full details: app/OPENF1.md.

All 151 automated tests and the production build pass. Read-only live verification confirms Mexico GP with Alonso first retirement and Verstappen Driver of the Day, plus a complete Singapore Sprint result. No league records were changed. Approved for GitHub publication as 0.8.41. No VPS installation performed.


## 0.8.40 - Results weekend and provider identity, 2 November 2026

Results & recap follows the shared current weekend and organiser override. Sidebar navigation clears stale race context; explicit links and history retain their event. Archived seasons select the latest dated published GP or Sprint. Automatic results and replacement requests now identify the installed app to Jolpica, matching its documented requirement. Existing publication checks remain in place; no source migration or scoring change.

Validation: all 142 tests and TypeScript pass. Live API access could not be verified due to development hostname resolution. Update both app and calendar-worker using image ghcr.io/sietsevdm/apex-league:0.8.40 after the GitHub build succeeds. No VPS installation performed.


## 0.8.38 - Prediction reset and submission cleanup, 2 November 2026

Added Reset for the selected GP or Sprint prediction form. Draft resets use normal autosave; submitted entries stay counted while cleared edits are rebuilt, and Cancel changes restores the submission. Reset is unavailable after locking, while saving, for non-members or when already empty. Phone action bars align Reset/Cancel above a full-width primary action.

Your next step disappears once all applicable weekend prediction sets are submitted, remaining visible for missing or draft GP/Sprint sets. Against the grid no longer repeats its heading/count when expanded; singular differences use 1 different call.

Validation: all 140 tests and final production build pass. Browser verified clearing all GP categories, incomplete-save prevention, cancellation restoring submitted picks, locked Reset protection and aligned phone controls without overflow. Update the existing Portainer stack to ghcr.io/sietsevdm/apex-league:0.8.38 after its release build succeeds, with Re-pull image enabled; app and calendar-worker update together.


## 0.8.37 - Weekend predictions and player insights, 1 November 2026

Weekend predictions replaces Head to head with one full-width timing-style grid, Everyone / You + rival filters, a focused rival selector and a compact Rival of the weekend recommendation. Compare rival activates the focused grid view. Against the grid shows clear-majority differences in a closed-by-default disclosure, with gold outlines retaining team-color chips and logos. Sidebar labels are explicitly left-aligned when wrapping.

My season gains a Personal bests sub-view for highest weekend score, most exact positions and longest/current scoring streak, using complete published championship weekends. Practice, title bonuses and fully void weekends are excluded. Strict record improvements on the latest completed weekend get a New personal best label. Prediction privacy and scoring remain unchanged. Details: app/PLAYER_INSIGHTS.md.

Validation: all 138 tests and production build pass. Browser checks cover filters, rival selection, private/Sprint states, aligned records and desktop/390/320 px layouts without page overflow. Update the existing Portainer stack to image ghcr.io/sietsevdm/apex-league:0.8.37 after the GitHub release build succeeds, with Re-pull image enabled. Both app and calendar-worker use this image; retain settings and volumes.


## 0.8.35 - Weekend predictions, awards and Results cleanup, 1 November 2026

Reordered Results & recap into weekend/player controls, one score summary with a single GP/Sprint switch and compact winner/leader context, weekend awards, weekend standings, then two closed-by-default detail sections. Removed the four large highlight metric cards and duplicate session/player controls. Share results is now a subdued secondary action. Selected-session publication status sits inside the score summary.

Prediction breakdown retains every scoring category, original/effective replacement picks, actual outcomes, points and session total. Confirmed outcome retains the full classification and result source, with correction history nested inside. Detail sections reset closed when the weekend/session changes. Pending standings show Pending rather than misleading zero scores. Partially published weekends label the points leader rather than a final winner. No scoring, saved prediction or permission change.

Validation: all 131 existing automated tests pass; final TypeScript/production build passes. Browser verified changing player from Sietse (8 points) to Jordan (23), all 15 GP breakdown rows, opening the full classification, Sprint pending state, closed detail reset, desktop and 390 px phone layouts without page overflow, and no console errors. Screenshots outputs/weekend-social/results-clean-desktop.jpg and results-clean-mobile.jpg. Preview remains http://localhost:3008/, isolated weekend-social-preview.json, server session 89544. Documentation and publishing mirror updated. No GitHub publication or VPS installation.


### Weekend prediction grid and weekend awards

Head to head now includes a full submitted-prediction grid with three-letter driver codes, saved team-color backgrounds, local team logos, GP/Sprint categories and horizontally scrolling columns with sticky player names. Existing two-player comparison appears first, with the weekend grid beneath it. Both respect the post-qualifying reveal rule; missing/draft submissions stay neutral. Calendar imports retain provider driver codes when available.

Results & recap now shows non-scoring weekend awards: Boldest correct pick (least popular correct category selection, excluding unanimity), Perfect podium and Biggest comeback (positive championship rank movement from this weekend). Awards wait for every GP/Sprint result, share ties, respect scorer replacements/voids, exclude practice and automatically follow result corrections. Future rounds and championship bonuses do not influence comeback awards. Full behavior and maintenance details: app/WEEKEND_SOCIAL.md.

Validation: all 131 tests, TypeScript and production build pass. Browser verified desktop/390 px phone layouts, eight-player grids, contained scrolling and sticky names, loaded team logos, independent GP/Sprint drafts, hidden/pending/completed states, award explanations and Dutch grid labels; no console errors. Isolated simulated preview: http://localhost:3008/ using weekend-social-preview.json, server session 97459. Screenshots: outputs/weekend-social/. Documentation and publishing source mirror updated. No GitHub publication, release or VPS installation; synced sources untouched.


## 0.8.34 - Head to head current weekend, 1 November 2026

Opening Head to head now selects the same race weekend as the overview banner, using the shared bannerEvent selector. This respects the organiser banner override, keeps a completed race selected until Monday in Europe/Amsterdam, and then advances to the next event. If no non-practice race exists, the first event remains the fallback; an empty calendar retains its existing empty state. Players can still select other weekends manually, and polling does not reset their selection. Included in 0.8.34 for authorised GitHub publication. VPS installation remains separate.


## 0.8.33 - Prediction reveal and readability, 1 November 2026

Submitted GP and Sprint picks now become visible to authorised league members in Results after their respective qualifying session, using scheduled start plus one hour. Edit deadlines remain unchanged. This is a calendar estimate, not live confirmation of qualifying completion; delays and red flags can differ. Published results also permit reveal once locked. Drafts and submission receipts remain private. The Results player selector works before race results publish and explains when picks are still hidden.

Predictions Open and Closed badges both use an opaque dark background. Open uses green text/dot and a matching green border; Closed uses red. Deadline labels now read GP predictions deadline / Sprint predictions deadline, with Dutch equivalents. Standings and finishing-order prediction positions 4 onward use logo teal (#22dcc5); gold/silver/bronze positions 1-3 remain unchanged.

Validation: all 125 tests pass, including API privacy before/after qualifying and independent GP/Sprint reveal boundaries; production build passes. No new browser visual verification. Documentation and publishing source mirror updated. Prepared for authorised GitHub publication as 0.8.33. VPS installation remains separate. Synced sources untouched.


## 0.8.32 — 31 October 2026

### Constructor logos and colors

The Constructors’ champion selector now uses the shared accessible picker with locally bundled team logos, team-color backgrounds and contrasting text in both the menu and selected field. Colors follow saved driver/team settings, matching known team aliases where needed; unknown teams retain a neutral fallback. Constructor values and championship scoring/locking are preserved. TypeScript and production build pass. Browser verified all 11 logos load, 11 constructor options plus the neutral placeholder, and the selected Ferrari field retains its logo and red background. Included in 0.8.32; GitHub publication does not install this update on the VPS.


### Side-by-side calendar tools

The calendar download and subscription tools are now separate equal-width cards side by side on desktop, stacking below 760 px. The former internal divider is removed within this layout, while subscription setup, token privacy and download behavior remain unchanged. TypeScript and production build pass; browser measurements confirm equal card heights and widths aligned on the same desktop row. Included in 0.8.32; VPS installation remains a separate step.


### Compact prediction rows

Removed the redundant Winner/Second place/Position labels above finishing-order pickers, while retaining each picker’s accessible Position label. Rank numbers now center vertically beside the selected driver, and row padding is reduced to remove spare space. Positions 1/2/3 use consistent gold/silver/bronze in prediction rows, standings ranks and podium position labels, including tied standings ranks. Reorder buttons and mobile touch targets remain available. Removed the submission-overview panel from the prediction screen; standings retain privacy-safe GP/Sprint checkmarks. TypeScript and production build pass. Browser verified zero redundant position labels, no submission-overview panel, centered number/field alignment, matching medal colors on predictions/standings and 390 px phone layout without horizontal overflow. Included in 0.8.32; GitHub publication does not install this update on the VPS.


## 0.8.31 — 31 October 2026

### Team-colored selected drivers

Chosen drivers now retain the same saved team-color background and contrasting black/white text as their dropdown options, alongside the existing team logo. Empty and No retirements selections retain neutral styling. Popup neutral rows keep the league surface/text colors rather than inheriting the selected team color. Shared driver pickers apply the appearance consistently without changing saved picks or scoring. TypeScript and production build pass. Browser verified blue Red Bull, orange McLaren and pink Alpine selections, contrasting text, and neutral empty/menu backgrounds. Included in 0.8.31; GitHub publication does not install this update on the VPS.


### Current weekend and standings submission status

The current non-practice weekend is highlighted on the calendar with an accent border and Current race weekend label, using the same event selection and organiser override as the overview. Archived seasons have no current-weekend highlight. Standings now include a Weekend picks column for that event, with separate GP/Sprint icons: checkmark for submitted, draft icon for saved drafts, empty circle for not started, cross for missed and question mark for unavailable summaries. Accessible labels/tooltips name each state. Only the existing API submission-status summary is read; private predictions are never inferred or revealed. The compact overview standings remain unchanged. English/Dutch labels included. All 124 tests, TypeScript and production build pass; local browser verified one Singapore highlight and independent submitted GP/draft Sprint status. Local preview http://127.0.0.1:3007/. Included in 0.8.31; VPS installation remains a separate step.


## 0.8.30 — Security patch, calendar artwork and browser navigation, 31 October 2026

Upgrade Next.js from 16.4.0 to exactly 16.4.3 using the security policy selected by the official upgrade command. Set experimental.agentUpgrade to security for future reminders, preserving existing deployment settings. The working app is outside Git, so it was upgraded in place; publishing branches/commits and open pull requests were checked for duplicates and none matched. Frozen pnpm installation, exact installed version, TypeScript, all 122 tests and production build pass. Production dependency audit reports zero known vulnerabilities at verification time. Browser checks on the patched production app confirm calendar artwork, 12 px schedule times, Back navigation and refresh restoration. Source ZIP: outputs/apex-league-v0.8.30.zip. GitHub publication does not install this update on the VPS.


### Browser Back and Forward

In-app screen changes now create browser history entries. Browser Back/Forward restores the page, race ID, GP/Sprint entry context and league/season data scope without adding another entry; refresh restores the current history location. History stores navigation metadata only, never predictions or credentials, and server authorisation still applies to restored scopes. The initial app entry is replaced rather than duplicated; Back can still leave the site once the first app page is reached. Native phone back/swipe actions use the same browser history; physical-phone gestures were not separately tested. Browser verification covered Calendar → Standings → Back → Overview → Forward, refresh, Administration scope changes and restoring Japanese GP predictions. All 122 tests, TypeScript and production build pass. Next.js security upgrade included below. Local preview http://127.0.0.1:3007/. Included in 0.8.30; VPS installation remains a separate step.


### Calendar circuit artwork

Calendar race cards now fill with each event’s existing matched circuit image, retain the saved vertical focal point, and use a stronger dark gradient behind the text, brighter secondary labels, 12 px semibold session times and subtle text shadows for readability. Action buttons retain their dark backgrounds. Uploaded/matched event images follow the existing banner-resolution rules; missing images use the circuit illustration, and failed loads retain a dark readable card. Images load lazily and are decorative for screen readers. Verified all seven local demo cards load their artwork, desktop three-column layout and 390 px phone layout without horizontal overflow. TypeScript passes. Local preview: http://127.0.0.1:3007/ → Race calendar, using isolated ui-cohesion-preview.json demo data. Screenshots: outputs/calendar-artwork-desktop.png and outputs/calendar-artwork-mobile.png. Included in 0.8.30; VPS installation remains a separate step.


## 0.8.29 — Team logos and colors in driver dropdowns, 31 October 2026

Driver menus now combine locally stored official 2026 team logos with saved team-color row backgrounds and contrasting text. A shared custom picker covers prediction, championship, result and season-management driver selectors and the original-driver replacement selector. It supports arrows, Home/End, typing names, Enter/Space, Escape, Tab and outside-click dismissal, with combobox/listbox semantics and a viewport-contained scrollable menu. Selected drivers retain their team logo; unknown teams use a color marker. Names/team labels and neutral empty/No retirements options remain available. Existing pick IDs and scoring are unchanged. Logo sources: public/team-logos/README.md. Browser checks verified keyboard selection, autosave, all menu logos loading and 390 px phone width without horizontal overflow. All 122 existing tests, TypeScript and production build pass. The existing Next.js security advisory remains outstanding. Prepared for GitHub publication as 0.8.29. GitHub publication does not update the VPS.


## 0.8.28 — 31 October 2026

The existing hourly calendar worker now checks GP race entries from Jolpica, starting seven days before each GP and retrying until results are published. It compares complete opening-round and event race entry lists, confirms a replacement only when exactly one seat changes within the same team, adds missing reserve drivers and carries all GP prediction categories to the replacement for scoring. Saved submissions, receipts, Sprint and championship picks remain unchanged. Existing manual policies take priority, announcements and audit entries are added once, and incomplete/ambiguous lists wait for organiser review. Automatic GP publication waits while a replacement check is unresolved. Practice-only participants never trigger replacements. First-round changes, double-seat changes, team transfers and unrecognised original drivers require manual confirmation. This depends on provider entry publication and is not instant team-announcement monitoring. Manual confirmation remains available, with no Explanation field or required note; previously saved notes remain visible.

Validation: all 122 tests, TypeScript and production build pass. Update both app and calendar worker; GitHub publication does not install this update on the VPS.


## 0.8.27 — 29 October 2026

- Replace the misleading generic webcal action with Google Calendar setup guidance and a named Apple Calendar action. Add manual setup and clipboard-failure fallback, with matching Dutch text.
- Explain that Android Google Calendar requires initial web setup and that creating a subscription URL does not confirm reminders.


### Consistent Apex logo

- Match the default login, sidebar, loading, favicon, installed-app, Apple touch and social-sharing logos to the supplied turquoise square and dark italic A reference.
- Add reusable apex-logo.svg and apex-logo.png assets; use one font-independent vector across default application branding. Preserve custom league logo overrides.


## 0.8.26 — 28 October 2026

- Simplify phone reading order, status badges and countdown; use a full-width prediction action and grouped deadlines/metrics with stronger text contrast.
- Lighten the mobile image overlay without blur so the race artwork remains visible behind the content.
- Keep weather in normal flow on phones and retain desktop positioning. All existing deadlines, timezone labels and actions remain available.
- Reviewed locally at http://localhost:3007/. GitHub publication does not install the update on the VPS. TypeScript and 118 tests pass; browser checks cover 320/390 px phones, desktop, forecast and Sprint navigation.

## 0.8.25 — 28 October 2026

- Match sidebar section-label font size, family, weight, line height and letter spacing, including Race weekend, Your season, Your league and Manage the league.
- Add a weekend score total and GP/Sprint subtotals, with a category table showing the original pick, confirmed result and points earned. Unpublished sessions remain Pending; replacement scoring stays visible.
- Add a specific next-action dashboard message for submitted, draft, missing and locked GP/Sprint picks, with a direct action for the outstanding session.
- Show independent GP and Sprint deadlines with date, year, time, timezone abbreviation and IANA zone. Dates throughout the app respect the player's saved timezone.
- Give organisers an outstanding-only attention list for incomplete calendars, unpublished completed sessions and missing active-player submissions. Counts use the privacy-safe submission overview.
- Add Sign out at the bottom of the sidebar, keeping navigation scrollable independently. Demo sign-in restores its account cookie after signing out.
- Audit every player page, all eleven organiser panels, profile and login/join/create forms on desktop and phone. Raise tiny 7–9 px text to 10 px, make newer text follow Appearance controls, contain prediction-history scrolling and stack narrow-phone result summaries. See app/TYPOGRAPHY_AUDIT.md.
- Validation: 118 tests pass, including dashboard/checklist scenarios and login persistence; TypeScript and production build pass. GitHub publication does not install the update on the VPS. The existing Next.js dependency advisory is still outstanding.

## 0.8.24 — 28 October 2026

- Keep Confirmed outcome driver names on one line by scoping the 18 px rank column and number typography to the first span only; allow the name to fill the remaining row.
- Lighten the Predictions open badge to a restrained green tint and standardize banner badge height, font size, line height, padding and corners. Desktop badges use 30 px height; phone badges share 44 px height to retain touch targets.

- Unify the player interface: consistent card spacing/radii, action sizes, quieter secondary buttons, stronger active navigation and separate race-weekend, season and league groups.
- Standardize submitted/draft/not-started/locked badges with text and icons across the dashboard, prediction form and submission overview. Collapse the submission table so the player's own picks come first.
- Add explicit Edit predictions, Save changes and Cancel changes controls for submitted GP/Sprint entries until the deadline. Keep the last submitted picks while editing, stop submitted entries from becoming autosaved drafts, retain draft autosave and restore saved picks if the deadline passes while editing.
- Explain editable deadlines, draft/submitted confirmations and calendar/results empty states in English and Dutch. Add an isolated interactive local demo with submitted GP, draft Sprint, locked races and empty calendar scenarios. All 115 tests, TypeScript and production build pass. Browser checks cover saved edits, cancellation, incomplete edits, reload persistence, locked controls and mobile width.

- Remove the inherited 1580 px page-width limit from the login shell so the background reaches both desktop edges. Verify 2552 px desktop and 390 px mobile viewports with no horizontal overflow.

- Add Open Graph and large-image Twitter metadata so messaging apps can show an Apex title, description and branded Night garage preview.
- Include an optimized 1200 × 630 public PNG, with the existing Apex mark and Paddock/Grid headline. Read APP_URL at request time so Docker host settings generate the correct absolute image URL.
- Keep share metadata fixed and public, without account, league or invitation details. Verify both WhatsApp and Telegram crawler user agents receive metadata unauthenticated and that the image returns HTTP 200. Five relevant tests, TypeScript and production build pass. GitHub publication does not install the update on the VPS.

## 0.8.23 — 28 October 2026

- Update the default login headline to “Friends in the Paddock.” and “Rivals on the Grid.”, emphasizing the second line in turquoise italics.
- Match Branding editor placeholders and Dutch translations, retaining saved custom login copy.
- Includes the Night garage login background, transparent panel and mobile forecast close fix from 0.8.22. No settings or database migration required.

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

1 November 2026 follow-up: Open badge changed to green (#54e3a2) text/dot with a matching border; dark background retained. Verified CSS selectors and publishing mirror. Included in 0.8.33; VPS installation remains separate.

Head to head verification: TypeScript and all 11 existing scoring/selection tests pass, including Amsterdam Monday rollover and organiser override.

1 November 2026 preview refinement: moved Weekend prediction grid below the Head to head comparison. Shared filters and prediction privacy remain unchanged. Local preview only.

1 November 2026 - Results alignment verification (local preview): removed the player selector's inherited 8 px top margin (both selectors now 45 px high with matching top edges). Scoped zero padding correctly on detail cards to remove double indentation. Equal desktop detail columns, 72 px flex-aligned disclosure headers with explicit arrows/status alignment, consistent 24 px desktop/18 px phone body padding, right-aligned points headings and values, baseline-aligned outcome labels/values, and correctly scoped correction-history padding. Details stack below 1100 px. Browser verified desktop 1506 px, tablet 1024 px, phones 390/320 px, expanded details and pending Sprint labels; equal award-card dimensions and winner baselines, no label overlap, no page overflow or console errors. Production build passes. Screenshots: outputs/weekend-social/results-alignment-desktop.jpg and results-alignment-mobile.jpg. Preview http://localhost:3008/, server session 50437. No publication or VPS installation.

## 0.8.36 - Season picks alignment, 1 November 2026

Fixed the screenshot-reported Season picks spacing: equal-width/equal-height champion cards with aligned selector baselines, consistent card gaps and a separate save-action row with 24 px desktop / 20 px phone clearance before the title-contenders panel. The contenders table now scrolls inside its card when needed. Locked-state controls remain disabled; no saved picks or deadlines change. Production build passes. Browser verified matching desktop card widths (577.5 px) and picker tops, matching 343 px phone cards, exact 24/20 px button-to-panel gaps, disabled locked save controls and no phone overflow. Screenshot outputs/weekend-social/season-picks-aligned-mobile.jpg. Local preview http://localhost:3008/, session 68610; only its named demo dataset cutoff was set to the past to reproduce the locked screenshot. No live data changes, publication or VPS installation.

## Unreleased - Player insights preview, 1 November 2026

Added Rival of the weekend to Head to head (nearest championship points gap, positions and reveal-safe differences), Against the grid inside the existing weekend grid (strict-majority comparisons, original saved picks, team-color chips and gold outlines), and a Personal bests sub-view within My season (best weekend, most exact positions, longest/current scoring streak and latest-record badges). No new sidebar pages. Only submitted revealed picks feed majority/difference views; records use complete published non-practice weekends and shared scoring. Ties, missing entries, incomplete Sprint weekends, void rounds and title bonuses follow documented rules. Details: app/PLAYER_INSIGHTS.md.

All 137 automated tests and final production build pass. Browser verified aligned card/value/footer positions, rival selection action, hidden future picks, desktop and 390/320 px phone layouts with no page overflow or console errors. Screenshots outputs/player-insights/. Existing isolated simulated preview remains http://localhost:3008/, server session 4428; My season -> Personal bests and Head to head show the additions. Documentation and publishing source mirror updated. Local only; no GitHub push, release, VPS installation or live data change.

## Unreleased - Unified Weekend predictions preview, 1 November 2026

Renamed Head to head to Weekend predictions and removed the duplicate two-player table. The full-width timing-style grid now has Everyone / You + rival filters, a rival selector in focused mode, player counts, more compact column spacing and a compact rival recommendation above it. Compare rival activates the two-player grid filter. Against the grid is collapsed by default and resets closed on event/session changes; its majority calculations still use the full eligible league. Existing compare page ID, GP/Sprint selection and privacy remain unchanged.

All 138 tests and production build pass. Browser verified one table, eight Everyone rows, two focused rows, manual rival switching, collapsible highlights, Sprint columns, private future weekends and 390/320 px phone layouts without page overflow or console errors. Screenshots outputs/unified-grid/. Isolated preview remains http://localhost:3008/, session 96819, left on Everyone. Documentation and publishing mirror updated. No publication or VPS installation.

1 November 2026 - Sidebar label alignment (local preview): navigation buttons inherited centered text, making the wrapped Weekend predictions label appear shifted right. Explicitly left-aligned sidebar navigation text and prevented icons shrinking. Production build passes. Local preview only; no publication.

## Unreleased - Submission guidance and majority heading cleanup, 1 November 2026

Your next step now renders only when at least one applicable weekend prediction set is not submitted. It disappears reactively after all own sets are submitted, including locked entries, and remains for missing/draft GP or Sprint sets. Sprint detection also accounts for sprintRace-only calendar metadata. Archived-season behavior is preserved. The outer Against the grid disclosure is now the only heading/count; its expanded content starts with the explanation and highlights. A single difference reads 1 different call.

All 140 tests and production build pass, including render checks for GP/Sprint submission transitions, drafts, standard weekends and absence of duplicate inner headings/counters. Local preview http://localhost:3008/ rebuilt and restarted, session 57091. Documentation and publishing mirror updated. No publication, live data change or VPS installation.

## Unreleased - Prediction Reset button, 1 November 2026

Added Reset to the prediction action bar. It clears finishing order plus pole, fastest lap, retirement and Driver of the Day for the selected GP or Sprint only, using the existing 10/8-position empty form. Draft resets follow normal autosave. Resetting a submitted entry starts unsaved editing and preserves the counted submission until a complete replacement is saved; Cancel changes restores it. Reset is disabled after lock, while saving, for non-members and when already empty. Pending draft-save timers are cleared before reset. No API or scoring change.

All 140 automated tests and final production build pass. Browser verified clearing all GP fields, incomplete Save disabled, Cancel restoring the original submitted selections, and Reset disabled on a locked weekend. Phone action bar now places status above equal-width Reset/Cancel controls and a full-width primary button; measured 44 px button heights and no page overflow at 390 px. Screenshot outputs/prediction-reset/mobile.jpg. Local preview remains http://localhost:3008/, server session 10848, left with unsaved reset fields and the original demo submission intact. Documentation and publishing source mirror updated; no publication or VPS changes.

## 0.8.39 - Stable driver field height, 2 November 2026

Driver/constructor picker triggers now keep the empty field height of 44 px in both empty and selected states. Removed vertical trigger padding so the existing 30 px team logo fits within that height instead of increasing it to 52 px. Horizontal padding, team-color background, logo, label truncation and keyboard behavior remain unchanged. Production build passes. Local preview restarted on port 3008; no publication or VPS changes.


Player-guide validation: production build unverified due to junction permissions and Google Fonts network access.

