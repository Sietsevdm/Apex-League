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
