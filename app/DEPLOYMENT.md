# Deploy Apex League to your VPS

This application is designed for your existing Docker / Portainer / Nginx Proxy Manager setup. It does not require Vercel, Supabase or Sites hosting. PostgreSQL runs privately alongside the application. The app is an independent fan league.

**Already installed? Start with [Easy updates with Portainer](#easy-updates-with-portainer).** The numbered installation steps below are for a first deployment.

## Easy updates with Portainer

Repository: https://github.com/Sietsevdm/Apex-League
Image: `ghcr.io/sietsevdm/apex-league:0.8.0`

### One-time setup

1. Wait for the repository's **Actions → Test and publish Apex League** run to finish successfully. The workflow tests the app, builds AMD64/ARM64 images and then creates a stable release. Do not use an image until its build succeeds.
2. The published `ghcr.io/sietsevdm/apex-league:0.8.0` image is publicly pullable (verified on 12 October 2026), so no GHCR password is needed. If a future package is private, its owner can use **Package settings → Change visibility → Public**, or add a GHCR registry to Portainer with a token limited to reading packages. Package visibility is separate from repository visibility.
3. Back up the app through **Admin → Data & history** and separately copy `/opt/apex-league/images`. Keep your existing stack configuration and previous image.
4. Open your **existing** stack in Portainer. Replace its Compose text with this release's `compose.yml`. Preserve the stack name, all existing secret values, database/backups volumes and Nginx configuration.
5. Add `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.0` and `UPDATES_REPOSITORY=Sietsevdm/Apex-League` as stack environment variables. Both app and calendar worker use the same `APEX_IMAGE`.
6. Choose **Update the stack**, enabling **Re-pull image and redeploy** if offered. For a private image select the configured registry.
7. Verify the app and database are healthy, the worker is running, sign in and check your existing league data. The admin panel should show installed version 0.8.0.

### Each future update

1. In **Admin studio → App updates**, check the installed version, available release and notes. The notice checks automatically when Admin studio opens, and offers a manual check. It never installs an update itself.
2. Create/download a backup and separately preserve the image folder.
3. In Portainer's existing stack, change only **APEX_IMAGE** to the exact image shown in the notice, for example `ghcr.io/sietsevdm/apex-league:0.8.1`.
4. Choose **Update the stack** with image pulling enabled. Both app and worker update together. No source upload or VPS build is needed.
5. Refresh the app and verify its installed version and data. Keep the backup until satisfied.

Do not remove the stack or volumes, change secret values, run Docker prune, or change Nginx during an update. Nginx continues forwarding HTTP to `apex:3000` on the `proxy` network. Expect a brief interruption while containers restart.

**Rollback:** For releases without incompatible data changes, restore the previous APEX_IMAGE value and update the stack again. If data compatibility changes, follow that release's recovery notes first. The previous image and encrypted backup should be retained.

**Update check errors:** No release means the first build has not finished or the public repository is inaccessible. Network errors/rate limits are shown as errors, not as confirmation that the app is current. GitHub release checks use the public API without credentials. UPDATES_REPOSITORY is an owner/repository value, not a URL.

### Source build fallback

If no published image is available, upload the contents of the release's `app` folder to `/opt/apex-league`, keeping existing images and data. Build locally:

```sh
cd /opt/apex-league
docker build -t apex-league:0.8.0 .
```

Set `APEX_IMAGE=apex-league:0.8.0` in Portainer and update without re-pulling the local image. This fallback requires uploads/builds; the registry path above does not.

## 1. Alternative: build the image on the VPS

Copy the `app` directory to a directory such as `/opt/apex-league` on your VPS, excluding `node_modules`, `.next` and `.data`. From that directory:

```sh
docker build -t apex-league:0.8.0 .
```

The image must exist on the same Docker host managed by Portainer. On a multi-node/Swarm installation, publish it to your own registry and use the registry image in the stack instead. This Compose file targets standalone Docker, not Swarm.

## 2. Prepare settings

Use Portainer stack environment variables. Do not commit passwords to a repository.

| Variable           | Value                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| APP_URL            | `https://apex.mr-gadget.xyz`, without a trailing slash               |
| DB_PASSWORD        | A long random alphanumeric password (avoid URL punctuation unless percent-encoded in DATABASE_URL) |
| BOOTSTRAP_EMAIL    | Your organiser email                                                                               |
| BOOTSTRAP_PASSWORD | A unique password of at least 16 characters                                                        |
| SESSION_SECRET     | At least 32 random characters                                                                      |
| CALENDAR_SYNC_SECRET | A separate random secret of at least 32 characters, shared by the app and calendar worker |
| BACKUP_SECRET | A separate random secret of at least 32 characters; retain it for backup recovery |

Your confirmed Nginx Proxy Manager network is `proxy`; the Compose file uses it directly. The app container is named `apex`, and its database is `apex-db`. Its database joins only the private backend network and has no published port.

## Clean removal of the previous league

You confirmed that none of the previous league's records, images or settings need to be retained. This is a fresh installation; no migration or old-data backup is required.

1. In Portainer, open the old league container/stack. Identify its app image, any dedicated database, named/anonymous volumes and bind-mounted data folders before removing it. Only resources belonging exclusively to the old league are in scope.
2. If managed by a stack, remove that old stack first so it cannot recreate the containers. Otherwise stop and remove its app container and any dedicated database container. Select removal of the old league's anonymous volumes where offered.
3. In Volumes, remove the old league's dedicated named volumes. For bind mounts, remove only the exact old league data folders on the VPS after confirming the paths. Stack removal may leave volumes and bind-mounted files behind.
4. In Images, remove all tags of the old league image after its containers have been removed. Remove its dedicated database image only if no other container/service uses it.
5. Keep Portainer, Nginx Proxy Manager, the external `proxy` network and the domain's SSL certificate. Do not run a global Docker prune or delete shared Docker resources.

Build the new image before the cutover. Deploy the new `apex-league` stack, then update the existing Nginx Proxy Manager host to `apex:3000` over HTTP. The domain is reused; the old container name is not. Enter your exact HTTPS domain as APP_URL. A short outage is expected during cutover.

## 3. Create a Portainer stack

Create a stack named `apex-league`, paste `compose.yml`, enter the variables above and deploy. Check app/database health and that calendar-worker stays running.

The calendar worker explicitly disables the image's HTTP healthcheck because it runs a background script rather than a web server. Expect the worker to show Running/Up, without a healthy badge. Check its logs for scheduler failures. If an earlier stack shows this worker as unhealthy, add `healthcheck: { disable: true }` under calendar-worker and update the stack; no image rebuild is required.

## 4. Add a Proxy Host in Nginx Proxy Manager

- Domain Names: `apex.mr-gadget.xyz`.
- Scheme: `http`.
- Forward Hostname: `apex`.
- Forward Port: `3000`.
- Enable Websockets Support.
- SSL: request/select a certificate, enable Force SSL and HTTP/2.
- Do not enable proxy caching for API requests.
- Allow encrypted backup uploads by adding `client_max_body_size 100m;` in the Advanced configuration. App restore uploads are limited to 100 MB, including the request envelope; PostgreSQL restore remains available for larger databases.

Only Nginx Proxy Manager should publish ports 80/443. The app and PostgreSQL do not publish host ports. Point your domain's DNS record at the VPS.

References: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Docker Next.js guide](https://docs.docker.com/guides/nextjs/), [Nginx Proxy Manager networking](https://nginxproxymanager.com/advanced-config/).

## 5. First login and season setup

Open your domain and log in using the bootstrap email/password. The organiser is created once; later changes to bootstrap variables do not reset that account. Use Profile to change its password.

1. Admin studio → Seasons & lineup → create a season with a future initial registration cutoff.
2. Race weekends → Automatic calendar sync → enable daily checks and use Check now for the first import. New seasons enable sync by default. Create the 2027 season now; an unpublished calendar is retried daily. Dates appear when Jolpica supplies them; unavailable session times remain to be confirmed and predictions stay closed until a deadline is known. Review the earliest qualifying cutoff before inviting players.
3. Confirm session times, driver/constructor lists and circuit facts. Future-year lineups may be incomplete before the season.
4. Add a practice round with a future deadline to let friends try predictions without championship points.
5. Appearance / Branding / Banners → set league identity and upload photographs you may legally reuse.
6. Members → share the invitation link before registration closes. Register existing accounts into the new season before the cutoff.
7. After a race, Results & scoring → fetch available results, confirm missing categories, inspect score preview and publish once. All players are scored automatically.

Jolpica imports use its documented Ergast-compatible calendar/results/qualifying/Sprint endpoints. Driver of the Day, retirement order and Sprint pole are not assumed to be provided. Confirm these once per session. [Provider documentation](https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md).

The calendar worker wakes hourly and checks enabled, non-archived seasons when 24 hours have elapsed since their last attempt. Sync history and errors appear in Admin studio → Race weekends. Changes preserve predictions, images and results; locked deadlines never reopen. Manual schedule overrides stay intact. Missing races are retained and flagged for organiser review. Updates depend on Jolpica publishing the calendar, which may follow the official announcement later.

Results & recap → choose a published race → Share results generates a themed 1080 × 1350 PNG with weekend winners, standings, climbers, perfect podium picks and your points. Download PNG works on desktop/mobile; Share opens the device share menu when file sharing is supported. Pending Sprint results are labelled provisional.

## Backups and recovery

Create scheduled PostgreSQL backups on your VPS (use the actual DB container name):

```sh
docker exec apex-db pg_dump -U apex -d apex -Fc > apex-backup.dump
```

Keep copies off the VPS and test restoration. Full backups contain account password hashes and league data, so store them privately. Admin JSON exports omit credentials and are for data portability, not full database recovery.

Restore into a fresh installation before opening it to players:

```sh
docker cp apex-backup.dump apex-db:/tmp/apex-backup.dump
docker exec apex-db pg_restore -U apex -d apex --clean --if-exists /tmp/apex-backup.dump
```

Stop the app while restoring. Never delete the database volume as part of a routine update. Keep an image of the previous app version and take a backup before updates. Build a new image tag, update the stack image and redeploy.

## Current boundaries

- Version 0.3 adds circuit details within the banner, league-wide font-size controls under Appearance, and an English/Dutch selector beside the profile button. Language preferences are stored per device; no database migration or new environment variables are required for these features.

- The functional build includes predictions, account access, server deadlines/privacy, fixed agreed scoring, results review/publication, calendar/result imports, tie-breaks, season picks/history, practice rounds, the current colour scheme, typography controls, branding, uploaded banners, announcements, member controls, exports and an audit log.
- Daily calendar sync and automatic scoring are implemented. Results are imported on organiser request and require review; unattended result polling and automatic email/push delivery are not implemented. Reminder preferences and a missing-entry list are available.
- Photos start as explicitly labelled illustrations in demo mode; upload real licensed circuit photos in Banners. Circuit outlines, notification delivery, detailed category-accuracy charts and a friendly non-JSON lineup editor remain follow-up work.
- The health endpoint verifies that the web process responds. Validate database readiness separately through the stack and first login.
- The deployment uses PostgreSQL transactional storage of one league document. This is a small private-league design; multiple independent hosted leagues and high-volume workloads would need a normalised schema and expanded administration.
- Password recovery currently uses organiser-assisted resets, not email reset links.
- A real PostgreSQL/Docker deployment has not been tested in this Windows workspace. Run the provided deployment smoke checklist before inviting players.

## Deployment smoke checklist

Verify HTTPS login; create two player accounts; submit a practice prediction; check another player cannot see it before the cutoff; confirm a deadline rejects a late edit; publish practice results; confirm standings exclude them; export data; take and restore a backup on a separate test database.
# Version 0.4: backups, fonts and league tools

Version 0.4.1 additionally corrects all interface font mappings, preserving responsive base sizes. Labels & helper text controls calendar session labels; Body text controls the corresponding dates. Headings, banner titles, navigation, controls, tables and statistics each use their own group. The editor shows examples for each group. Existing saved font settings remain intact.

Use image tag `apex-league:0.8.0` and the accompanying updated stack. Keep the existing database volume and secrets when upgrading. The current saved colour scheme is retained; preset themes and colour selection have been removed.

Add `BACKUP_SECRET` to the Portainer stack environment. Generate a separate random secret of at least 32 characters; do not use the example placeholder. Keep a copy in your password manager. The secret encrypts backups using AES-256-GCM and must remain the same to restore existing files. Changing it makes older files unreadable unless you restore their original secret.

The app mounts the new `apex_backups` named volume at `/app/backups`. The existing hourly calendar worker also creates a backup when the last successful snapshot is at least 24 hours old. Keep that worker running. The latest 30 snapshots are retained, including manual snapshots. In **Admin → Data & history**, organisers can create, download and restore a backup. Recovery requires the encrypted file, the original encryption secret, the organiser's current password and typing `RESTORE`. The current league is backed up before replacement. All existing login sessions are invalidated after restore. Sign in using an account contained in the restored backup. Backups cover the league's stored data, including uploaded images, password hashes and passkeys. They do not contain Docker configuration, environment secrets, the database engine or unrelated VPS files. Download copies to storage outside the VPS; the original PostgreSQL dump procedure remains available for infrastructure recovery.

**Admin → Overview** shows backup health and a season launch checklist. Calendar sync status remains in Race weekends and missing results remain in Overview. Font controls are in **Admin → Appearance**, with eight groups and font family, relative size (60–180%), weight, line height and spacing. Reset affects the preview until Apply is selected. Fonts use six predefined safe families, including local system fonts; custom font uploads are not included. These controls apply to the website, including sign-in. The exported results card keeps its own artwork typography.

Players find immutable submission receipts and Copy previous picks on Predictions. Copying creates a draft that still needs submission. Older submissions made before this update do not receive invented receipts. **Race calendar** downloads an ICS calendar containing each known GP/Sprint deadline with alarms 24 hours and 1 hour beforehand. This is a calendar import, so users must import again after schedule changes; email/push delivery is not added by this feature. **My season** displays awards without extra scoring points. Result source and organiser confirmation appear with newly published results; historical results without provenance show Organiser entry.

Passkeys use SimpleWebAuthn's verified registration and authentication flows. Configure `APP_URL` to the final HTTPS domain before registering them; passkeys are bound to its hostname. Players add/remove passkeys from Profile using their existing password, and sign in using the passkey button on the login page. Accounts retain password login for recovery. Deploy behind the existing Nginx Proxy Manager HTTPS proxy. Server challenge/validation tests pass, but a real device registration/login must be checked after HTTPS deployment. [SimpleWebAuthn documentation](https://simplewebauthn.dev/docs/packages/server).



## Version 0.5.0

- Driver replacement policies: Admin overview → Driver replacements. Choose a weekend/session, original driver, replacement ID (existing or new), scoring policy and explanation. Keep original picks or have all categories follow the substitute for that session. Original entries and receipts stay intact, and season champion choices do not change. Policies must be set before that session's results are published; changes are announced and audited. Affected submitted-entry counts become available after lock, preserving private draft picks. Players see a notice when their picks include the replaced driver.
- Results & scoring now previews championship totals, points changes and before/after ranking, including tie-breaks. Preview does not publish results. Practice rounds have no championship effect.
- Seasons & drivers now starts with a three-step setup wizard: create/copy lineup, import calendar, review launch checklist. Finish outstanding member, photo and session details in the existing admin tabs. The cutoff remains enforced.
- Predictions includes a member submission status table without exposing picks.
- Profile includes app installation guidance/prompt where supported. PNG home-screen icons, standalone manifest and a public offline fallback are included. League data and API responses are not cached by the service worker. Internet is required for predictions and submissions. Device-specific installation needs verification on the final HTTPS domain; no push delivery is added here.
- Accessibility includes visible keyboard focus, skip-to-content, active navigation state, mobile menu focus trapping/Escape, a hidden inactive mobile sidebar, larger phone controls and reduced-motion support. This is not a full accessibility certification.

Performance proposals remain separate: image compression/separate asset storage, visibility-aware refresh, moving manual external fetches outside transactions, and non-destructive backup verification with isolated recovery drills. The daily background calendar worker already fetches outside transactions.


## Version 0.8.0: circuit image folder and responsive login artwork

The stack mounts `/opt/apex-league/images` read-only at `/app/images`. Before deploying the updated stack, create the host directory and make uploaded files readable by the app's non-root user (directories 755, images 644 is sufficient). Place only public circuit/login artwork here. Supported types: WebP, JPG, JPEG, PNG, maximum 20 MB per image. User-supplied SVG files are not served.

For `Singapore Grand Prix`, use `singapore-grand-prix.webp` or `singapore.webp`. Case, accents, spaces, underscores and hyphens are normalised. A circuit provider ID or circuit-name filename is also supported. Match priority: season-specific subfolder first (e.g. `2027/singapore-grand-prix.webp`), then shared folder; within each, full GP name, short GP name, provider circuit ID, circuit name. For duplicate formats, WebP wins, followed by JPG, JPEG and PNG. Prefer the suggested exact GP filenames listed in Admin → Banners. Country-name aliases and sponsored GP-name guessing are not automatic.

Matching happens when the league loads, so existing events and newly synced events use the folder without database migration or re-importing the calendar. Uploaded manual photos take priority. Admin → Banners → Use automatic folder image clears the selected event's manual photo. Without a match, the existing circuit illustration remains. New/replaced files appear on refresh; image URLs change with file modification time and size, with a short browser cache. No Docker rebuild is needed for photo changes after this update is installed.

Login artwork: a new scalable night-circuit SVG matching Apex's turquoise/navy style is bundled. Upload `login.webp` to replace it; optionally upload `login-mobile.webp` for a portrait crop. Desktop uses a covered background behind the introduction; phones show a compact hero above the sign-in form with a darker contrast overlay. Keep the main subject near the centre/right and avoid embedded text. JPEG/PNG alternatives use the same filename stem. The generated illustration has no third-party photo credit.

Important: filesystem images are not included in encrypted database backups or exports. Back up `/opt/apex-league/images` separately, alongside the league backup and deployment secrets. Existing inline uploaded images remain covered by database backups. Folder contents are public via the image endpoint; do not put credentials or private files in this folder.

Upgrade: upload the new source contents into `/opt/apex-league` without removing the images folder or existing Docker volumes. Run `mkdir -p /opt/apex-league/images`, then `docker build -t apex-league:0.8.0 .`. Replace the Portainer stack with the updated Compose file, retaining all seven environment variable values and both named volumes. Both app and worker use image 0.8.0; the worker HTTP healthcheck remains disabled. Keep the Nginx upstream `apex:3000` and APP_URL `https://apex.mr-gadget.xyz`.


## Version 0.8.0 — banners and admin cleanup

2027 banners are included in the app and Docker image as a fallback when the VPS image folder is empty. Custom folder images and manual uploads retain priority. Numbered image filenames and country/adjective variants are recognised.

Admin → Data & history now includes selection/deletion of archived seasons and Purge database. Purge removes ALL seasons, races, results, predictions, receipts and season memberships, while retaining every account, credentials, admin settings, branding, audit history and banner files. Both actions require typed confirmation and a successful encrypted backup before deletion. Configure BACKUP_SECRET before using them. Uploaded photos are preserved in a reusable banner library and reattached when the same race/circuit is recreated for that year; external image files are unchanged. No data is purged automatically on upgrade.

Prediction receipts and Copy previous picks sit beside Closes in, with receipts in a dropdown. The race calendar uses three columns on desktop, two on narrower screens and one on phones. Standings text includes spaces between counts and labels.

Upgrade using image apex-league:0.8.0 and the included Compose file; preserve existing environment variables, Docker volumes and /opt/apex-league/images. No VPS deployment or live data deletion has been performed.


## Version 0.8.0 — Sprint scoring
GP remains 23 maximum. Sprint now awards 8 exact finishing positions, 2 pole, 1 fastest lap and 1 first retirement/none: 12 maximum. Prediction labels, league rules and perfect-session awards use the new totals. Scores are calculated from stored predictions/results, so existing published Sprint scores and standings will recalculate on upgrade. No live data changed.
