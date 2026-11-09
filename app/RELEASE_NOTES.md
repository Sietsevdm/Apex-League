# Version 0.8.50

Fixes Las Vegas lineup refresh selecting an entry-list PDF for a different event or season. FIA document discovery now scopes the selected entry list, revisions and later driver-change decisions to the requested GP and year before downloading a PDF. Higher document numbers from other races and older-season documents cannot displace the correct list. Both numeric and current descriptive FIA event-filter URLs are supported.

When no verified entry list is available for the selected weekend, the refresh reports Waiting with a clear explanation and preserves the saved lineup and original picks. Matching filenames still must pass the PDF's own event, season, date and complete-roster checks; those safeguards have not been relaxed. Night-race local-date checks, existing organiser policies and the production PDF runtime repair remain intact.

Update both app and calendar-worker to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.50` with Re-pull image enabled, then retry the FIA lineup refresh. A verified FIA list for that exact weekend is still required; this patch does not infer future entries from another race. No migration or new setting is required.

Validation: all 194 tests and TypeScript pass. Both production image architectures retain the official FIA PDF runtime smoke check.
