# Version 0.8.35

Head to head now includes a weekend prediction grid beneath the two-player comparison. GP and Sprint picks use three-letter driver codes, locally bundled team logos and saved team colors with contrasting text. Horizontally scrolling columns retain player names. Only submitted predictions are shown, following the existing post-qualifying reveal rule; drafts remain private.

Weekend awards recognize the boldest correct pick, perfect GP podium and biggest championship comeback. Awards wait for all weekend results, share ties, respect voids and replacement policies, and add no championship points. Result corrections recalculate them automatically. Full definitions are documented in WEEKEND_SOCIAL.md.

Results & recap now has one set of controls and one score summary, followed by awards and weekend standings. Complete scoring details, official outcome/source and correction history are available in expandable sections. Duplicate highlight cards are removed. Selector alignment, equal detail columns, header/status alignment, inner spacing and points alignment are refined across desktop, tablet and phone layouts.

Validation: all 131 automated tests, TypeScript and production build pass. Browser checks cover GP/Sprint privacy and drafts, award explanations, player switching, pending states, expandable details and desktop/tablet/390/320 px layouts without page overflow.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.35` with Re-pull image enabled after the GitHub release build succeeds. Preserve existing secrets and persistent volumes. No database migration or new environment variable is required. GitHub publication does not install this update on your VPS.
