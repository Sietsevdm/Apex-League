# Version 0.8.34

Head to head now opens on the current race weekend selected by the overview banner, including organiser overrides. It retains the completed weekend until Monday in Europe/Amsterdam, then selects the next race. Players can still choose another weekend manually; background refreshes preserve that selection. Practice-only calendars and empty calendars retain their existing fallbacks.

Validation: TypeScript, all 125 automated tests and production build pass. No new browser visual verification.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.34` with Re-pull image enabled. Preserve existing secrets and persistent volumes. No database migration or new environment variable is required. GitHub publication does not install this update on your VPS.
