# FIA weekend document discovery

## Problem

The 0.8.49 Las Vegas refresh reached the PDF identity guard and reported that the entry list event or season did not match. The lookup selected the highest entry-list document number across the returned FIA page without restricting links to the requested event and year. A mixed or fallback page could therefore lead to another GP's list or an older-season list. The PDF identity guard rejected it, preserving league data, but the displayed error obscured that the requested verified list was unavailable.

## 0.8.50 behavior

Document discovery accepts the exact requested year/GP as scope. It matches FIA's year/event filename prefix before comparing revision numbers, detecting conflicting versions, or checking later driver-change decisions. A source PDF is never downloaded when only another event/year's lists are present. The numeric and current descriptive FIA event URL forms are both accepted only on the official origin and with the correct season path.

The downloaded PDF must still match the event heading, year and local race-weekend dates and contain complete, unambiguous team seats. Filename matching is only a discovery filter, not proof of PDF contents. Unrecognized filenames remain unverified rather than being guessed. Existing FIA source URL checks and the isolated production PDF reader remain.

An absent verified list is an expected waiting state. The UI reports: No verified FIA entry list is available for this weekend yet. The saved lineup is unchanged. Source/network failures or conflicting/incorrect documents remain errors. Previously saved rosters, raw predictions, organiser policies, other sessions and other weekends remain untouched. No future entry is inferred from another race.

## Install and use

1. Set APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.50 in the existing Portainer stack.
2. Redeploy app and calendar-worker with Re-pull image enabled, retaining settings and volumes.
3. Retry Administration > Race weekends > Driver replacements > Refresh driver lineup from FIA for the selected weekend/session.

The button can refresh Las Vegas when a matching, verified FIA entry list is available. If the status is Waiting, retry after the official list becomes available. The failed attempt did not replace the saved lineup.

## Regression coverage

Mixed event/year lists with different document numbers; unrelated driver-change decisions; same-event revised lists and later decisions; a future Las Vegas filter returning São Paulo and prior-season PDFs; no download/extraction in that fallback case; a valid Vegas list with the local Saturday/UTC Sunday race date and modern FIA path; a falsely named Vegas PDF whose internal heading is another GP; API waiting status and preservation of saved lineup/driver records/picks. Container PDF smoke checks continue for both production image architectures. Browser/live-host verification remains unavailable in this environment.

Validation: all 194 tests and TypeScript pass. Both production image architectures retain the official FIA PDF runtime smoke check.
