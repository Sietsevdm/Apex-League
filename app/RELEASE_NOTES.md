# Version 0.8.38

Reset clears the current GP/Sprint prediction form, including finishing order and all bonus categories. Drafts follow normal autosave. For a submitted entry, Reset opens unsaved editing: the existing submission keeps counting until a complete replacement is saved, and Cancel changes restores it. Lock, membership and saving restrictions still apply. Phone controls now place status above equal-width secondary actions and a full-width primary button.

Your next step automatically disappears when all applicable weekend prediction sets are submitted. It stays visible for missing or draft GP/Sprint sets. Expanded Against the grid content no longer duplicates its heading/count, and singular differences read 1 different call.

All 140 automated tests and final production build pass. Browser verified full GP reset, incomplete Save disabled, cancellation restoring original picks, locked protection and aligned 390 px phone controls without page overflow. No database migration, new setting or scoring change is required.

After the GitHub release build succeeds, update your existing Portainer stack with `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.38` and Re-pull image enabled. This updates app and calendar-worker together. Preserve existing settings, secrets and volumes. GitHub publication does not install this update on the VPS.
