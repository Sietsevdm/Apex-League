# Official driver lineup refresh

1. Open **Administration → Race weekends** as an organiser.
2. Under **Driver replacements**, select the weekend and GP or Sprint.
3. Select **Refresh driver lineup**. The status shows the source, driver count and replacement names. **View lineup source** opens the official source used.
4. Open the predictions for the same session to see the updated choices.

The FIA entry list for the exact weekend takes priority. Before the selected session’s qualifying deadline, the refresh can use the [current Formula 1 driver roster](https://www.formula1.com/en/drivers) if the verified FIA list is pending. The fallback checks the season and matches two drivers per team against the saved grid. Refresh each upcoming GP or Sprint that needs the current roster.

Published sessions are protected. Ambiguous identities, team transfers and multiple changed seats require organiser review.

## Data behavior

The calendar import deliberately preserves the season roster. predictionDrivers now uses a verified per-session roster, or existing confirmed replacement rules that exclude the outgoing driver. Saved driver records/IDs are retained for historical scores and receipts. New drivers inherit team naming/color from the existing team. Single-seat FIA changes use the existing carry policy; raw player submissions are not rewritten. Existing organiser keep/carry policies, championship picks and other sessions/weekends are preserved. Manual replacement edits clear the corresponding roster snapshot so the organiser policy controls availability.

Event editing preserves replacement rules, sync state and verified rosters when race name/date are unchanged. Race name/date changes invalidate the roster snapshot. Calendar imports retain circuit UTC offsets; older events attempt an OpenF1 session match to resolve the offset before FIA date validation, including night races.

Permissions and event/season snapshots are checked before fetching and again before commit. FIA network/PDF work occurs outside the database write lock. Concurrent schedule, lineup, archive, result-publication or permission changes reject stale work. Up to three manual refreshes per user per minute are allowed. Errors store a message/status only and leave the prior roster and picks intact.

## Validation

The official FIA São Paulo PDF fixture verifies all 22 entries, Rafael Câmara and car 51; practice-only drivers are excluded by the existing parser. Tests cover Ocon leaving the options, Camara entering, raw picks and other sessions staying intact, idempotence, manual-policy preservation, invalid/mismatched/incomplete/conflicting sources, session/publication protection, permissions before network work, source outages, repeat-request limiting, nonblocking reads, concurrent edits, and event-edit preservation. Browser visual verification and a fresh live import cannot be performed with the current local browser/network restrictions. GitHub Actions verifies the production image build.

Validation: all 188 automated tests and TypeScript pass. The local production build is blocked by Windows junction permissions; the release workflow builds and verifies the production container.

For the DOMMatrix production PDF error and its container-level regression check, see docs/fia-pdf-runtime.md.

The 0.8.50 discovery repair filters mixed/fallback FIA pages by GP/year and reports missing verified lists as Waiting. See docs/fia-entry-list-discovery.md.

## Official announcement scope review (9 November 2026)

The Haas 4 November announcement confirms Ocon's departure for the rest of 2026 and Câmara's São Paulo appointment. Formula1.com's 5 November interview says later appearances were still unconfirmed at publication; the current F1 Haas team page lists Câmara as its current driver. These sources establish different scopes: season withdrawal, current roster, and event appointment. A newer official announcement would be needed to verify an appointment for all remaining races. No automated season-wide assignment or new release was made from this limited source set.
