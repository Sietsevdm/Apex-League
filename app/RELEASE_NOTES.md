# Version 0.8.12

Driver lists now group teammates by constructor alphabetically, then by driver name. This applies to predictions, championship picks, result retirement choices and replacement controls. Drivers without a constructor appear last. Stored picks, result positions and scoring remain unchanged.

Improved public-page loading by self-hosting DM Sans and Barlow Condensed, deferring optional screens and passkey libraries, and prioritizing responsive login artwork. Initial JavaScript is 5.3% smaller before compression in the local production build. Added the login main landmark and configured font inheritance.

All 48 existing regression tests and the production build pass. The supplied PageSpeed baseline was mobile 87 / desktop 100; production score improvements require a fresh run after installation.

Update the existing Portainer stack to `ghcr.io/sietsevdm/apex-league:0.8.12` and re-pull/redeploy. Keep existing environment values, volumes and image mounts. No database migration, purge or stack configuration change is required. Create a backup before updating.
