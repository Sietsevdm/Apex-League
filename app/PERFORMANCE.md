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
