# Version 0.8.39

Driver and constructor selection fields now stay 44 px high whether empty or selected. Selecting a driver no longer expands prediction rows. Team colors, logos, readable labels and keyboard controls are preserved.

Validation: all 140 automated tests and production build pass. No data migration, new setting or scoring change is required.

After the GitHub release build succeeds, update your existing Portainer stack with `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.39` and Re-pull image enabled. This updates app and calendar-worker together. Preserve existing settings, secrets and volumes. GitHub publication does not install this update on the VPS.
