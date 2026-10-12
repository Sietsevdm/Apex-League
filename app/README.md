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

## Source map

- `components/`: player pages and admin controls.
- `lib/model.ts`: league data and scoring.
- `lib/store.ts`: PostgreSQL transactions and isolated demo storage.
- `lib/season-controls.ts`: manual registration, prediction driver eligibility and name confirmation.
- `lib/provider.ts` and `lib/calendar-sync.ts`: calendar/results imports and sync.
- `lib/backups.ts`: encrypted snapshots and restore.
- `public/banners/`: included circuit photographs.
- `tests/`: automated regression checks.

## Publish

Update `package.json`, the image default in `compose.yml` and `.env.example`, [CHANGELOG.md](../CHANGELOG.md), and `RELEASE_NOTES.md`. The latter contains only the current release notes for GitHub's release page. Push to main; the repository workflow tests the app, builds AMD64/ARM64 images and creates a release after successful publication. Use a new version for every image change; published version tags are fixed.

Secrets, `.data`, `.next` and `node_modules` must not be committed. Synced files under the parent `sources/` directory are read-only references.
