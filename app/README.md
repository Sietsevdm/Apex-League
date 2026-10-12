# Apex Prediction League

A responsive TypeScript / Next.js league app for friends, with an admin studio and automatic scoring. Self-hosted PostgreSQL and Docker deployment for Portainer + Nginx Proxy Manager. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Local demo

Node 24 and pnpm 11 are used for this build.

```sh
pnpm install --frozen-lockfile
DEMO_MODE=true pnpm dev
```

On PowerShell:

```powershell
$env:DEMO_MODE='true'
pnpm dev
```

Open `http://127.0.0.1:3000`. Demo data is stored in `.data/demo.json`. Sample event dates are relative to the first demo launch and are not an official schedule. Demo account switching is intentionally enabled only in DEMO_MODE. Never use demo mode for your live league.

## Checks

```sh
pnpm check
pnpm test
pnpm build
```

The agreed points system is in `lib/model.ts`. Real predictions, results, accounts and settings are saved through server-side transactions; session cookies are signed and HTTP-only. Browser-visible state excludes password hashes, other players' unsubmitted/unlocked picks and unpublished results for players.

No credentials, live VPS access or domain configuration are included. Do not modify synced reference files in the parent `sources` directory.

## Calendar sync and sharing
Admin studio → Race weekends includes daily calendar sync, status, history and Check now. Deploy the calendar-worker service and configure CALENDAR_SYNC_SECRET; local preview does not run the worker. Results & recap → published race → Share results produces a themed PNG and optional device sharing.

## Circuit details, fonts and language

Circuit facts are shown directly inside the current weekend banner. Update each event’s length, laps and first practice through Race weekends.

Admin studio → Appearance offers eight font groups with family, size, weight, line height and letter spacing. Adjust the preview, then apply to save for the whole league.

Version 0.4.1 corrects typography mappings across player and admin pages. Each group includes examples in the editor. Calendar session names (FP1, Qualifying, Race) use Labels & helper text; their dates and times use Body text. Responsive sizes are preserved and each group's five controls apply independently.

The language selector beside the profile button switches interface labels, rules and date formatting between English and Dutch. It remembers the choice on each device. Driver/circuit names and custom announcements remain as entered; the downloaded recap image currently uses English copy.
# Version 0.4 additions

Encrypted manual/daily backups with download and restore controls; admin backup health and launch checklist; immutable prediction receipts; copy previous picks as a draft; downloadable calendar deadline alarms; result provenance; passkey registration/login/removal; shared season awards; persistent circuit information in the banner; one retained colour scheme; eight typography groups with family, size, weight, line-height and spacing controls. See DEPLOYMENT.md for `BACKUP_SECRET`, the persistent backup volume and HTTPS passkey setup.



## Version 0.5.0

- Driver replacement policies: Admin overview → Driver replacements. Choose a weekend/session, original driver, replacement ID (existing or new), scoring policy and explanation. Keep original picks or have all categories follow the substitute for that session. Original entries and receipts stay intact, and season champion choices do not change. Policies must be set before that session's results are published; changes are announced and audited. Affected submitted-entry counts become available after lock, preserving private draft picks. Players see a notice when their picks include the replaced driver.
- Results & scoring now previews championship totals, points changes and before/after ranking, including tie-breaks. Preview does not publish results. Practice rounds have no championship effect.
- Seasons & drivers now starts with a three-step setup wizard: create/copy lineup, import calendar, review launch checklist. Finish outstanding member, photo and session details in the existing admin tabs. The cutoff remains enforced.
- Predictions includes a member submission status table without exposing picks.
- Profile includes app installation guidance/prompt where supported. PNG home-screen icons, standalone manifest and a public offline fallback are included. League data and API responses are not cached by the service worker. Internet is required for predictions and submissions. Device-specific installation needs verification on the final HTTPS domain; no push delivery is added here.
- Accessibility includes visible keyboard focus, skip-to-content, active navigation state, mobile menu focus trapping/Escape, a hidden inactive mobile sidebar, larger phone controls and reduced-motion support. This is not a full accessibility certification.

Performance proposals remain separate: image compression/separate asset storage, visibility-aware refresh, moving manual external fetches outside transactions, and non-destructive backup verification with isolated recovery drills. The daily background calendar worker already fetches outside transactions.


## Version 0.6.0: circuit image folder and responsive login artwork

