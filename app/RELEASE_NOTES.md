# Version 0.8.41

OpenF1 now supplies calendars, drivers/teams, GP replacements, GP/Sprint classifications, qualifying, fastest laps and retirement timing. Formula1.com supplies Driver of the Day. No live Jolpica requests remain.

Automatic retirement confirmation uses telemetry to distinguish cars retiring on the same lap. Live verification confirms Alonso as first retirement for Mexico GP, plus a complete Singapore Sprint result. Missing or ambiguous data still waits for organiser review. Fastest-lap selection excludes race-control-deleted laps.

Existing predictions, event/driver IDs, locked deadlines, organiser drafts and published results are preserved. Manual result imports retain organiser-entered awards, retirements and voids. OpenF1 supports automated imports from 2023 onwards; older seasons remain available with manual setup. Weather forecasts continue through Open-Meteo. See OPENF1.md for details.

All 151 automated tests and the production build pass. No live league data was changed during verification.

Update the existing Portainer stack to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.41` after the release build succeeds, with Re-pull image enabled. Update both app and calendar-worker. Preserve settings, secrets and volumes; no database migration or new API key is required. GitHub publication does not install this update on the VPS.
