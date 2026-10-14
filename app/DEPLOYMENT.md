# Install and update Apex League

Current image: `ghcr.io/sietsevdm/apex-league:0.8.12`. The public image supports AMD64 and ARM64 and needs no registry password. Source and releases: [Sietsevdm/Apex-League](https://github.com/Sietsevdm/Apex-League). See [CHANGELOG.md](../CHANGELOG.md) for version history.

## Update an existing Portainer stack

1. Read the release notes and wait for its GitHub Actions build to succeed. Admin studio → Overview → App updates shows available stable releases.
2. Create/download an encrypted backup through Settings → Data & history. Back up custom images separately.
3. Open the existing Portainer stack. Set `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.12`.
4. Choose **Update the stack** with **Re-pull image** enabled. The app and calendar worker share the image setting.
5. Refresh the website, check the installed version and confirm your league data is present.

Keep the stack name, existing secret values, database and backup volumes, image mount and Nginx settings. Replace Compose text only when the release requires a stack configuration change. An app update does not purge data.

To roll back, select the previous published image tag and re-pull/redeploy. If the release requires restoring data, restore the backup created before upgrading; image rollback alone does not reverse data changes. Keep `BACKUP_SECRET` unchanged so old snapshots remain readable.

## First installation

Use [compose.yml](compose.yml) for standalone Docker managed by Portainer. It runs the app, PostgreSQL and calendar worker. It assumes Nginx Proxy Manager already uses an external Docker network called `proxy`.

Create `/opt/apex-league/images` on the Docker host for the image bind mount. The app must be able to read it; directory permissions 755 and file permissions 644 are suitable. The built-in banners work with an empty folder.

Create an `apex-league` stack with the Compose file and these Portainer environment variables:

| Variable | Purpose |
| --- | --- |
| `APEX_IMAGE` | `ghcr.io/sietsevdm/apex-league:0.8.12` |
| `UPDATES_REPOSITORY` | `Sietsevdm/Apex-League` |
| `APP_URL` | Your final HTTPS URL without a trailing slash, for example `https://apex.mr-gadget.xyz` |
| `DB_PASSWORD` | Long random password; use alphanumeric characters unless URL punctuation is percent-encoded in the connection string |
| `BOOTSTRAP_EMAIL` | First organiser's email |
| `BOOTSTRAP_PASSWORD` | Unique password of at least 16 characters |
| `SESSION_SECRET` | At least 32 random characters |
| `CALENDAR_SYNC_SECRET` | Separate secret of at least 32 characters, shared by app and worker |
| `BACKUP_SECRET` | Separate secret of at least 32 characters; retain it for recovery |

Deploy and check that the app/database are healthy and the worker is running. The worker has no HTTP server, so its inherited HTTP healthcheck is disabled. PostgreSQL uses the private backend network and has no host port. Persistent volumes are `apex_database` and `apex_backups`; their actual Docker names may include the stack prefix.

### Nginx Proxy Manager

Create a Proxy Host for your domain: scheme `http`, forward hostname `apex`, port `3000`, Websockets enabled. Select an SSL certificate, enable Force SSL and HTTP/2, and point DNS to your VPS. Keep Nginx on the shared `proxy` network. Do not cache API requests. For encrypted backup restore uploads, add `client_max_body_size 100m;` to Advanced configuration.

Only the reverse proxy publishes ports 80/443. Neither the app nor database needs a published host port.

## Start a season and manage the league

Sign in using the bootstrap credentials. They create the first organiser once; later changes to bootstrap variables do not reset an account. Change passwords in Profile.

- **Racing → Seasons & lineup:** create a season, set the championship-pick deadline and configure drivers/constructors.
- **Racing → Race weekends:** import/check the calendar, confirm missing session times and circuit facts, and confirm driver replacements for a particular race/session.
- **Racing → Results & scoring:** fetch results, verify missing categories, inspect the scoring preview and publish.
- **Players → Members:** manually open/close registration per active season, share invitations and add existing accounts. Archived seasons show their status and must be reopened before accepting players. Newly created seasons start open; upgrading preserves existing registration status.
- **Players → Announcements:** publish league notices.
- **Settings → Branding:** edit league identity and login screen copy. Empty login fields use the default wording.
- **Settings → Appearance:** edit fonts, size, weight, line height and spacing, including independent Login headings and Login text groups.
- **Settings → Banners:** inspect image matching and choose manual or automatic images.
- **Settings → Data & history:** create/download/restore backups, export data and inspect changes.
- **Season Archive:** archive/reopen seasons. Delete season removes an archived season and its races, predictions, results, receipts and memberships. Purge does the same for an active season. Accounts, other seasons, settings and banners are kept. Type the complete season name; capitalization and invisible whitespace are ignored. A successful encrypted backup is required before deletion.

GP predictions can score 23 points; Sprint predictions can score 12. Each session locks one hour before qualifying. Championship picks use their season deadline, independently of manual player registration. Practice rounds do not affect championship standings.

### Calendar and replacements

The worker wakes hourly and checks enabled, non-archived seasons when 24 hours have elapsed since the previous attempt. Unknown session times remain unconfirmed; predictions stay closed until a deadline is known. Sync preserves predictions, photos, results, locked deadlines and manual schedule overrides. Missing races are retained for organiser review.

Calendar imports use Jolpica's Ergast-compatible API. Retirement order, Driver of the Day and Sprint pole may require manual confirmation. Provider availability and publication timing affect imports.

Calendar import and background sync fill missing driver/constructor lineups even after the championship deadline. Imported team names/colors use available race results. Existing lineups and manual team colors are retained. If the selected season has no published drivers, use Import previous year's lineup as an explicitly chosen starting point and review transfers/team names before using it.

New imports distinguish opening-round drivers from later substitutes. Existing imported lineups with more than 20 drivers are checked against the opening round when an authenticated client loads the league. A provider outage leaves the saved lineup intact and retries later. Substitute drivers appear in prediction menus only for a confirmed race/session. Existing records and scoring history remain stored.

## Banners and login artwork

The automatic banner switches to the next race at midnight on Monday after the current race weekend, using Europe/Amsterdam time (including daylight saving). It keeps the final race banner after the season ends. Manual overrides take priority.

The image includes circuit photos in `public/banners/2027`; those photos can match other season years. Manual uploads take priority over custom folder images, which take priority over included photos. A circuit with no match uses the default illustration.

Custom files go in `/opt/apex-league/images`, mounted read-only at `/app/images`. For Singapore, use `singapore-grand-prix.webp` or `singapore.webp`; a year folder such as `2027/` takes priority over shared images. Names, circuit identifiers, common circuit aliases and numbered filenames are recognized. Supported formats are WebP, JPG, JPEG and PNG, up to 20 MB; user-supplied SVG is not served.

Use `login.webp` for the login background and optional `login-mobile.webp` for portrait artwork. Keep the subject near the centre/right. Files become available on refresh without rebuilding the image. Use **Settings → Banners → Use automatic banner image** to clear a manual override; Image source explains which image was selected.

The image folder is publicly served. Keep private files and credentials elsewhere. Back up the host folder separately; encrypted snapshots include inline uploaded photos but not external image files.

## Backups and recovery

Settings → Data & history creates encrypted snapshots including accounts, predictions, results, inline photos and settings. The latest 30 are kept on the server. Download copies off the VPS and retain the encryption secret. JSON exports exclude credentials and are for portability, not full recovery.

A daily backup is attempted through the calendar-sync process. Monitor backup health in Admin Overview. Restore requires typed confirmation, saves the current state first, and revokes existing sessions. App restore uploads are limited to 100 MB including the request envelope.

For a PostgreSQL backup on the Docker host:

```sh
docker exec apex-db pg_dump -U apex -d apex -Fc > apex-backup.dump
```

Restore to an isolated/fresh database before reopening it to players:

```sh
docker exec -i apex-db pg_restore -U apex -d apex --clean --if-exists < apex-backup.dump
```

Both commands use this Compose file's database container name. Store database backups privately; they contain account hashes and league data. Check restoration before relying on a backup.

Passkeys require the final HTTPS hostname in `APP_URL`. Players manage them in Profile; password login remains available for recovery. Changing the hostname changes passkey eligibility.

## Troubleshooting

- **No registration button:** open Players → Members. The registration panel lists every season; reopen an archived season before opening its registration.
- **Deletion stays disabled:** use Copy season name, then type or paste the complete name. Leading/trailing/repeated spaces, non-breaking spaces and case differences are accepted.
- **Deletion reports backup failure:** verify `BACKUP_SECRET` has at least 32 characters and the backups volume is writable. Nothing is deleted when the backup fails.
- **Default banner appears:** inspect Image source in Settings → Banners, check file permissions and matching names, and clear any manual override.
- **Worker unhealthy:** ensure its Compose healthcheck is disabled. The worker should show Running without an HTTP healthy badge.
- **No new calendar/results:** inspect sync history and provider availability; manually confirm missing information.
- **Update unavailable:** verify `UPDATES_REPOSITORY`, network access and a successful published release. An unavailable check does not mean the app is current.

## Build locally instead of pulling an image

From the app directory, run `docker build -t apex-league:0.8.12 .` on the Docker host used by Portainer. Set `APEX_IMAGE=apex-league:0.8.12` and update without re-pulling that local image. For development commands, see [README.md](README.md).
