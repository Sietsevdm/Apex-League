# Version 0.8.46

Every team is now checked hourly against the FIA's official entry list for the race weekend and OpenF1. Confirmed GP replacements carry existing predictions to the replacement driver, with the official source linked in the player notice. The shared FIA source covers all 11 current teams and excludes practice-only substitutes. The earlier Haas announcement check remains available as an additional source.

Complete FIA entries can confirm replacements before qualifying even when OpenF1 has no upcoming GP roster yet. Completed qualifying must corroborate the driver and car number. The results importer reconciles stale race entries with the verified replacement identity. Weekend matching handles local timezones and month boundaries; PDF superscripts cannot alter car numbers. Current-weekend checks take priority over old unfinished races.

Existing organiser policies, original submissions and receipts, Sprint/championship picks and published results are preserved. Matching organiser rules can receive official identity proof without changing their scoring policy. Missing sources are shown as pending and retried hourly. Conflicting evidence or a newer FIA driver-change decision requires updated official entries or organiser review. Availability depends on official sources publishing the change.

All 183 automated tests, TypeScript and the production build pass. The packaged PDF runtime was verified with an official FIA entry-list fixture. A live read-only check verified 22 São Paulo drivers across 11 teams and confirmed Ocon to Câmara with FIA proof and car #51. No live league data was changed during verification.

The PDF reader and its required runtime are bundled. No new service, API key, environment variable or database migration is required. The existing player guide and weekend score notifications are retained.

Update the existing Portainer stack to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.46` after the release build succeeds, with Re-pull image enabled. Update both app and calendar-worker; preserve existing settings, secrets and volumes. GitHub publication does not install the update on your VPS.
