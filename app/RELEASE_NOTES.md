# Version 0.8.28

The hourly worker now checks GP race entries for driver replacements. When complete provider lists identify one changed seat within the same team, the reserve driver is added and existing GP picks follow the replacement across all scoring categories. Original submissions and receipts are preserved; Sprint and championship picks remain unchanged. Organiser policies take priority. Announcements and audit records explain applied replacements.

Checks begin seven days before a GP and retry until results are published. Provider publication timing determines availability; this is not instant monitoring of team announcements. Incomplete, ambiguous or subsequently changed lineups wait for organiser review, and unresolved replacement checks hold automatic GP result publication. First-round changes, transfers and double-seat changes require manual confirmation. Practice-only substitutes do not trigger a replacement.

The manual replacement form no longer has an Explanation field, and confirmation accepts requests without a note. Existing notes remain visible.

Validation: all 122 tests, TypeScript and production build pass. A real Jolpica GP entry response was verified. The existing Next.js security advisory remains outstanding.

Update both app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.28` with Re-pull image enabled, preserving existing secrets and volumes. No new environment variable or database migration is required. The existing hourly worker must be running for automatic checks. GitHub publication does not install this update on the VPS.
