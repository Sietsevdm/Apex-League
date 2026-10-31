# Apex League development

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


## Driver replacements — 31 October 2026 (0.8.28)

The existing hourly calendar worker now checks GP race entries from Jolpica, starting seven days before each GP and retrying until results are published. It compares complete opening-round and event race entry lists, confirms a replacement only when exactly one seat changes within the same team, adds missing reserve drivers and carries all GP prediction categories to the replacement for scoring. Saved submissions, receipts, Sprint and championship picks remain unchanged. Existing manual policies take priority, announcements and audit entries are added once, and incomplete/ambiguous lists wait for organiser review. Automatic GP publication waits while a replacement check is unresolved. Practice-only participants never trigger replacements. First-round changes, double-seat changes, team transfers and unrecognised original drivers require manual confirmation. This depends on provider entry publication and is not instant team-announcement monitoring. Manual confirmation remains available, with no Explanation field or required note; previously saved notes remain visible.


## Android calendar subscriptions — 29 October 2026 (0.8.27)

The previous generic Open calendar app link used webcal, which Android Google Calendar does not handle as a URL-subscription setup action. The subscription panel now provides Set up Google Calendar with explicit computer/web setup instructions, a static Google Calendar link (no private token in the destination), and phone visibility/notification guidance. The explicit Add to iOS Calendar button opens Apple Calendar via webcal; Apple Calendar retains its named webcal action and manual iPhone instructions. Failed clipboard copying focuses/selects the link and explains manual copying. English and Dutch labels match. Creating a token is not confirmation of subscription or notifications. Google controls feed refresh and alarms.

Validation: TypeScript and all five league-followup tests pass, including token privacy, replacement, revocation and membership. Native Android calendar handoff was not tested. Included in 0.8.27. GitHub publication does not install the update on the VPS. Official reference: https://support.google.com/calendar/answer/37100


## Unified Apex logo — 29 October 2026 (0.8.27)

The default logo now uses one shared SVG, `public/apex-logo.svg`, matching the supplied turquoise rounded square and dark italic A. Login, sidebar and loading screens use this asset; favicon (`icon.svg`), 192/512 px installed-app icons, Apple touch icon and social-sharing artwork use the same mark. Custom uploaded league logos retain their existing override. Standalone 512 px PNG: `public/apex-logo.png`. SVG outlines do not depend on font loading or Appearance font settings.

TypeScript and the share-metadata test pass. Social-sharing image regenerated with the shared logo. Included in 0.8.27. GitHub publication does not install the update on the VPS.


## Mobile weekend banner — version 0.8.26, 28 October 2026

At widths up to 760 px, the race title leads the banner, passive status labels lose their boxes, GP/Sprint entry buttons share a row, and the main prediction action spans the width. The countdown uses unboxed columns; deadlines and season metrics have separate dividers. A translucent dark gradient (6% at the top, 22% at 190 px and 55% at the bottom) reveals the banner image without blur and protects text contrast and the forecast follows the metrics in normal flow. Desktop styling stays in place. All deadline dates and timezone labels remain visible.

Preview: http://localhost:3007/ with isolated `.data/ui-cohesion-preview.json` sample data. Browser checks: 320 px and 390 px with no horizontal overflow, 1280 px desktop, forecast open/close and Sprint CTA opening the saved draft. TypeScript and all 118 tests pass. Screenshot: `outputs/mobile-weekend-preview.png`. Approved for GitHub publication as 0.8.26; VPS installation remains a separate step. The existing Next.js advisory remains outstanding.


Version 0.8.18 feature: [Circuit weather banners](WEATHER_BANNERS.md) — four image variants for all 24 included circuits, automatic weather/daylight selection and organiser previews.

The application source is in this directory. For setup, updates and recovery, use [DEPLOYMENT.md](DEPLOYMENT.md). For version history, use [CHANGELOG.md](../CHANGELOG.md).

## Weekend guidance (0.8.25)

