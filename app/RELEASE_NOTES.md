# Version 0.8.22

The login screen now uses the selected Night garage artwork across the page, with separate optimized desktop and mobile WebP assets. Existing Apex branding stays visible independently of image cropping. The desktop sign-in panel has a 76% opaque background with subtle blur, showing a little of the scene while retaining readable text and clear form fields. Phones keep the stacked layout. Two alternative generated scenes are included for reference.

The Weekend forecast close button stays circular on phones, with a non-shrinking 44 × 44 px touch target. Previously the global mobile minimum-height rule stretched its 32 px width into an oval.

All 113 automated tests, TypeScript and the production build pass. The selected transparency adjustment also passed the 8 relevant login/image checks and a browser visual check. Browser verification confirms a 44 × 44 px circular close button at a 390 px viewport and no horizontal login overflow. The existing Next.js dependency security advisory remains outstanding.

Update to `ghcr.io/sietsevdm/apex-league:0.8.22` and re-pull/redeploy the app and calendar worker. Preserve existing secrets and volumes and take an encrypted backup first. No database migration, new environment variable or stack configuration change is required. Custom mounted `login.webp` and `login-mobile.webp` still override the bundled artwork; move those files aside to see Night garage if necessary. GitHub publication does not install this update on the VPS.
