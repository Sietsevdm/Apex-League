# Version 0.8.45

Fixed calendar-sync recovery: failed checks now retry hourly while successful checks stay daily. OpenF1 requests retry temporary connection failures, timeouts and HTTP 429/500/502/503/504, respect provider cooldowns and report which endpoint failed.

A successful calendar fetch is retained even if the separate driver-list refresh fails; the saved lineup stays available and a warning explains the failure. Calendar errors now show a visible reason or recovery message, including when older failures have no saved detail. Failed background outcomes include the reason in worker logs.

All 162 automated tests and the production build pass. A full live OpenF1 background check into isolated test storage imported 25 events and 24 drivers. No real league data was changed. The original deployed failure remains unidentified because no error detail was available.

This release retains the previously published player walkthrough and score-notification features. Existing predictions, results, manual overrides and locked deadlines remain intact.

Update the existing Portainer stack to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.45` after the release build succeeds, with Re-pull image enabled. Update both app and calendar-worker; preserve existing settings, secrets and volumes. No new API key, environment variable or database migration is required. GitHub publication does not install the update on your VPS.
