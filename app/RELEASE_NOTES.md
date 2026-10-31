# Version 0.8.30

Update Next.js from 16.4.0 to the exact security target 16.4.3. The security-upgrade policy is saved for future reminders; deployment configuration remains intact. The production dependency audit reports zero known vulnerabilities at verification time.

The race calendar now fills each card with its corresponding circuit image, retaining custom-image resolution and focal points. Stronger dark overlays, brighter labels and 12 px semibold times improve readability. Missing images retain a readable fallback.

App navigation now uses browser history. Back and Forward restore the page, selected race, GP/Sprint context and league/season scope. Refresh restores the current page. Phone back/swipe gestures use the same browser history; physical-phone gesture testing remains unverified. Back can leave the site after reaching the first in-app entry.

Validation: frozen dependency install, Next.js 16.4.3 version check, TypeScript, all 122 automated tests and production build pass. Browser checks on the patched production app verified all seven demo calendar images, larger schedule text, Back navigation and refresh. Prior responsive checks cover 390 px phones without horizontal overflow.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.30` with Re-pull image enabled, preserving secrets and persistent volumes. No database migration or required environment change. GitHub publication does not install the update on your VPS.
