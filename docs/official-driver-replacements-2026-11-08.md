> Superseded by the all-team FIA entry-list checker. See [current behavior](all-team-driver-checks-2026-11-08.md). The notes below record the earlier Haas-only implementation.

# Official driver replacement automation

The hourly replacement worker now supplements OpenF1 with supported official Haas driver statements. It discovers statement links on the team's news index and reads the article body. Driver names are extracted from the source, not bundled as an Ocon/Câmara exception. No new API key, environment variable or migration is required.

## Confirmation and scope

The initial adapter recognises Haas's explicit departure and GP appointment format, including both full driver names, championship year and a dated weekend. Only HTTPS statement URLs on www.haasf1team.com are followed, with redirects disabled, bounded requests and a four-statement discovery limit. Unsupported formats, other teams' news and rumours do not create confirmation rules. This is not universal free-text news interpretation.

The authoritative OpenF1 race session must fall within the announced weekend and season. The complete opening/current GP lineups must still pass the existing team-seat, identity, cancellation, transfer and completeness checks. Before qualifying, the official announcement can correct a stale race entry by name. Once qualifying has ended, its complete roster must corroborate the officially appointed driver. Qualifying alone never establishes a GP replacement. Practice-only appearances are excluded.

The dated appointment is specific to the announced GP. Ocon leaving Haas for the rest of 2026 does not imply Câmara is confirmed for every remaining race: the actual announcement explicitly names São Paulo. Later appointments require their own supported statement or confirmed OpenF1 race entries.

## Picks, results and repeat checks

Confirmed replacements add the driver if needed and create the existing GP carry rule, retaining saved local identities, original predictions and receipts. Existing organiser policies take priority. Sprint/championship picks and previously published results are unchanged. The rule records its source URL, names, team and date scope, and the player notice links to the official announcement. Existing audit/league announcements record the change. The hourly worker's leases, snapshot checks and duplicate protection remain in place.

Saved official proof can be reused for that same event if the news index later drops the article or the team website is temporarily unavailable. A later contradictory qualifying roster still requires review. A source outage does not block consistent OpenF1 entries or an existing matching manual policy; an unresolved session conflict remains waiting and retries hourly.

The GP results importer uses saved official proof plus the same weekend's qualifying driver identity/car number to reconcile a stale race roster. It preserves the race meeting/session identity and validates the full classification as before. This prevents treating Câmara's car #51 as Ocon's #31. An unconfirmed or contradictory identity blocks automatic publication.

## Verification

Live read-only verification on 8 November 2026 discovered the Haas statement from its news index. Brazil race session 11412 still listed Esteban Ocon, while qualifying 11408 listed Rafael Câmara. The new path returned exactly one GP carry rule from Ocon to Câmara, with the official URL attached, and zero additional rules on repetition. No live league records or player notifications were changed.

Automated coverage includes statement discovery, scope/year/date rejection, unsupported/practice/rumour wording, source failures, duplicate identities/car numbers, pre-qualifying confirmation, qualifying contradictions, persisted proof, manual policies, the real worker persistence path and complete automatic results using the replacement car number.

All 172 automated tests, TypeScript and the production build pass. The initial change was local and unpublished; it is included with the all-team checker in release 0.8.46. Publication and installation are separate steps.

Sources:

- https://www.haasf1team.com/news
- https://www.haasf1team.com/news/team-statement-driver-update-0
- https://api.openf1.org/v1/drivers?session_key=11412
- https://api.openf1.org/v1/drivers?session_key=11408
