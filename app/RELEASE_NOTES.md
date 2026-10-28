# Version 0.8.24

## Predictions remain editable until locking

Submitted GP and Sprint entries now have clear **Edit predictions**, **Save changes** and **Cancel changes** controls. Your last submitted picks stay intact while you edit; incomplete changes cannot replace them. New drafts still autosave and require explicit submission. The screen switches to read-only when the deadline passes, and the server independently rejects late saves. Earlier submission receipts remain unchanged.

## A more consistent interface

Navigation is grouped into Race weekend, Your season and Your league, with management separate. Cards, spacing and actions are more consistent, secondary buttons are quieter, and text/icon badges distinguish Not started, Draft, Submitted and Locked. Submission overview is collapsible, save feedback is clearer and empty calendar/results states explain what happens next. English and Dutch text match.

Confirmed outcome driver names stay on one line. The Predictions open badge is a lighter green, and banner badges share height, padding and text size (30 px desktop; 44 px phone touch targets). The login background now reaches both edges on wide desktops instead of inheriting the 1580 px content limit.

## Sharing previews

Open Graph and large-image metadata include an optimized 1200 × 630 Night garage card with Apex branding and the Paddock/Grid headline. Messaging crawlers can read it without signing in. APP_URL is read at request time, so the image URL uses the deployed host. Metadata contains no private league, account or invitation details. Messaging apps may cache previously fetched previews.

## Validation and installation

All 115 automated tests, TypeScript and production build pass. Browser checks cover saving edited submissions, incomplete changes, cancellation, reload persistence, locked controls, empty states, mobile overflow, single-line names and equal badge heights. Local production requests with WhatsApp and Telegram user agents receive metadata and a public HTTP 200 image response; actual messages were not sent. The existing Next.js dependency security advisory remains outstanding.

Update the app and calendar worker to `ghcr.io/sietsevdm/apex-league:0.8.24` with **Re-pull image** enabled. Take an encrypted backup and preserve existing secrets and volumes. No new required setting, scoring-rule change or database migration is introduced. Keep APP_URL set to the public HTTPS origin. Custom mounted login images still take precedence. GitHub publication does not install the update on your VPS.
