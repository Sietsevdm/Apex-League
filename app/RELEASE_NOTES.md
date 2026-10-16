# Version 0.8.16

The overview banner now counts down live to the next open GP or Sprint prediction deadline, then race start. Green Predictions open and red Predictions closed badges reflect the prediction state, with a separate badge for Sprint weekends.

A weekend progress strip shows scheduled session stages. The bottom circuit-facts strip has been removed. Overview and full standings now include relative points bars, highlighting your own row.

The existing head-to-head prediction comparison is retained. Local preview test users, predictions, receipts and runtime data are excluded from this release. All 73 automated tests and the production build pass. No database migration is required.

Update both app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.16` and re-pull/redeploy through the existing Portainer stack, preserving settings and volumes.
