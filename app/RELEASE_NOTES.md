# Version 0.8.15

Prediction receipt history now has a season-wide timeline, comparisons between saved versions and draft history after submission. New receipts preserve driver names as well as the original picks and timestamps. Existing submission receipts and downloads remain available.

Results now offer a per-player GP/Sprint points breakdown with original predictions, confirmed outcomes and replacement treatment. My season adds championship position and leader-gap charts with accessible data tables. Practice rounds are excluded and championship bonuses appear as a separate checkpoint.

Browser push reminders replace the need for an email server. Players opt in through Profile → Push notifications, can send a test notification, and can disable one or all devices. The existing worker checks every five minutes for missing predictions within 24 hours and 1 hour of GP/Sprint deadlines. Submitted entries, locked sessions, archived seasons and practice rounds are skipped. Signing keys persist privately in the database; no new required environment settings or containers are needed.

On iPhone/iPad, first add the app to the Home Screen and open it there. Notifications require HTTPS, supported browser/device settings and player permission. Real-device delivery should be verified with the test button after installation. Restoring a backup requires players to opt in again.

All 73 tests and the production build pass. No database schema migration is required.

Update both the web app and calendar-worker in the existing Portainer stack to `ghcr.io/sietsevdm/apex-league:0.8.15` and re-pull/redeploy. Preserve existing environment values, database, volumes and image mounts. Create a backup before updating.
