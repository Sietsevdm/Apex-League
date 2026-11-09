## 0.8.47 — Unified results and points

Merged the repeated outcome into the prediction comparison. Added driver team markers, earned-point numbers and matching-row highlights. Source confirmation and correction history remain expandable. Scoring and stored picks are preserved.

## 0.8.46 - All-team weekend driver checks, 8 November 2026

Every team is now checked hourly against the FIA's official entry list for the matched GP and OpenF1. The shared FIA source covers all 11 current teams, recognises their sponsor-name differences, excludes practice-only drivers and reads actual car numbers without superscript footnotes. Explicit weekend/year/meeting checks, local race timezones and latest-document selection prevent applying another event's roster. The earlier Haas announcement check remains supplemental.

Confirmed GP replacements carry existing picks and save a link to the FIA proof. Complete FIA entries can confirm replacements before qualifying even when OpenF1's future race roster is empty; completed qualifying must corroborate the driver and car number. The results importer uses that identity. Current-weekend checks take priority over old unfinished races. Existing manual policies, submissions, receipts, Sprint/championship picks and published results are preserved.

Source outages remain visible and retry hourly; contradictory evidence and newer driver-change decisions require updated official entries or organiser review. Updates depend on official publication, so instant availability cannot be guaranteed. PDF reading and its runtime are included in the app; no new service, key or migration is required. Live read-only verification checked 22 drivers across 11 teams and confirmed Ocon → Câmara with FIA proof. All 183 tests, TypeScript and the production build pass; the packaged PDF runtime also passed. Included in 0.8.46. Details: docs/all-team-driver-checks-2026-11-08.md.

# Apex League development

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

OpenF1 supplies the calendar, drivers, teams, GP entries, classifications, qualifying/Sprint qualifying and race timing. Formula1.com's annual Driver of the Day table supplies the GP award. First retirement is resolved from DNF status and observed permanent-stop telemetry, including same-lap cases. Deleted lap times are excluded from fastest-lap selection. Missing data, uncertain identities, restarts or retirement intervals too close to distinguish remain pending for organiser review. Full source, migration, timing and compatibility details: [OpenF1 integration](OPENF1.md).

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

## 0.8.33 - Prediction reveal and readability, 1 November 2026

Submitted GP and Sprint picks now become visible to authorised league members in Results after their respective qualifying session, using scheduled start plus one hour. Edit deadlines remain unchanged. This is a calendar estimate, not live confirmation of qualifying completion; delays and red flags can differ. Published results also permit reveal once locked. Drafts and submission receipts remain private. The Results player selector works before race results publish and explains when picks are still hidden.

