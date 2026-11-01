# Weekend prediction grid and awards

Version 0.8.35, 1 November 2026. GitHub publication does not install the update on the VPS.

## Where to find them

- **Weekend predictions:** one full-width grid replaces the separate Head to head comparison. Everyone / You + rival filters preserve focused comparisons in that same grid. Against the grid is collapsed by default, and Compare rival activates the focused filter.
- **Results & recap:** Weekend awards appears beneath the weekend/session controls and above the points breakdown.

## Prediction grid

Each season member has one row. GP shows P1–P10, pole, fastest lap, first retirement and Driver of the Day. Sprint shows P1–P8, pole, fastest lap and first retirement. Only submitted entries are displayed; draft-only and missing entries show No submission and dashes.

Driver chips use three-letter timing codes, locally bundled team logos and the saved team background color, with contrasting text. Full names and teams remain in accessible labels and hover titles. Calendar imports retain the provider's driver code when supplied. Existing three-letter IDs are preserved; older provider IDs use normalized surnames with Zhou/de Vries exceptions. Unknown/custom teams retain a marker, and unavailable drivers use a neutral dash. No retirements is a separate neutral NONE label.

The table scrolls horizontally inside its own container, retaining the player-name column. GP/Sprint and event selection remain available on phones. The rest of the page does not widen with the table.

Privacy uses `predictionsVisible` both here and in the API: the relevant session must be locked, and its qualifying start plus one scheduled hour must have passed, or its result must already be published. This is a calendar estimate rather than live completion detection. The Head to head comparison now uses this rule too, replacing its earlier edit-deadline message. No new endpoint, permission or private-prediction payload is introduced. Existing API polling supplies newly revealed entries.

## Award rules

Awards require the GP result and, for Sprint weekends, the Sprint result to be published. Practice rounds do not qualify. Pending weekends show an explanatory placeholder. Computation uses only submitted picks from season members and the existing scorer, including confirmed replacement mappings and void categories. Ties are shared. Awards never add championship points, persist new records or modify predictions/results; result corrections recalculate them automatically.

- **Boldest correct pick:** find correct predictions in each scoring category (exact position, pole, fastest lap, retirement and GP Driver of the Day). Compare the proportion of submitted entries choosing that same effective pick in that category and session. The lowest proportion wins across both sessions. At least two entries are required; unanimous choices do not qualify. All equally rare winners/picks appear in Winning picks, with the support count and denominator. The podium bonus is excluded from this calculation because it is a combination rather than a single selection.
- **Perfect podium:** every GP entry earning the confirmed five-point exact podium bonus wins. A void podium bonus cannot earn this award.
- **Biggest comeback:** the largest positive championship rank gain attributable to this complete weekend, comparing standings before and after it. Only earlier dated non-practice events contribute to the baseline; future rounds and season championship bonuses are excluded. At least one earlier published session is required. No positive movement means no winner.

## Isolated preview

Run `node --import tsx scripts/setup-weekend-social-preview.ts` from the app directory to recreate `.data/weekend-social-preview.json`. This writes only that named demo file. Start the app with `DEMO_MODE=true`, `DEMO_DATA_FILE=weekend-social-preview.json`, and `APP_URL=http://localhost:3008`.

Open http://localhost:3008/:

- Head to head defaults to Singapore: revealed GP/Sprint picks, eight players, and independent draft examples.
- Choose Japanese Grand Prix to inspect the hidden state.
- Results & recap defaults to Italian Grand Prix: simulated completed results with Jordan's rare correct selections, exact podium and four-place comeback. Choose Singapore for pending awards.

Names, times, entries and results in this file are simulated. Normal demo files and live league data are unchanged. No worker is started for the preview.

## Verification

All 131 tests, TypeScript and production build pass. Six new tests cover timing codes/team rendering, pre-reveal privacy, drafts, published-session readiness, practice/void exclusions, ties, rarity, positive comeback movement, future/bonus exclusion and scoring replacements without changing saved picks.

Browser checks cover desktop and 390 px phone layouts, eight-player GP and Sprint grids, working horizontal scrolling with sticky names, loaded team logos, a hidden future weekend, pending/completed awards, winning-pick explanations and Dutch grid labels. Phone document width is 375 px inside the 390 px viewport (scrollbar included), with table overflow contained. No browser console errors were reported. Screenshots are in the workspace's `outputs/weekend-social/` directory. Preview server session: 50437, port 3008.

Section-order refinement verified in the browser: Head to head comparison first, Weekend prediction grid second. Updated production build passes. Screenshot: outputs/weekend-social/grid-below-comparison.jpg.

## Results & recap layout refinement

The page now starts with weekend/player selectors and one score summary. Its GP/Sprint buttons are the only session controls; a small winner/leader label replaces the four large metric cards. Awards and weekend standings follow. Prediction breakdown and Confirmed outcome start collapsed; source details and expandable correction history are inside the latter. These details close again on weekend/session changes. All scoring rows, replacement annotations and published outcomes remain available. Pending standings display Pending. Browser checks cover desktop and phone widths, player scores, full detail rows and pending Sprint state. Included in version 0.8.35.

1 November 2026 - Results alignment verification (local preview): removed the player selector's inherited 8 px top margin (both selectors now 45 px high with matching top edges). Scoped zero padding correctly on detail cards to remove double indentation. Equal desktop detail columns, 72 px flex-aligned disclosure headers with explicit arrows/status alignment, consistent 24 px desktop/18 px phone body padding, right-aligned points headings and values, baseline-aligned outcome labels/values, and correctly scoped correction-history padding. Details stack below 1100 px. Browser verified desktop 1506 px, tablet 1024 px, phones 390/320 px, expanded details and pending Sprint labels; equal award-card dimensions and winner baselines, no label overlap, no page overflow or console errors. Production build passes. Screenshots: outputs/weekend-social/results-alignment-desktop.jpg and results-alignment-mobile.jpg. Preview http://localhost:3008/, server session 50437. No publication or VPS installation.