Open a completed weekend from Overview or Results & recap to see the player's combined published GP/Sprint total and a category-by-category **Your pick → Actual result → Points earned** table. Session totals remain separate and unpublished results stay Pending. Scoring rules, replacement rules and privacy restrictions are unchanged.

Overview identifies the remaining GP/Sprint action and links to that session. Exact deadlines include date, year, time and timezone beside the countdown and in Predictions; other dates consistently use the profile timezone. Administration → Overview lists only outstanding calendar details, completed sessions awaiting published results and missing active-player submissions for the next open event. It reads the privacy-safe submission overview rather than private drafts.

The sidebar has a persistent bottom Sign out button with separately scrolling navigation. Demo accounts can sign back in after signing out. Typography now scales consistently with Appearance settings; see [the page audit](TYPOGRAPHY_AUDIT.md) for coverage and verification limits. The isolated preview fixture also includes a missing calendar time and a completed session awaiting results, explicitly named Preview, and pins the Singapore weekend banner for review. No live data is changed.

## Interface and prediction editing (0.8.24)

The player UI groups navigation into Race weekend, Your season and Your league, with a distinct management entry. Cards share spacing and corner radii, primary actions remain prominent, secondary actions are quieter and the active navigation item has a clear accent. Shared prediction badges use text plus icons for Not started, Draft, Submitted and Locked. The submission overview is collapsible so the user's own picks stay central. Calendar and results empty states explain what happens next. English and Dutch copy match.

The banner's open/closed, Sprint weekend and entry badges share height, padding, line height, text size and corner radius, with a lighter green open state. Desktop badges are 30 px tall; phone badges are 44 px tall to preserve interactive touch targets. Confirmed outcome lists keep full driver names on one line, with only the rank using the narrow numeric column; extreme text sizing can scroll the list rather than wrap or clip names.

Saved submitted GP and Sprint picks remain editable until their existing server-enforced deadline. Choose **Edit predictions**, change any picks and choose **Save changes**. The previous submitted set stays intact while edits are in progress; incomplete edits cannot be saved and **Cancel changes** restores it. Submitted edits do not use draft autosave, so beginning an edit never silently removes submission status. New drafts still autosave and need an explicit complete submission. On deadline passage, the UI restores the saved picks and becomes read-only; the API independently rejects late writes. Receipt history preserves earlier submissions. No database migration or scoring-rule change is introduced.

The isolated local preview is **http://localhost:3006/**. From the app directory, run `node --import tsx scripts/setup-ui-preview.ts` to recreate `.data/ui-cohesion-preview.json`, then start with `DEMO_MODE=true`, `DEMO_DATA_FILE=ui-cohesion-preview.json`, `APP_URL=http://localhost:3006` and demo-only session/backup secrets of at least 32 characters. Serve on port 3006. This file is separate from normal demo data and production data. The sample GP is already submitted, Sprint is a partial draft, Bahrain/Saudi Arabia are locked, and the **Preview · Empty calendar** season covers empty states. The demo account chooser lets you inspect another player's Not started state. Do not use this demo configuration in production.

## Social sharing support (0.8.24)

The login width fix explicitly removes the shared `main` element's 1580 px maximum width from `.auth-shell`. The image and its gradient span the viewport on wide desktops, while the authenticated screens retain their existing content limit. Browser checks cover a 2552 × 1319 desktop and 390 × 844 mobile viewport without horizontal overflow.

Open Graph and large-image Twitter metadata describe Apex League with a public 1200 × 630 Night garage card at `/apex-share-preview.png`. The card preserves the Apex A mark and Paddock/Grid headline. Messaging apps can retrieve it without signing in. Metadata uses only fixed public copy, never player, league or invitation information. `APP_URL` is read at request time, after the Docker container receives its host settings, and must use the public HTTPS origin. Existing invitation links keep their original destination; no canonical redirect is introduced.

