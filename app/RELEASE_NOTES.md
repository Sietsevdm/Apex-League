# Version 0.8.29

Driver dropdowns now combine team logos before driver names with team-colored row backgrounds and contrasting text. Selected drivers retain the logo. Names and team labels remain visible, and unknown teams retain a color marker. Eleven official 2026 team marks are bundled locally.

The shared picker covers GP/Sprint predictions, championship picks, result entry, season setup and the original-driver replacement control. It supports keyboard arrows, Home/End, typing driver names, Enter/Space selection, Escape/Tab dismissal and outside clicks. The scrollable menu stays within the viewport on phones.

The picker uses the selected season's roster and existing replacement eligibility rules. It does not change saved driver IDs, submissions, deadlines or scoring. The preview used a smaller sample roster; live season rosters are preserved.

Validation: all 122 automated tests, TypeScript and production build pass. Browser checks verified keyboard selection, draft autosave, loaded logos and a 390 px phone layout without horizontal overflow. The existing Next.js security advisory remains outstanding.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.29` with Re-pull image enabled, preserving secrets and persistent volumes. No database migration or environment change is required. GitHub publication does not install this update on the VPS.
