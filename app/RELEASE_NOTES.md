# Version 0.8.20

The login screen now offers Create your own league alongside invitation-based joining. A new user can create an account and league together, sign in as its Organiser, and go straight to league management to set up the first season. Invited registrations remain Players. Account and league creation are atomic, with validation for duplicate email addresses, password length and league names.

Invitation links open the join-account form directly, with the invitation filled in and its seasons loaded. Every invitation resolves to one originating league: missing or invalid codes reveal no seasons, and signup rejects a season from another league even if the request changes its identifiers. Existing players need another league's own valid invitation to join it. Existing members retain the Sign in option. Signup errors are displayed, and demo sign-out persists across reloads.

The demo overview includes a Weekend forecast design preview opened from its weather badge, showing sample qualifying/race or Sprint forecasts and practice summaries with temperature, rain chance and wind. Sample data is clearly labelled. Live forecasts are not connected; production retains the existing current-weather link.

All 108 automated tests and TypeScript checks pass locally. The production build and browser checks pass, including direct invitation navigation and opening/closing the forecast panel. The existing Next.js dependency security advisory remains outstanding.

Update the existing stack to `ghcr.io/sietsevdm/apex-league:0.8.20` with Re-pull image enabled for both app and calendar-worker. Preserve secrets and persistent volumes and take an encrypted backup first. There are no new required settings or containers. Rollback to versions before 0.8.19 requires restoring the pre-upgrade backup alongside the older image because those versions do not understand owned leagues and Organiser roles. GitHub publication does not install the update on your VPS.