Regenerate the optimized PNG from the app directory with `node --import tsx scripts/generate-social-preview.tsx`. The script composes the existing background and branding using `next/og`; it does not contact an image service. Local production verification with WhatsApp and Telegram user agents confirms absolute image URLs, dimensions, metadata and public HTTP 200 image access. Actual messaging-app rendering was not tested, and those services may retain cached previews after an update.

## Login headline (0.8.23)

The default headline is **Friends in the Paddock.**, followed by the turquoise italic line **Rivals on the Grid.** Dutch translation and Branding editor placeholders match. Saved custom login text still takes precedence.

## Login league creation (0.8.20)

Login artwork (0.8.22): the pagewide background has three original photographic options, with Night garage selected as the default. Race celebration and Golden-hour circuit are retained alternatives. Each has a desktop and smaller mobile WebP in public/. The existing Apex A mark and league name form a separate responsive overlay, so cropping the background never cuts off the logo. Custom mounted login/login-mobile images retain precedence. The desktop form has a 76% opaque panel with subtle 6 px blur; phones stack the hero and form without horizontal overflow. See [login artwork, previews and provenance](../docs/login-artwork.md). Regenerate the static visual previews from the app directory with `node --import tsx login-artwork-preview.ts` after a build. They use the real login component and styles, but their forms do not submit.

Invitation URLs with `?invite=...` open the account-creation join form immediately, with the invitation prefilled and seasons loaded for that code. This is rendered from the URL on the server, so visitors do not have to click Join first. Existing members can choose Sign in. The server resolves each invitation to exactly one league. Only its seasons are returned, and signup rejects a season from any other league, even if the request changes its league or season identifiers. Missing/invalid invitations expose no season list. Joining an additional league requires its own valid invitation. Invitation validity and season registration are checked when submitting.

The login screen offers **Create your own league** beside invitation-based joining. New users enter a display name, email, password (at least 12 characters) and league name. Account and league are created atomically, they sign in as an **Organiser**, and League management opens for first-season setup. No invitation is needed to create a league. Invited signups remain Players; new Organisers cannot manage other leagues or site accounts. Existing email addresses must sign in rather than create duplicate accounts.

## Live weekend forecasts (0.8.21)

The overview weather badge opens a functional Weekend forecast dialog for every account with access to that race. Open-Meteo hourly forecasts use the circuit's validated coordinates and the UTC hour containing each scheduled session start. It shows temperature, precipitation probability and wind, with qualifying, race and Sprint cards plus a practice summary. Viewer-facing session/update times use their configured timezone. Forecast dates in the local demo follow its simulated session schedule; the weather numbers themselves are fetched live.

Mobile layout fix (0.8.22): the close control explicitly keeps a 44 × 44 px square and cannot shrink in its flex row, maintaining its circular outline and mobile touch target.

No sample forecasts or fixed weather outlooks remain. Started sessions, unknown session times, dates outside the forecast range and provider/missing-data failures have explicit states without invented numbers. Open-Meteo supports up to 16 days; actual hourly coverage decides each row's availability. Rain/precipitation probability describes the start hour, not the entire session. The outlook follows the race-start probability. Attribution and last-fetch time appear in the panel.

Data loads only when the panel opens, refreshes every 15 minutes while open/visible/online, and aborts on close, navigation or hidden/offline state. The client drops weather older than 30 minutes. The server caches by coordinates for 15 minutes, deduplicates concurrent requests and retries failures after one minute. Cached hourly data is rematched whenever schedules change. Existing authenticated event access protects requests, including cross-league restrictions. No forecasts are fetched for archived or practice-only weekends, or calendars wholly outside the forecast range. Existing `BANNER_WEATHER_ENABLED` and optional `OPEN_METEO_API_KEY` settings apply; no new container or required setting is needed. Provider failures do not block league loading or prediction saves.

## Run locally

Version 0.8.19 (27 October 2026): live session fills, subdued Predictions open badge, tiled countdown, automatic GP/Sprint result confirmation, three account roles, owned leagues and a grouped management menu. The current image is 0.8.24; update both the app **and calendar worker**.

