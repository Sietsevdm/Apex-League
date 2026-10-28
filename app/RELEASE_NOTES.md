# Version 0.8.25

Players can open a weekend score to compare **Your pick → Actual result → Points earned**, see GP/Sprint subtotals and a clear combined total. Unpublished sessions remain Pending; scoring rules and privacy restrictions are unchanged.

Overview identifies remaining GP/Sprint submissions with a direct next action. Exact deadlines show date, time and timezone, and dates consistently use the player's saved timezone. Organisers see an outstanding-only checklist for incomplete calendar details, results awaiting review and missing active-player submissions.

Sign out is available at the sidebar bottom while navigation scrolls separately. Sidebar section labels now match in size, weight and spacing. Typography follows Appearance settings consistently; small labels, narrow-phone results summaries and prediction-history overflow have been corrected. Demo sign-in remains persistent after signing out and back in.

All 118 tests and the production build pass. Browser checks cover player screens, eleven organiser panels, profile and authentication forms at desktop/phone sizes, plus enlarged font settings. See TYPOGRAPHY_AUDIT.md for coverage. The existing Next.js dependency security advisory remains outstanding.

Update the app and calendar worker to `ghcr.io/sietsevdm/apex-league:0.8.25` with **Re-pull image** enabled. Preserve existing secrets and volumes. No scoring-rule change, new required setting or database migration is introduced. GitHub publication does not install this update on your VPS.
