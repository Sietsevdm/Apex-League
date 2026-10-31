# Version 0.8.31

The race calendar highlights the current weekend with an accent border and label, matching the overview's selected event. Practice rounds and archived seasons are excluded from the highlight.

Standings now show a Weekend picks column with independent GP and Sprint submission indicators. A checkmark means submitted; draft, not-started, missed and unavailable states have distinct icons and accessible labels. Status comes from the existing privacy-safe summary, without revealing predictions. The compact overview standings are unchanged.

Chosen drivers now retain their team-color background alongside the team logo. Black or white text is selected for contrast. Empty and No retirements fields remain neutral, as do neutral menu rows.

Validation: all 124 automated tests, TypeScript and production build pass. Browser checks verified the current-weekend highlight, independent GP/Sprint status, 390 px standings without page overflow, selected-driver colors and neutral menu styling. Next.js remains on security-patched 16.4.3.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.31` with Re-pull image enabled. Preserve secrets and persistent volumes. No database migration or environment change is required. GitHub publication does not install this update on your VPS.