The overview now includes a sourced **Did you know?** card between the banner and championship standings, with **324 facts across 27 circuits**. It follows the GP displayed in the banner and chooses a different fact on each full browser refresh, while keeping the current fact steady during timer/background updates. See [GP_FACTS.md](GP_FACTS.md) for coverage, primary sources, matching and refresh behaviour.

Use Node 24 and pnpm 11. Install dependencies with `pnpm install --frozen-lockfile`.

On PowerShell:

```powershell
$env:DEMO_MODE='true'
pnpm dev
```

Open http://127.0.0.1:3000. The demo creates `.data/demo.json` with sample accounts and relative dates; it is not an official calendar. Production uses PostgreSQL and `DEMO_MODE=false`.

## Verify changes

```sh
pnpm exec next typegen
pnpm check
pnpm test
pnpm build
```

Automated tests cover permissions, private predictions, deadlines, scoring, backups, season deletion, registration and settings. Keep the test suite in source control; generated test data, preview screenshots, dependencies and build output stay outside Git.

## Performance

See [PERFORMANCE.md](PERFORMANCE.md) for the PageSpeed baseline, local optimizations and post-deployment verification. Fonts are bundled at build time; builds need access to Google Fonts, while browsers request font assets only from this app.

## Source map

- `components/AppEntry.tsx` and `components/Auth.tsx`: lightweight server-rendered login and authenticated handoff.
- `components/LeagueApp.tsx`: authenticated shell, scoped navigation and background refresh coordination.
- `components/screens/`: player screens and admin tabs imported only when opened.
- `lib/model.ts`: league data and scoring.
- `lib/public-login.ts` and `lib/appearance.ts`: public settings allowlist and shared theme/font styles.
- `lib/store.ts`: PostgreSQL transactions and isolated demo storage.
- `lib/background-refresh.ts`: visible/online-only refresh scheduling and save cancellation guards.
- `lib/response-scope.ts`: selected-season projections and archive summaries; final privacy filtering stays in the API.
- `lib/manual-imports.ts`: target snapshots and concurrency validation around external fetches.
- `lib/request-context.ts`: scoped request headers shared by client navigation and updates.
- `lib/season-controls.ts`: manual registration, prediction driver eligibility and name confirmation.
- `lib/provider.ts` and `lib/calendar-sync.ts`: calendar/results imports and sync.
- `lib/backups.ts`: encrypted snapshots and restore.
- `public/banners/`: included circuit photographs.
- `tests/`: automated regression checks.

## Publish

Update `package.json`, the image default in `compose.yml` and `.env.example`, [CHANGELOG.md](../CHANGELOG.md), and `RELEASE_NOTES.md`. The latter contains only the current release notes for GitHub's release page. Push to main; the repository workflow tests the app, builds AMD64/ARM64 images and creates a release after successful publication. Use a new version for every image change; published version tags are fixed.

Secrets, `.data`, `.next` and `node_modules` must not be committed. Standalone build tracing also excludes `.data`. Synced files under the parent `sources/` directory are read-only references.

## Automatic results

The existing authenticated hourly calendar-worker call also checks unpublished provider-linked weekends in all active seasons, independently of the daily calendar-sync setting. It starts checking three hours after a scheduled GP start or one hour after a Sprint start. Each pass processes up to three sessions, rotating unavailable results and prioritising unattempted recent weekends. This catches missed weekends after an upgrade/restart; no new secret or container is required.

Jolpica's Alpha session endpoints supply classifications, qualifying/Sprint qualifying pole and fastest laps; Formula1.com's annual Driver of the Day table is the GP award fallback. Names must map uniquely to the saved season lineup. The first retirement is identified from retired drivers' completed laps; finishers, lapped finishers, non-starters and disqualifications are excluded. Multiple earliest retirements on the same lap require organiser review, since classification alone cannot establish their order. Unknown statuses or missing required categories remain pending and retry hourly; missing awards are never silently voided. Cancelled rounds need organiser category-void decisions.

