# Version 0.8.13

The login page now renders immediately on the server with public settings only. The full league interface loads after sign-in, and individual player screens and admin tools load when opened.

Background refresh pauses while the page is hidden or offline. Refreshes are spaced at least one minute apart, avoid overlapping requests and pause during saves. Stale responses cannot overwrite newer navigation or saved data.

League responses now include the selected season's details, lightweight archive summaries and admin diagnostics only where needed. A seven-season local fixture used 82.9% less uncompressed JSON for the selected season and 95.8% less for the archive; production savings depend on league size. Provider imports fetch outside the database lock and validate the target again before applying changes.

All 61 tests and the production build pass. No database migration is required. Existing clients retain compatible responses. PageSpeed changes require a fresh measurement after installation.

Update the existing Portainer stack to `ghcr.io/sietsevdm/apex-league:0.8.13` and re-pull/redeploy. Preserve existing environment values, volumes and image mounts. Create a backup before updating.
