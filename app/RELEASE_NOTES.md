# Version 0.8.40

Results & recap now follows the current race weekend and organiser override. Sidebar navigation clears stale race selections; explicit race links and browser history retain their requested weekend. Archived seasons use the latest dated published GP or Sprint.

Automatic results and driver-replacement checks now send the identifying app header required by Jolpica. This fixes a request compatibility issue; missing awards, ambiguous retirements, organiser drafts and unresolved replacement checks still wait for review. No provider migration or scoring change.

All 142 automated tests and TypeScript pass. Live provider verification was unavailable due to hostname resolution in the development environment, so live automatic confirmation remains unverified.

Update the existing Portainer stack to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.40` after the release build succeeds, with Re-pull image enabled. Both app and calendar-worker must update. Keep settings, secrets and volumes. No database migration or new environment variable is required. GitHub publication does not install the update on the VPS.

Provider reference: https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md
