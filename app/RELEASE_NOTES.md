# Version 0.8.23

The default login headline now reads **Friends in the Paddock.** followed by ***Rivals on the Grid.*** The second line uses turquoise italics. Branding editor defaults and Dutch translation match; saved custom login text still takes precedence.

This release also includes 0.8.22's selected Night garage pagewide background, Apex branding, subtly transparent sign-in panel and circular 44 × 44 px mobile weather close button. Existing mounted login images continue to override the bundled artwork.

Update the app and calendar worker to `ghcr.io/sietsevdm/apex-league:0.8.23` with Re-pull image enabled. Preserve secrets and volumes and take an encrypted backup first. No new settings or database migration is required. GitHub publication does not install this update on the VPS. The existing Next.js dependency security advisory remains outstanding.
