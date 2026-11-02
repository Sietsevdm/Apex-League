# Version 0.8.42

Added a weekend score notification for players who have enabled push notifications in Profile. It queues when GP and applicable Sprint results are all published, whether automatically or manually. The existing worker checks notification delivery every five minutes. Corrections and repeat checks do not create another notification; historical weekends are not backfilled. See WEEKEND_SCORE_NOTIFICATIONS.md.

Results & scoring now aligns status text in one column, shows the last automatic attempt and hides stale waiting warnings after publication. Result checks remain hourly, starting three hours after GP start or one hour after Sprint start. Saved organiser drafts and uncertain data require review; Fetch results does not publish.

All three podium cards now separate POSITION from the rank and the score from points. Standings explain shared-place ranking without changing scoring or tie-breaks.

All 156 tests and the production build pass. Browser verification covers alignment and stale-warning suppression. Notification delivery was tested with mocked senders; no real player notifications were sent during testing.

After the release build succeeds, update the existing Portainer stack to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.42` with Re-pull image enabled. Update both app and calendar-worker. Preserve settings, secrets and volumes. No new configuration or database migration is required. GitHub publication does not install the update on the VPS.