Predictions Open and Closed badges both use an opaque dark background. Open uses green text/dot and a matching green border; Closed uses red. Deadline labels now read GP predictions deadline / Sprint predictions deadline, with Dutch equivalents. Standings and finishing-order prediction positions 4 onward use logo teal (#22dcc5); gold/silver/bronze positions 1-3 remain unchanged.

Validation: all 125 tests pass, including API privacy before/after qualifying and independent GP/Sprint reveal boundaries; production build passes. No new browser visual verification. Documentation and publishing source mirror updated. Prepared for authorised GitHub publication as 0.8.33. VPS installation remains separate. Synced sources untouched.


1 November 2026 follow-up: Open badge changed to green (#54e3a2) text/dot with a matching border; dark background retained. Verified CSS selectors and publishing mirror. Included in 0.8.33; VPS installation remains separate.

## 0.8.34 - Head to head current weekend, 1 November 2026

Opening Head to head now selects the same race weekend as the overview banner, using the shared bannerEvent selector. This respects the organiser banner override, keeps a completed race selected until Monday in Europe/Amsterdam, and then advances to the next event. If no non-practice race exists, the first event remains the fallback; an empty calendar retains its existing empty state. Players can still select other weekends manually, and polling does not reset their selection. Included in 0.8.34 for authorised GitHub publication. VPS installation remains separate.

Head to head verification: TypeScript and all 11 existing scoring/selection tests pass, including Amsterdam Monday rollover and organiser override.

## Unreleased - Weekend prediction grid and weekend awards, 1 November 2026

Head to head now includes a full submitted-prediction grid with three-letter driver codes, saved team-color backgrounds, local team logos, GP/Sprint categories and horizontally scrolling columns with sticky player names. Existing two-player comparison appears first, with the weekend grid beneath it. Both respect the post-qualifying reveal rule; missing/draft submissions stay neutral. Calendar imports retain provider driver codes when available.

Results & recap now shows non-scoring weekend awards: Boldest correct pick (least popular correct category selection, excluding unanimity), Perfect podium and Biggest comeback (positive championship rank movement from this weekend). Awards wait for every GP/Sprint result, share ties, respect scorer replacements/voids, exclude practice and automatically follow result corrections. Future rounds and championship bonuses do not influence comeback awards. Full behavior and maintenance details: app/WEEKEND_SOCIAL.md.

Validation: all 131 tests, TypeScript and production build pass. Browser verified desktop/390 px phone layouts, eight-player grids, contained scrolling and sticky names, loaded team logos, independent GP/Sprint drafts, hidden/pending/completed states, award explanations and Dutch grid labels; no console errors. Isolated simulated preview: http://localhost:3008/ using weekend-social-preview.json, server session 97459. Screenshots: outputs/weekend-social/. Documentation and publishing source mirror updated. No GitHub publication, release or VPS installation; synced sources untouched.

1 November 2026 preview refinement: moved Weekend prediction grid below the Head to head comparison. Shared filters and prediction privacy remain unchanged. Local preview only.

## Unreleased - Results & recap cleanup, 1 November 2026

Reordered Results & recap into weekend/player controls, one score summary with a single GP/Sprint switch and compact winner/leader context, weekend awards, weekend standings, then two closed-by-default detail sections. Removed the four large highlight metric cards and duplicate session/player controls. Share results is now a subdued secondary action. Selected-session publication status sits inside the score summary.

Prediction breakdown retains every scoring category, original/effective replacement picks, actual outcomes, points and session total. Confirmed outcome retains the full classification and result source, with correction history nested inside. Detail sections reset closed when the weekend/session changes. Pending standings show Pending rather than misleading zero scores. Partially published weekends label the points leader rather than a final winner. No scoring, saved prediction or permission change.

Validation: all 131 existing automated tests pass; final TypeScript/production build passes. Browser verified changing player from Sietse (8 points) to Jordan (23), all 15 GP breakdown rows, opening the full classification, Sprint pending state, closed detail reset, desktop and 390 px phone layouts without page overflow, and no console errors. Screenshots outputs/weekend-social/results-clean-desktop.jpg and results-clean-mobile.jpg. Preview remains http://localhost:3008/, isolated weekend-social-preview.json, server session 89544. Documentation and publishing mirror updated. No GitHub publication or VPS installation.

1 November 2026 - Results alignment verification (local preview): removed the player selector's inherited 8 px top margin (both selectors now 45 px high with matching top edges). Scoped zero padding correctly on detail cards to remove double indentation. Equal desktop detail columns, 72 px flex-aligned disclosure headers with explicit arrows/status alignment, consistent 24 px desktop/18 px phone body padding, right-aligned points headings and values, baseline-aligned outcome labels/values, and correctly scoped correction-history padding. Details stack below 1100 px. Browser verified desktop 1506 px, tablet 1024 px, phones 390/320 px, expanded details and pending Sprint labels; equal award-card dimensions and winner baselines, no label overlap, no page overflow or console errors. Production build passes. Screenshots: outputs/weekend-social/results-alignment-desktop.jpg and results-alignment-mobile.jpg. Preview http://localhost:3008/, server session 50437. No publication or VPS installation.

1 November 2026: weekend prediction grid, weekend awards, Results cleanup and alignment refinements approved for GitHub publication as 0.8.35. Update app and calendar-worker after the release build succeeds. VPS installation remains separate.

## 0.8.36 - Season picks alignment, 1 November 2026

Fixed the screenshot-reported Season picks spacing: equal-width/equal-height champion cards with aligned selector baselines, consistent card gaps and a separate save-action row with 24 px desktop / 20 px phone clearance before the title-contenders panel. The contenders table now scrolls inside its card when needed. Locked-state controls remain disabled; no saved picks or deadlines change. Production build passes. Browser verified matching desktop card widths (577.5 px) and picker tops, matching 343 px phone cards, exact 24/20 px button-to-panel gaps, disabled locked save controls and no phone overflow. Screenshot outputs/weekend-social/season-picks-aligned-mobile.jpg. Local preview http://localhost:3008/, session 68610; only its named demo dataset cutoff was set to the past to reproduce the locked screenshot. No live data changes, publication or VPS installation.

## Unreleased - Player insights preview, 1 November 2026

Added Rival of the weekend to Head to head (nearest championship points gap, positions and reveal-safe differences), Against the grid inside the existing weekend grid (strict-majority comparisons, original saved picks, team-color chips and gold outlines), and a Personal bests sub-view within My season (best weekend, most exact positions, longest/current scoring streak and latest-record badges). No new sidebar pages. Only submitted revealed picks feed majority/difference views; records use complete published non-practice weekends and shared scoring. Ties, missing entries, incomplete Sprint weekends, void rounds and title bonuses follow documented rules. Details: app/PLAYER_INSIGHTS.md.

All 137 automated tests and final production build pass. Browser verified aligned card/value/footer positions, rival selection action, hidden future picks, desktop and 390/320 px phone layouts with no page overflow or console errors. Screenshots outputs/player-insights/. Existing isolated simulated preview remains http://localhost:3008/, server session 4428; My season -> Personal bests and Head to head show the additions. Documentation and publishing source mirror updated. Local only; no GitHub push, release, VPS installation or live data change.

## Unreleased - Unified Weekend predictions preview, 1 November 2026

Renamed Head to head to Weekend predictions and removed the duplicate two-player table. The full-width timing-style grid now has Everyone / You + rival filters, a rival selector in focused mode, player counts, more compact column spacing and a compact rival recommendation above it. Compare rival activates the two-player grid filter. Against the grid is collapsed by default and resets closed on event/session changes; its majority calculations still use the full eligible league. Existing compare page ID, GP/Sprint selection and privacy remain unchanged.

All 138 tests and production build pass. Browser verified one table, eight Everyone rows, two focused rows, manual rival switching, collapsible highlights, Sprint columns, private future weekends and 390/320 px phone layouts without page overflow or console errors. Screenshots outputs/unified-grid/. Isolated preview remains http://localhost:3008/, session 96819, left on Everyone. Documentation and publishing mirror updated. No publication or VPS installation.

1 November 2026 - Sidebar label alignment (local preview): navigation buttons inherited centered text, making the wrapped Weekend predictions label appear shifted right. Explicitly left-aligned sidebar navigation text and prevented icons shrinking. Production build passes. Local preview only; no publication.

1 November 2026: unified Weekend predictions, Against the grid, Personal bests, Rival of the weekend and sidebar alignment approved for GitHub publication as 0.8.37. Update the existing Portainer stack using APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.37 with Re-pull image after the release build succeeds; app and calendar-worker update together.

## Unreleased - Submission guidance and majority heading cleanup, 1 November 2026

Your next step now renders only when at least one applicable weekend prediction set is not submitted. It disappears reactively after all own sets are submitted, including locked entries, and remains for missing/draft GP or Sprint sets. Sprint detection also accounts for sprintRace-only calendar metadata. Archived-season behavior is preserved. The outer Against the grid disclosure is now the only heading/count; its expanded content starts with the explanation and highlights. A single difference reads 1 different call.

All 140 tests and production build pass, including render checks for GP/Sprint submission transitions, drafts, standard weekends and absence of duplicate inner headings/counters. Local preview http://localhost:3008/ rebuilt and restarted, session 57091. Documentation and publishing mirror updated. No publication, live data change or VPS installation.

## Unreleased - Prediction Reset button, 1 November 2026

Added Reset to the prediction action bar. It clears finishing order plus pole, fastest lap, retirement and Driver of the Day for the selected GP or Sprint only, using the existing 10/8-position empty form. Draft resets follow normal autosave. Resetting a submitted entry starts unsaved editing and preserves the counted submission until a complete replacement is saved; Cancel changes restores it. Reset is disabled after lock, while saving, for non-members and when already empty. Pending draft-save timers are cleared before reset. No API or scoring change.

All 140 automated tests and final production build pass. Browser verified clearing all GP fields, incomplete Save disabled, Cancel restoring the original submitted selections, and Reset disabled on a locked weekend. Phone action bar now places status above equal-width Reset/Cancel controls and a full-width primary button; measured 44 px button heights and no page overflow at 390 px. Screenshot outputs/prediction-reset/mobile.jpg. Local preview remains http://localhost:3008/, server session 10848, left with unsaved reset fields and the original demo submission intact. Documentation and publishing source mirror updated; no publication or VPS changes.

2 November 2026: prediction Reset, submitted-weekend guidance hiding, duplicate majority heading cleanup and phone action layout approved for GitHub publication as 0.8.38. Update the existing Portainer stack using APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.38 with Re-pull image after the release build succeeds; app and calendar-worker update together.

## 0.8.39 - Stable driver field height, 2 November 2026

Driver/constructor picker triggers now keep the empty field height of 44 px in both empty and selected states. Removed vertical trigger padding so the existing 30 px team logo fits within that height instead of increasing it to 52 px. Horizontal padding, team-color background, logo, label truncation and keyboard behavior remain unchanged. Production build passes. Local preview restarted on port 3008; no publication or VPS changes.

## 0.8.40 - Results weekend and provider identity, 2 November 2026

Results & recap follows the shared current weekend and organiser override. Sidebar navigation clears stale race context; explicit links and history retain their event. Archived seasons select the latest dated published GP or Sprint. Automatic results and replacement requests now identify the installed app to Jolpica, matching its documented requirement. Existing publication checks remain in place; no source migration or scoring change.

Validation: all 142 tests and TypeScript pass. Live API access could not be verified due to development hostname resolution. Update both app and calendar-worker using image ghcr.io/sietsevdm/apex-league:0.8.40 after the GitHub build succeeds. No VPS installation performed.

## 0.8.41 - OpenF1 migration, 2 November 2026

Replaced live Jolpica race-data requests with OpenF1 for calendars, GP/Sprint results, qualifying, fastest laps, race entries and driver/team lists. Formula1.com remains the Driver of the Day source. Added paced requests, identity checks, deleted-lap handling and telemetry-based retirement order. Existing predictions, IDs, deadlines, organiser drafts and published results are preserved. Unsupported or ambiguous data remains available for manual review. Full details: app/OPENF1.md.

All 151 automated tests and the production build pass. Read-only live verification confirms Mexico GP with Alonso first retirement and Verstappen Driver of the Day, plus a complete Singapore Sprint result. No league records were changed. Approved for GitHub publication as 0.8.41. No VPS installation performed.

## 0.8.42 - Result status and weekend score notifications, 2 November 2026

Results & scoring now stacks the automatic status, last provider attempt and hourly-check explanation with consistent alignment. Published results hide stale waiting warnings. Checks remain hourly, starting three hours after GP start or one hour after Sprint start; saved organiser drafts and unresolved replacement checks still block automatic publication. Manual Fetch fills the form without publishing.

Newly published complete weekends now queue a push notification for existing opted-in player devices. GP and applicable Sprint must both be published; automatic and manual publication are supported. The existing push worker checks every five minutes. Corrections and repeated checks do not queue another notification. Practice/archived seasons, inactive/non-member accounts, old results and devices subscribing after publication are excluded. Profile copy explains both deadline reminders and weekend scores. No email service or new configuration is needed.

Podium cards now include explicit spaces between POSITION and the rank, and between the score and points.

Standings clarify competition ranking: four tied players at P3 occupy places 3-6, so the next place is P7. Ties use total points, weekend wins, then exact positions; scoring and ranks are unchanged.

Validation: all 156 tests and production build pass. Browser verified aligned single-column status text and last-attempt timestamp, and that published results suppress a stale retirement warning. Push delivery tested with mocked senders, including concurrency, manual/automatic publication, complete Sprint weekends, eligibility and batches beyond 20 devices. No real player notifications sent. Screenshot: outputs/results-status-aligned.png. Approved for GitHub publication as 0.8.42. No VPS installation performed.

## Player walkthrough

New players receive a six-topic welcome guide covering submissions, reminders, calendar tools, season picks and scores. Reopen it any time using Player guide in the menu or the top-bar book button. See [PLAYER_GUIDE.md](PLAYER_GUIDE.md) for behavior and local preview instructions.

## 0.8.45 - Calendar API recovery, 8 November 2026

Failed calendar checks retry hourly instead of daily. Temporary OpenF1 connection/timeout/server/rate-limit failures get bounded retries with Retry-After support and endpoint-specific errors. Calendar updates survive separate driver refresh failures, keeping the saved lineup and showing a warning. Error capture now covers blank/non-Error failures, the panel shows a visible fallback, and worker logs include failure reasons.

Validation: all 162 tests and production build pass; live isolated background sync imported 25 events and 24 drivers. Existing player walkthrough and score notifications retained. Update both app and calendar-worker to ghcr.io/sietsevdm/apex-league:0.8.45 with Re-pull image enabled after the build succeeds. No VPS installation performed.
