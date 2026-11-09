# Version 0.8.48

Added Refresh driver lineup from FIA under Administration > Race weekends > Driver replacements. Choose a weekend and GP or Sprint, then refresh to use the official FIA entry list for that event. The app checks the year, weekend dates, driver identities and complete team seats, excludes practice-only participants, preserves saved driver IDs and team colors, and stores a link to the official PDF.

Confirmed replacements now remove outgoing drivers from new prediction options. New FIA-confirmed replacements use the existing carry policy; original submissions and receipts remain unchanged. Existing organiser policies, championship picks, other weekends/sessions and published results are preserved. Locked/unpublished GP lineups can be checked; Sprint refresh is available before Sprint qualifying begins. Published sessions are protected. Existing read-only predictions retain the original driver names.

Source outages and conflicts leave the saved lineup intact and show a timestamped error. Network requests happen outside the league write lock, with permission and concurrency checks before committing. Repeat refresh requests are limited. Editing an existing event now preserves replacement rules and verified lineup data when its identity/date is unchanged.

Includes 0.8.47: unified Results & points comparison, driver team-color markers, earned-point numbers and matching-row highlights.

No database migration, new service or API key. Update both app and calendar-worker to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.48` with Re-pull image enabled after the release workflow succeeds. Keep settings, secrets and volumes. Publication does not install the update on your VPS.

Validation: all 188 automated tests and TypeScript pass. The local production build is blocked by Windows junction permissions; the release workflow builds and verifies the production container.
