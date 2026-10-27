# Apex League development

Version 0.8.18 feature: [Circuit weather banners](WEATHER_BANNERS.md) — four image variants for all 24 included circuits, automatic weather/daylight selection and organiser previews.

The application source is in this directory. For setup, updates and recovery, use [DEPLOYMENT.md](DEPLOYMENT.md). For version history, use [CHANGELOG.md](../CHANGELOG.md).

## Run locally

Version 0.8.19 (27 October 2026): live session fills, subdued Predictions open badge, tiled countdown, automatic GP/Sprint result confirmation, three account roles, owned leagues and a grouped management menu. Update both the app **and calendar worker** to image 0.8.19.

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
