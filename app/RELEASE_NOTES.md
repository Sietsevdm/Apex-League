# Version 0.8.47

Results & points now combines the prediction breakdown and confirmed outcome in one full-width table. Each driver has a team-color marker. Point badges show only earned points, and correctly scored rows receive a subtle teal highlight. Result source/confirmation and correction history remain expandable below the comparison.

Scoring, saved predictions, replacement mappings, pending/void states and published results are unchanged. English and Dutch labels are included. All 183 automated tests and TypeScript pass. Browser visual verification is unavailable in this environment.

Update both app and calendar-worker to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.47` after the release workflow succeeds, with Re-pull image enabled. Preserve existing settings, secrets and volumes. GitHub publication does not install the update on your VPS.
