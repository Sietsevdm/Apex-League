## 0.8.0
- Admin studio shows the installed version, checks stable releases and displays release notes and the new image name.
- Portainer uses APEX_IMAGE for both the app and calendar worker. Routine updates require changing one version and pulling the image.
- Images are tested and built for AMD64 and ARM64; a release is announced only after publishing succeeds.
- Includes automatic banner fixes, protected season cleanup, three-column calendar, inline prediction tools and circular mobile profile badge.
- GP maximum is 23; Sprint maximum is 12. Existing Sprint scores recalculate from stored predictions/results on upgrade.

Back up before upgrading. Keep environment values, database/backups volumes, image folder and existing stack name. No automatic installation or database purge occurs.
