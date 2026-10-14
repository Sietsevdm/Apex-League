# Performance review — 14 October 2026

## Report baseline

PageSpeed reports captured at 17:36 Europe/Amsterdam:

| Metric | [Mobile](https://pagespeed.web.dev/analysis/https-apex-mr-gadget-xyz/zgf2v9brso?form_factor=mobile) | [Desktop](https://pagespeed.web.dev/analysis/https-apex-mr-gadget-xyz/zgf2v9brso?form_factor=desktop) |
| --- | --- | --- |
| Performance | 87 | 100 |
| First contentful paint | 2.6 s | 0.7 s |
| Largest contentful paint | 3.2 s | 0.7 s |
| Speed index | 4.4 s | 0.7 s |
| Total blocking time | 0 ms | 0 ms |
| Layout shift | 0 | 0 |

These are single lab runs of the public login page, with no real-user field data. They do not measure authenticated prediction or admin screens.

## Changes prepared locally

- Replace two Google Fonts CSS imports with Next.js self-hosted DM Sans and Barlow Condensed. Preserve typography family choices and configured weights. Browser font requests now use the app's cacheable static assets; the build downloads the fonts and therefore needs network access to Google Fonts.
- Load share cards, admin extras, calendar synchronization controls and other optional feature components on demand. Load the WebAuthn browser library only when starting a passkey ceremony. Keep the passkey sign-in button available immediately.
- Add high-priority login image preloads with separate mobile/desktop media conditions. URLs come from the actual public configuration, retaining custom login images and mobile crops. These hints appear when login configuration loads; they do not remove the initial configuration API dependency.
- Give the login page a main landmark, addressing the report's accessibility finding. Supply the login shell with its configured body font rather than allowing controls to fall back to a browser serif font.

The report attributes 2,130 ms of potential mobile savings to render-blocking requests, including two Google Fonts stylesheets with 1,500 ms combined duration. This is an audit estimate, not a measured improvement or a guarantee that times will fall by that amount. It also flags 88 KiB unused JavaScript and missing high image fetch priority.

## Validation and release limits

- Production builds and the existing 48 regression tests pass.
- JavaScript script tags in the locally generated initial HTML total 769,296 bytes before these changes and 728,789 bytes afterwards: 40,507 bytes (5.3%) less, before HTTP compression. This includes framework scripts and is not equivalent to PageSpeed's unused-JavaScript estimate or total transferred page bytes.
- Production preview verified the dashboard, deferred profile/passkey controls, login main landmark, font family and responsive high-priority image hints.
- No VPS deployment or fresh production PageSpeed run has been performed. Re-run both report variants after deployment; record the results here. Confirm fonts load locally and custom login artwork still uses the correct crop.
- Next opportunities require separate measurements: splitting the remaining large league module away from login, server-rendering public login configuration, and profiling authenticated API payloads. Avoid changing scoring or privacy logic based solely on this public-page audit.

## Follow-up mobile report — 14 October, 17:58

[New mobile report](https://pagespeed.web.dev/analysis/https-apex-mr-gadget-xyz/5dtnp6sc36?form_factor=mobile), reviewed after release publication:

| Metric | Previous | Follow-up |
| --- | --- | --- |
| Performance | 87 | 95 |
| Accessibility | 98 | 100 |
| First contentful paint | 2.6 s | 1.4 s |
| Largest contentful paint | 3.2 s | 2.6 s |
| Speed index | 4.4 s | 3.9 s |
| Total blocking time | 0 ms | 40 ms |
| Layout shift | 0 | 0 |
| Estimated render-blocking savings | 2,130 ms | 300 ms |
| Estimated unused JavaScript | 88 KiB | 51 KiB |

Best practices and SEO remain 100. The render-blocking audit now lists only the app stylesheet (9.8 KiB), with no Google Fonts stylesheet requests. The login main landmark is present. This is consistent with the released changes being served, though the report does not independently identify the installed app version.

The LCP breakdown shows 610 ms resource load delay, 30 ms loading and 1,620 ms element render delay. The next candidate is rendering login sooner and separating its bundle from the authenticated league interface. The image transfer itself is small. Compare multiple fresh runs before attributing all score/timing differences to the release; these remain lab measurements of the public login page.

## Next login optimization — 0.8.13

The public page now renders its configured login text, typography and responsive high-priority image hints on the server. `AppEntry` loads only the login UI for anonymous visitors and imports the league interface after the authenticated API responds. Returning sessions see a loading screen while the API validates the account and session version; no private state is embedded in the initial page.

Public settings use a read-only database projection of name, login copy, typography and theme. The page neither locks nor rewrites the league document and is served with private/no-store cache headers. The database is consulted per request, so changes remain fresh; database latency now contributes to server response time and should be measured on the VPS. A failed settings read shows safe default branding and a retry message. The API still initializes fresh installations on first use.

Anonymous login needs no startup state or registration API requests. Season choices load when opening registration. Successful sign-in reuses the returned authorized state instead of immediately fetching it again. Logout unmounts the league and retains current custom login copy. Deferred feature boundaries keep the surrounding app visible while a feature loads. Anonymous image discovery scans only custom login artwork, without traversing the packaged race banners.

Initial script tags in the local production response total 638,966 uncompressed bytes versus 728,789 in 0.8.12: 89,823 bytes (12.3%) less. Framework/runtime scripts are included; these are not compressed transfer bytes or a PageSpeed prediction. Login content and artwork hints are present in initial HTML rather than being revealed after a browser API request.

Validation: all 52 tests and production build pass. New checks cover the public allowlist, server-rendered custom branding, read-only settings behavior, login image selection, password authentication, registration, refreshed sessions and logout privacy. Browser checks covered sign-in/logout with custom branding, on-demand registration choices and a 390px mobile layout without horizontal overflow; no browser console errors were observed. The production PostgreSQL projection still needs verification on the VPS; local storage checks use isolated demo files, and the database-unavailable HTML/cache path was exercised separately.

These changes are included in 0.8.13. Re-run mobile PageSpeed after installing this release and compare multiple runs with the 95-point 0.8.12 result.

## Background activity — 0.8.13

Automatic league reads now use one cancellable, completion-based scheduler rather than a fixed interval. Visible/online tabs check at most once per minute after completion. Hidden tabs and tabs the browser reports offline have no scheduled reads; an active read is aborted and its result discarded. Returning to a visible/online tab (or focus) refreshes only if the last completed check or successful state-bearing save is at least a minute old. Repeated focus events do not cause repeated requests.

Only one automatic read may be in flight. An aborted read retains its slot until its promise settles, even if the request ignores cancellation. Saves pause automatic reads, invalidate older results, and resume polling only after all pending writes finish. Explicit saves, prediction autosave and submissions continue if the user switches tabs; they are not cancelled. Logout/unmount removes listeners, timers and pending refresh callbacks. Errors retry at the normal interval rather than in a tight loop.

The initial authenticated-state request remains necessary for session validation; public login does not poll. Update notices run once when the admin component opens and on explicit request. The independent VPS calendar/backup worker continues on its existing schedule. Server-enforced deadlines and privacy are unchanged; pausing browser refresh never reopens a deadline.

Validation: all 57 tests and the production build pass. Five simulated-time tests cover stale/fresh focus, hidden/offline transitions, slow and aborted requests, overlapping writes, response races, failure retry and cleanup. No request-count reduction or battery saving has been measured in production. This change and the preceding login optimization remain unpublished.

Next priorities identified in the current code:

1. Narrow authenticated API responses to the selected season/page and fetch historical archives only when opened. Current responses clone the league document, with privacy filtering afterwards. Measure payload sizes and retain all existing access checks while narrowing responses.
2. Fetch external calendar/results/lineup data before acquiring the database write lock, then revalidate permissions, season state and results before committing. These manual import actions currently await provider requests inside the transaction; slow provider responses can block unrelated league requests.
3. Split the remaining league pages into separate modules, loading admin/history/results code only when visited. This follows [code-splitting guidance](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting). Measure predictions, standings and admin screens with a realistic season history before choosing the next target.

## Season payloads, import concurrency and screen splitting — 0.8.13

### Smaller responses

The updated client requests `X-Apex-Scope: season`, `archive` or `admin`, and optionally `X-Apex-Season`. Initial authentication, normal refreshes and mutation responses retain this context. Season responses include full details for the selected season and lightweight metadata for other seasons; archive responses carry leader/points summaries with no event/prediction history. Selecting an archived card loads that season's details. Audit history is limited to admin scope. Saved banner-library photos are available to server image matching without being cloned or serialized into scoped responses. The user directory and global branding/announcements remain available for existing league controls.

These headers select a response shape, not an authorization grant. Player requests for admin scope are rejected. Existing API checks still hide other players' unlocked picks, drafts, passwords, passkey secrets and registration invitations. Older clients without a scope header retain the compatible full response. Exports, backups, season copying and destructive actions continue to operate on full server state; projecting a response does not replace stored league data.

Navigation aborts obsolete loads and ignores mutation responses belonging to an earlier navigation. Failed navigation leaves the previous data/page available with an error. New-season creation selects its newly created full lineup automatically. Switching seasons preserves the active admin tab while temporarily disabling stale controls; weekend-specific results and editor state reset for the newly selected season. Registration controls retain metadata for every season.

Seven-season isolated production fixture, same organiser account, uncompressed JSON bytes:

| Response | Bytes | Reduction from full |
| --- | ---: | ---: |
| Compatible full response | 101,162 | — |
| Selected-season response | 17,290 | 82.9% |
| Archive summary response | 4,236 | 95.8% |

This is a synthetic fixture with six copied historical seasons. Production savings depend on actual history, branding/images and account data. It is not a PageSpeed score or compressed transfer measurement. Archive summaries still calculate standings on demand, and the underlying JSON database document is still read/written by the existing transaction layer.

### Imports without a network wait under lock

Manual calendar, previous-year lineup and result imports now have three phases: authenticate and snapshot the target in a short transaction; fetch Jolpica data with no league write lock held; authenticate again and validate the saved target before applying/returning the result. Schedule, lineup, archive, results-publication or actor-version changes invalidate the operation. Calendar error reporting remains available. Concurrent prediction saves do not invalidate a target that otherwise stays unchanged. Imported results remain a preview requiring explicit confirmation/publication.

A regression test holds the provider response pending while a player's league read completes, then edits the target and confirms the stale import is rejected. This tests the local serial transaction path; production PostgreSQL timing and lock contention still need measurement after deployment. The existing daily worker remains separate and unchanged.

### Screens loaded on demand

The league component now owns the shell/navigation only. Player screens, archive, profile and admin controls live under `components/screens/`. Each screen is dynamically imported; admin tabs additionally load their own controls when selected. Shared presentation helpers remain in `Shared.tsx`. Layout, wording and scoring behavior are preserved.

### Verification

All 61 regression tests and the production build pass. New checks cover scoped scoring/privacy, archive summaries, historical selection, creation from an archived lineup, reusable banner photos, import success, access checks before fetching, concurrent player reads and target/permission races. Production-preview browser checks covered archives and historical standings, current-season switching, predictions, results, admin overview/race weekends/lineup/banners/branding/members, player-role switching, mobile archive layout and absence of browser console errors.

The build explicitly excludes `.data` from standalone tracing so local runtime/preview/test files are not packaged. The final standalone output contains no `.data` directory. No schema migration, published release, VPS deployment or new production PageSpeed run has been performed for these changes.