The stack mounts `/opt/apex-league/images` read-only at `/app/images`. Before deploying the updated stack, create the host directory and make uploaded files readable by the app's non-root user (directories 755, images 644 is sufficient). Place only public circuit/login artwork here. Supported types: WebP, JPG, JPEG, PNG, maximum 20 MB per image. User-supplied SVG files are not served.

For `Singapore Grand Prix`, use `singapore-grand-prix.webp` or `singapore.webp`. Case, accents, spaces, underscores and hyphens are normalised. A circuit provider ID or circuit-name filename is also supported. Match priority: season-specific subfolder first (e.g. `2027/singapore-grand-prix.webp`), then shared folder; within each, full GP name, short GP name, provider circuit ID, circuit name. For duplicate formats, WebP wins, followed by JPG, JPEG and PNG. Prefer the suggested exact GP filenames listed in Admin → Banners. Country-name aliases and sponsored GP-name guessing are not automatic.

Matching happens when the league loads, so existing events and newly synced events use the folder without database migration or re-importing the calendar. Uploaded manual photos take priority. Admin → Banners → Use automatic folder image clears the selected event's manual photo. Without a match, the existing circuit illustration remains. New/replaced files appear on refresh; image URLs change with file modification time and size, with a short browser cache. No Docker rebuild is needed for photo changes after this update is installed.

Login artwork: a new scalable night-circuit SVG matching Apex's turquoise/navy style is bundled. Upload `login.webp` to replace it; optionally upload `login-mobile.webp` for a portrait crop. Desktop uses a covered background behind the introduction; phones show a compact hero above the sign-in form with a darker contrast overlay. Keep the main subject near the centre/right and avoid embedded text. JPEG/PNG alternatives use the same filename stem. The generated illustration has no third-party photo credit.

Important: filesystem images are not included in encrypted database backups or exports. Back up `/opt/apex-league/images` separately, alongside the league backup and deployment secrets. Existing inline uploaded images remain covered by database backups. Folder contents are public via the image endpoint; do not put credentials or private files in this folder.

Upgrade: upload the new source contents into `/opt/apex-league` without removing the images folder or existing Docker volumes. Run `mkdir -p /opt/apex-league/images`, then `docker build -t apex-league:0.6.0 .`. Replace the Portainer stack with the updated Compose file, retaining all seven environment variable values and both named volumes. Both app and worker use image 0.6.0; the worker HTTP healthcheck remains disabled. Keep the Nginx upstream `apex:3000` and APP_URL `https://apex.mr-gadget.xyz`.


## Version 0.7.0 — banners and admin cleanup

2027 banners are included in the app and Docker image as a fallback when the VPS image folder is empty. Custom folder images and manual uploads retain priority. Numbered image filenames and country/adjective variants are recognised.

Admin → Data & history now includes selection/deletion of archived seasons and Purge database. Purge removes ALL seasons, races, results, predictions, receipts and season memberships, while retaining every account, credentials, admin settings, branding, audit history and banner files. Both actions require typed confirmation and a successful encrypted backup before deletion. Configure BACKUP_SECRET before using them. Uploaded photos are preserved in a reusable banner library and reattached when the same race/circuit is recreated for that year; external image files are unchanged. No data is purged automatically on upgrade.

Prediction receipts and Copy previous picks sit beside Closes in, with receipts in a dropdown. The race calendar uses three columns on desktop, two on narrower screens and one on phones. Standings text includes spaces between counts and labels.

Upgrade using image apex-league:0.7.0 and the included Compose file; preserve existing environment variables, Docker volumes and /opt/apex-league/images. No VPS deployment or live data deletion has been performed.


## Version 0.7.1 — Sprint scoring
GP remains 23 maximum. Sprint now awards 8 exact finishing positions, 2 pole, 1 fastest lap and 1 first retirement/none: 12 maximum. Prediction labels, league rules and perfect-session awards use the new totals. Scores are calculated from stored predictions/results, so existing published Sprint scores and standings will recalculate on upgrade. No live data changed.


## Ready-built image updates (0.8.0)

Admin studio checks stable releases from Sietsevdm/Apex-League. Install through Portainer by changing APEX_IMAGE to the published version and pulling/redeploying. Both app and calendar worker share that setting. Read DEPLOYMENT.md for one-time GHCR visibility setup, preserving data and rollback. GitHub Actions publishes tested AMD64/ARM64 images and only then announces the release.
