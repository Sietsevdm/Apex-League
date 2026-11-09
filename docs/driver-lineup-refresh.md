# Official FIA lineup refresh

## Use it

1. Install 0.8.49 for both app and calendar-worker using the existing Portainer stack. Set APEX_IMAGE to ghcr.io/sietsevdm/apex-league:0.8.49 and deploy with Re-pull image enabled. Preserve the database, volumes, networks and secrets. No migration or new configuration is needed.
2. Sign in as site owner or league organiser and open Administration > Race weekends.
3. Under Driver replacements, select the race weekend and GP or Sprint.
4. Click Refresh driver lineup from FIA. The timestamped status reports completion or an error. View official FIA entry list opens the exact source PDF.
5. Open predictions for the same weekend/session. Confirmed outgoing drivers disappear from new choices and replacements appear with their team colors. Read-only saved predictions retain their original names. If an editable draft contains an outgoing driver, a notice asks you to replace that choice before saving.

The refresh needs an FIA entry list published for that exact weekend. It does not reuse another event's roster or assume a driver will compete in later weekends. Source outages, unpublished lists, ambiguous identities, team transfers or multiple changed seats leave the previous lineup intact and require retry or the existing replacement editor. GP refresh can run after locking but before publication. Sprint refresh is limited to before Sprint qualifying begins; later changes use the manual session policy editor. Published results are protected.

## Data behavior

The calendar import deliberately preserves the season roster. predictionDrivers now uses a verified per-session roster, or existing confirmed replacement rules that exclude the outgoing driver. Saved driver records/IDs are retained for historical scores and receipts. New drivers inherit team naming/color from the existing team. Single-seat FIA changes use the existing carry policy; raw player submissions are not rewritten. Existing organiser keep/carry policies, championship picks and other sessions/weekends are preserved. Manual replacement edits clear the corresponding roster snapshot so the organiser policy controls availability.

Event editing preserves replacement rules, sync state and verified rosters when race name/date are unchanged. Race name/date changes invalidate the roster snapshot. Calendar imports retain circuit UTC offsets; older events attempt an OpenF1 session match to resolve the offset before FIA date validation, including night races. FIA remains the roster authority for this button.

Permissions and event/season snapshots are checked before fetching and again before commit. FIA network/PDF work occurs outside the database write lock. Concurrent schedule, lineup, archive, result-publication or permission changes reject stale work. Up to three manual refreshes per user per minute are allowed. Errors store a message/status only and leave the prior roster and picks intact.

## Validation

The official FIA São Paulo PDF fixture verifies all 22 entries, Rafael Câmara and car 51; practice-only drivers are excluded by the existing parser. Tests cover Ocon leaving the options, Camara entering, raw picks and other sessions staying intact, idempotence, manual-policy preservation, invalid/mismatched/incomplete/conflicting sources, session/publication protection, permissions before network work, source outages, repeat-request limiting, nonblocking reads, concurrent edits, and event-edit preservation. Browser visual verification and a fresh live import cannot be performed with the current local browser/network restrictions. GitHub Actions verifies the production image build.

Validation: all 188 automated tests and TypeScript pass. The local production build is blocked by Windows junction permissions; the release workflow builds and verifies the production container.

For the DOMMatrix production PDF error and its container-level regression check, see docs/fia-pdf-runtime.md.
