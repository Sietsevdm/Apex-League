# Version 0.8.33

Submitted GP and Sprint predictions are visible to league members through the Results player selector after their corresponding qualifying session, before race results are published. Reveal time uses scheduled qualifying start plus one hour, matching the calendar estimate; it is not live confirmation of completion and can differ during delays or red flags. Edit deadlines remain unchanged. Published results also permit reveal once locked. Drafts and receipts remain private.

Predictions Open now uses green text, dot and border on an opaque dark background; Predictions Closed uses red on the same dark background. Deadline labels now read GP predictions deadline / Sprint predictions deadline, including Dutch translations. Standings and finishing-order prediction positions 4 onward use bright logo teal; gold/silver/bronze positions 1-3 are preserved.

Validation: all 125 automated tests and production build pass. No new browser visual verification.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.33` with Re-pull image enabled. Preserve existing secrets and persistent volumes. No database migration or new environment variable is required. GitHub publication does not install this update on your VPS.
