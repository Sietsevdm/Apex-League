# Version 0.8.43

Added an English/Dutch new-player walkthrough covering predictions and submission, separate GP/Sprint deadlines, push reminders, calendar subscriptions, season picks and scores. It opens on the first authenticated visit per account/browser and can always be reopened using Player guide in the menu or the book button in the top bar. All six topics can be selected directly. Topic numbers and labels are consistently left-aligned.

The walkthrough does not enable notifications or change predictions. Dismissal is stored in this browser; another device or cleared site storage may show it again. See PLAYER_GUIDE.md for details.

TypeScript and all 156 automated tests pass. The user reviewed the local preview; the reported topic alignment was corrected in CSS. Automated visual verification remains unavailable in this session. Production build verification is pending GitHub Actions because local Google Fonts downloads are restricted.

After the GitHub release build succeeds, update the existing Portainer stack to APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.43 with Re-pull image enabled. Update both app and calendar-worker, preserving settings, secrets and volumes. No new configuration or database migration is required. GitHub publication does not update the VPS automatically.