Only complete outcomes publish. Publication records source, timestamps, automatic confirmation, an audit entry and a league announcement; existing scoring/standings recalculate normally. Previously published results and saved organiser drafts are preserved. Race setup → Results & scoring displays the latest automatic-check reason for the selected session. The existing manual fetch/edit/publish flow remains available for exceptions and corrections. Fetches run outside transactions; leases and snapshot checks prevent duplicate publication or overwriting concurrent organiser changes. This does not automatically correct previously published results or award season championship bonuses.

Session bar fills use elapsed time from scheduled start: practice/qualifying 60 minutes, Sprint 30 minutes and GP 120 minutes, capped at the next known session start. They update every visible second, catch up when returning to the tab and respect reduced motion. These are calendar estimates rather than live telemetry; red flags, delays and early finishes can differ. Unknown session start times remain empty. Countdown tiles show Days/Hrs/Min/Sec until the earliest open prediction deadline, then race start.

## Leagues and roles

| Role | Access |
| --- | --- |
| **Admin** — site owner | Access and edit every league. Manage site accounts and all three roles, account revocation/password resets, site-wide backups, recovery, exports and destructive cleanup. |
| **Organiser** — league organiser | Create leagues and manage only leagues they created: seasons, lineups, schedules, results, registration, invitations, membership, announcements, branding, banners and appearance. Can play in other invited leagues without gaining management access there. |
| **Player** | Join invited leagues with open registration, enter/submit their own predictions, view permitted results/standings and manage their own profile. No league-management or site-account controls. |

Choose a league using the sidebar selector. Admin can choose every league; organisers see their own leagues and leagues they joined; players see joined leagues. **Create or join a league** lets Admin/Organiser create a league owned by their account. **Join another league** accepts an invitation link or code and joins the most recent open active season; existing accounts do not need to register again. New-account registration uses the invited league's token and lists its seasons. A role is site-wide, while management authority depends on league ownership.

Management uses a single grouped menu: Overview, Race setup, Players, Presentation, and (Admin only) Site administration. Change a user's role through **Administration → Site administration → Site accounts**. League Members controls only membership; removing someone from a league preserves their account, other-league membership and saved prediction records. Global account revocation/reset and role changes are separate Admin-only controls. Changing a role invalidates that account's existing production sessions.

On upgrade, existing seasons/events/predictions stay in the original default league. Its initial owner is the first active existing Admin. All existing Admin accounts retain Admin access; no Player is promoted. Other leagues record their creator as owner. Existing site settings remain the default league's settings; new leagues have separate settings, invitations, announcements, seasons and results. Accounts, the F1 image folder and system backup infrastructure remain shared. Empty leagues can create their first season through management.

The API checks ownership before every management mutation and before provider imports, including referenced event, season and copy-source IDs. It rechecks permissions after external imports finish. Read responses are filtered by accessible league before season projections and prediction privacy checks; other leagues' settings/invitation tokens and unpublished results are not exposed. Only a player's own pre-deadline predictions remain visible, including to organisers. Conditional responses include league context; changing leagues cancels stale navigation/refresh responses. Automatic calendar/result workers route announcements and audit records to the owning league. Site-wide export/restore/purge remains restricted to Admin.

Validation: 106 automated tests, TypeScript and the production build pass. Added coverage for migration preservation/idempotence, role-specific menu rendering, cross-league reads/writes, forged target IDs, role escalation, invitations, playing in another organiser's league and membership removal. The installed Next.js 16.4.0 build reports a security advisory; a dependency upgrade remains recommended. The in-app browser verified the overview, fact rotation, card ordering and page width without console errors. A separate mobile viewport was not checked.

Authenticated response updates: GET returns a privacy-filtered revision and accepts If-None-Match for empty 304 responses. Saves with X-Apex-Base-Version may receive compact changes; mismatched bases, changed identity/scope and larger changes receive full data. The browser verifies the base before merging and refetches if a concurrent response made it stale. lib/state-response.ts handles server versioning/diffs; lib/state-delta.ts handles immutable client merges. This reduces transfer/browser work; the server still builds safe views. See PERFORMANCE.md for measurements and limits.

