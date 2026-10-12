## 0.8.1
- Admins can archive/reopen seasons and select/delete archived seasons directly on Season Archive. Active seasons must be archived before deletion. Typed confirmation and encrypted backup are still required.
- Season Archive remains accessible after deleting the last season and separates the points value from its label.
- Bundled circuit photos now link for season years other than 2027, with circuit identifier/name matching for custom event names. Custom season-specific images and manual uploads retain priority.

Create a backup, set APEX_IMAGE to ghcr.io/sietsevdm/apex-league:0.8.1 in the existing Portainer stack, and update with image pulling enabled. Both app and worker use the same setting. No records are deleted by the upgrade.
