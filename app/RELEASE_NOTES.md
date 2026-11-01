# Version 0.8.36

Season picks now uses equal-width, equal-height champion cards with aligned driver and constructor selectors. Consistent spacing separates the cards, Save season picks button and title-contenders panel. The contenders table scrolls within its card on narrow screens.

Locked-state controls, saved picks, deadlines and scoring are unchanged.

Validation: all 131 automated tests and production build pass. Browser checks confirm equal desktop card widths and selector baselines, matching phone card widths, 24 px desktop / 20 px phone clearance below Save season picks, disabled locked controls and no page overflow.

After the GitHub release build succeeds, update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.36` with Re-pull image enabled. Preserve existing settings, secrets and persistent volumes. No database migration or new environment variable is required. GitHub publication does not install this update on your VPS.
