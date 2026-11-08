# All-team race-weekend driver checks

The hourly GP replacement checker now checks every team against the FIA's official entry list for that specific weekend, alongside OpenF1. This extends the earlier Haas announcement adapter to all 11 current teams through one shared official source. It does not require separate news scrapers for every team or a new API key.

## Source and identity

The app matches a unique OpenF1 meeting by year and meeting key, discovers that meeting's FIA document page through the FIA season selector, and downloads the latest numbered Entry List/Revised Entry List document. Only HTTPS PDFs under www.fia.com/system/files/decision-document/ are accepted; redirects are disabled. The PDF header must match the GP and year, and its dated weekend must contain the race in the circuit's local timezone. Month boundaries and night races that fall on the following UTC date are supported. The event's organiser-editable display name is not used as proof.

The PDF reader uses table coordinates, rather than guessing names from flattened text. Superscript footnotes are excluded from car numbers: 81 with footnote 1 remains car 81. The additional FP1/FP2-driver section is excluded from race entries. A complete 20–24-driver list with unique identities/numbers and exactly two drivers per team is required. Current sponsor-name differences are normalised for McLaren, Mercedes, Red Bull Racing, Ferrari, Williams, Racing Bulls, Aston Martin, Haas, Audi, Alpine and Cadillac; historical Sauber/AlphaTauri names are supported too. Alexander/Alex Albon is an explicit identity alias. Unknown mismatches remain reviewable.

Each team is compared against the complete opening GP roster. A uniquely changed seat creates a GP carry rule with the original/replacement names, team, car number, driver code, FIA source URL, meeting key, year, local weekend dates and timezone saved as proof. Multiple teams can change in one pass. The complete FIA roster can also supply confirmation before qualifying when OpenF1 has no upcoming GP entries yet. A partially populated or contradictory OpenF1 roster is not silently accepted. After qualifying finishes, its complete roster and replacement car number must corroborate the change.

The existing early Haas statement discovery remains as a supplemental source. Other teams do not need to use Haas's announcement wording: their official FIA weekend entries provide the common confirmation. Contradictory team/FIA evidence requires review.

## Checks, scoring and failures

Checks run hourly, starting seven days before the race, for active seasons and eligible unpublished GP events after the opening round. The current/upcoming weekend takes priority over older unpublished races so a backlog cannot indefinitely delay its check. The existing three-event batch limit, retry interval, leases and concurrency checks remain in force.

Original predictions, receipts and saved driver IDs are retained. Existing GP picks follow the confirmed replacement through the existing carry policy. Matching existing manual rules can receive the official identity proof without changing their policy, note or ownership, allowing results to use the correct replacement identity. Manual policies take priority; Sprint/championship policies and published results are preserved. Repeated checks do not duplicate rules, drivers or league announcements. Results use the saved official proof and qualifying identity to match the replacement's actual car number. A source link appears in the player notice.

If the FIA list is unavailable, unpublished or cannot be read, the app retains existing proof and checks OpenF1. The visible status states that the FIA check remains pending and will retry hourly; it never claims a successful FIA check in that case. An unresolved qualifying/race conflict still blocks automatic GP publication. A later FIA driver-change decision after the selected entry list, conflicting list versions, changed existing automatic policies, two changed seats within one team, or unclear transfers require updated official entries/organiser review. This cannot guarantee instant updates before the official sources publish or when they contradict each other.

## Packaging

PDF.js 5.6.205 and its canvas runtime 0.1.100 are pinned in package.json/pnpm-lock.yaml. Next keeps PDF.js external and explicitly includes its ESM worker and platform-native canvas dependencies in the standalone build. No external PDF service, executable, secret, environment variable or database migration is required. The standalone runtime was checked by loading the real two-page FIA PDF using only its packaged dependencies. AMD64/ARM64 image builds still run during the normal publication workflow; no VPS update has been performed.

## Verification

The live read-only São Paulo check on 8 November 2026 discovered the official FIA entry list, checked 22 race drivers across 11 teams, and produced exactly one Ocon-to-Câmara GP carry rule with FIA proof and car #51. OpenF1's race roster still named Ocon, while qualifying corroborated Câmara. No real league records or player notifications were changed.

Automated coverage includes each of the 11 teams independently, simultaneous replacements at different teams, complete-table validation, footnotes/FP1 exclusion, latest-document discovery, later driver-change detection, wrong GP/year/weekend rejection, source failures, saved-proof reuse, empty upcoming OpenF1 entries, full automatic result import and current-weekend scheduling priority. A checked-in official FIA PDF is a parser regression fixture; its public source and retrieval date are recorded below. All 183 automated tests, TypeScript and the production build pass in the release checkout. The standalone PDF runtime successfully read the regression fixture, including its replacement driver identity. Included in release 0.8.46; installation on the VPS remains a separate step.

Sources (retrieved 8 November 2026):

- https://www.fia.com/documents/championships/110/2026
- https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_entry_list.pdf
- https://www.haasf1team.com/news/team-statement-driver-update-0
- https://api.openf1.org/v1/drivers?session_key=11412
- https://api.openf1.org/v1/drivers?session_key=11408
- https://github.com/mozilla/pdf.js
