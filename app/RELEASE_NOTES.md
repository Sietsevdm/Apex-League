# Version 0.8.19

The overview now has smoothly filling session bars, a subdued Predictions open badge and a four-tile countdown. A new Did you know? card between the race banner and championship fight draws from 324 sourced facts across 27 circuits, follows the selected GP and chooses a different fact on each full refresh. Timer and background updates keep the same fact.

Complete GP and Sprint results now confirm and publish automatically through the existing hourly worker, including catch-up for unpublished past weekends in active seasons. Classification, pole, fastest lap, first retirement and official GP Driver of the Day feed scoring and announcements. Missing sources, unmatched drivers or ambiguous retirement order stay pending for organiser review. Published results and saved organiser drafts are preserved.

Three roles and separate owned leagues are included: Admin manages the whole site and every league; Organiser creates and manages their own leagues; Player joins invited leagues and submits predictions. A grouped management menu separates race setup, players, presentation and Admin-only site accounts/data controls. Existing accounts, seasons and predictions remain in the default league; existing Admins retain access.

All 106 automated tests, TypeScript and the production build pass locally. The browser verified the fact card placement and refresh rotation without console errors or page-width overflow. The existing Next.js dependency security advisory remains outstanding.

Update both app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.19`, preserving secrets and persistent volumes. No new required environment variable or container is introduced. Take an encrypted backup first: older images do not understand the new league ownership and roles, so rollback requires restoring the pre-update backup together with the older image. GitHub publication does not update the running VPS automatically.