## Player history and browser push (0.8.15)

### Receipts

Open **My season → Prediction receipt history** for a season-wide GP/Sprint timeline. Filter by weekend and expand a record for its original picks, UTC timestamp, deadline and differences from the previous saved version. Existing submission receipts remain valid. New submissions store driver-name snapshots so later lineup renames do not rewrite the receipt. After a first submission, later saved edits receive a draft history record; the player must submit again for the current entry to score. Initial drafts still do not create submission receipts. Historical records cannot reconstruct draft edits or driver names that were never stored before this feature.

Receipts remain private to the player, including when viewed by an organizer. Original prediction-menu submission history/download controls are retained.

### Points and charts

**Results & recap → Player points breakdown** lets players choose a league member and GP/Sprint session. Every scoring category shows the original prediction, confirmed outcome and awarded/possible points. Carry-over replacements additionally show what was scored. Unpublished outcomes remain pending, void categories stay void and existing prediction-visibility rules still apply.

**My season → Championship progress** has position and points-behind-leader views, a highlighted player and an accessible data table. Checkpoints use published non-practice weekends in chronological order; a published Sprint can form a partial weekend. Ties, corrections, voids and replacements use the existing standings calculation. Confirmed championship bonuses appear at a separate final checkpoint, rather than changing earlier weekend totals. Charts recalculate corrected history; they are not frozen historical snapshots. They use SVG and add no charting dependency to the login page.

### Push reminders without email

After deployment, open **Profile → Push notifications → Enable push on this device** and allow notifications. Use **Send test notification** to verify delivery. Each browser/device opts in separately; up to five devices per account are supported. Devices can be disabled individually or together, including from a browser without push support. Logging out removes this browser's server subscription. Enabling push for a different account on the same browser transfers that endpoint to the current account.

