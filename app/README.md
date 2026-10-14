# Apex League development

The application source is in this directory. For setup, updates and recovery, use [DEPLOYMENT.md](DEPLOYMENT.md). For version history, use [CHANGELOG.md](../CHANGELOG.md).

## Run locally

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