On iPhone/iPad, add the site to the Home Screen and open the installed app before opting in. HTTPS and browser/OS notification support are required. Delivery uses the browser vendor's push service and depends on network access and device settings; an email server, Apple developer account and extra container are not required. See [Apple's Web Push documentation](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) and [MDN's Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

The existing calendar worker retains its hourly calendar/backup checks and additionally calls `/api/push-reminders` every five minutes using the existing scheduler secret. Reminders become eligible within 24 hours and 1 hour of each GP/Sprint prediction deadline. They skip submitted entries, locked sessions, archived seasons, practice rounds, inactive users and non-members. If a player opts in late, only the currently relevant reminder window is used. Sending rechecks current data and occurs outside the league transaction. Persisted claims suppress overlapping scheduler runs; temporary delivery errors retry up to five times, and expired subscriptions (404/410) are removed. As with other push systems, delivery is best effort; provider acceptance does not prove the device displayed it.

Signing keys are generated once on first use and kept in private database state, surviving ordinary restarts and updates. There are no new required environment variables. Subscription endpoints/keys and the signing private key never appear in league responses or plain data exports. Encrypted backups include signing state; restoring clears subscriptions and delivery records, requiring players to opt in again. Endpoint validation restricts delivery to supported browser push services (Google, Mozilla, Apple and Microsoft). Reminder messages contain event/session/deadline context, never prediction picks. The legacy email-reminder flag is retained for old data compatibility but does not control push opt-in.

Source: `lib/player-history.ts`, `components/ReceiptHistory.tsx`, `components/SeasonProgress.tsx`, `lib/push.ts`, `components/PushNotifications.tsx`, `public/sw.js`, `app/api/push-reminders/route.ts` and `scripts/calendar-worker.mjs`.

Validation: all 73 regression tests and the production build pass. Checks cover receipt immutability/privacy, draft/resubmission transitions, name snapshots, chart ties/partial Sprints/bonuses/corrections, endpoint and account isolation, signed/encrypted payload construction, scheduler overlap, expired subscriptions, export/restore cleanup and service-worker fallback/click behavior. Browser checks verified receipt comparisons, changing the chart metric/player, another player's category total, and the profile opt-in panel. The mobile breakdown fits a 390-pixel viewport without horizontal page overflow; browser logs contained no warnings/errors. Real device delivery remains to be verified after deployment using the opt-in/test controls.

## Banner and standings (0.8.16)

The overview banner updates its countdown every second to the earliest open GP/Sprint prediction deadline, then to race start. Status badges respect manual locks, published results and archived seasons. Unknown times show a confirmation placeholder. The weekend strip shows FP1, FP2, FP3, Quali and Race for normal weekends, or FP1, Sprint Quali, Sprint Race, Quali and Race for Sprint weekends. FP2/FP3 times are imported from the calendar and can be edited in Race weekends. Existing calendars gain missing times on their next sync; unknown times remain unconfirmed. Teal marks stages whose estimated duration has elapsed or whose results are published; gold fills the currently running scheduled session. Schedule timing cannot confirm that a session actually finished. The former bottom circuit-facts strip is removed. Standings bars compare points with the table leader and highlight the current player; zero-point standings remain empty.


The banner uses green Predictions open and red Predictions closed badges and dots. Countdown and view-button wording use Predictions.

## League usability improvements (0.8.17)

- **Overview → Your weekend predictions:** separate GP and Sprint submitted/draft/missing status, plus lock status. Each button opens that specific event/session. Status uses only the player's own entry; nothing reveals another player's predictions.
- **Standings:** green/red position changes compare current standings with the previous completed GP weekend. Until two GP weekends are published, movement is unavailable. Ties follow the normal points/wins/exact-position ranking. Current partial Sprint scores and title bonuses can affect current movement; the comparison baseline excludes title bonuses and the latest completed weekend. Corrections recalculate the comparison rather than preserving an old snapshot.
- **Results & recap → Result correction history:** new changes to already published GP/Sprint outcomes record the organiser, time, mandatory reason, previous/new outcomes and changed session-point totals per player. Initial publications, draft saves and identical re-publications do not create correction records. History is visible to signed-in league viewers, follows selected-season/event filtering, and contains no prediction contents. Corrections made before this feature cannot be reconstructed. Deleted/purged seasons remove their correction records.
- **Race calendar → Subscribe to deadline updates:** create a personal, season-specific calendar URL or replace/revoke it. Subscribe using the link in a calendar app; the existing one-time calendar download remains available. Links contain a 256-bit random token, only its hash is stored, and the raw link is shown only on creation. Anyone holding the link can read that season's event names and prediction deadlines, but no players, picks or results. Disabled users and removed memberships lose access; season deletion/purge and backup restoration revoke subscriptions. Plain exports and normal API responses omit subscription credentials. Each account has at most one active link per season.

Calendar subscriptions reuse stable GP/Sprint event UIDs, UTC deadlines and 24-hour/1-hour reminder alarms. Admin schedule saves and automatic calendar changes advance event revision metadata. A subscription requests hourly refresh, but the calendar client determines actual refresh and notification timing. The service must be reachable from the calendar app; a localhost link is suitable for preview only. Existing schedule data with no revision metadata uses revision zero until a schedule change. Subscription links should not be recorded in proxy/access logs or shared publicly.

Ordinary league reads now use committed snapshots without a writer lock or rewrite. Bootstrap, one-time legacy registration migrations and new deadline-lock transitions still use short transactions; prediction saves, authorization and deadline validation remain transactional. No-op transactions skip persistence, and PostgreSQL table initialization is cached per process. The banner's one-second timer pauses while hidden and refreshes immediately on return. See PERFORMANCE.md for verification limits.

Validation for this follow-up: all 83 automated tests and the final production build pass. Browser checks cover direct session navigation, rank arrows, calendar-link creation/revocation and mobile correction history. Real PostgreSQL load and external calendar-client refresh still need deployed verification.
