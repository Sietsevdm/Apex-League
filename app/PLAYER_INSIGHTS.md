# Player insights — local preview

Version 0.8.37, 1 November 2026. GitHub publication does not install this update on the VPS.

## Placement and presentation

The former Head to head sidebar entry is renamed Weekend predictions. The separate two-player table is removed. A compact Rival of the weekend card sits above one full-width prediction grid. Everyone shows all season members; You + rival filters that same grid to the viewer and selected rival. Compare rival activates this filter. Against the grid starts collapsed inside the grid panel. My season gains Overview / Personal bests sub-view buttons; existing charts, awards, history and receipts remain on Overview.

Teal denotes the rival and personal records. Gold identifies against-majority choices; existing driver chips retain their team background, contrasting text and local logo. The user's corresponding grid cells get gold outlines and hidden accessible labels. Highlights show three cards initially, with remaining picks inside a disclosure. Personal record cards share heights, number baselines and event-footer alignment; phone layouts stack the cards. Rival labels reserve equal height so values align even when labels wrap.

## Against the grid

- Uses the selected event and GP/Sprint context and existing `predictionsVisible` gate. Nothing is rendered before the post-qualifying reveal time.
- Requires the viewer's submitted entry and at least two other submitted season members. Drafts, non-members and the viewer's own vote are excluded from the reference group.
- A majority means strictly more than half of that reference group chose the same driver in that exact category. Tied or merely most-popular pluralities do not count.
- A highlight appears when the viewer's saved pick differs from the majority. This compares original submitted selections, not replacement-adjusted scoring, and includes No retirements as a valid choice.
- Missing submissions and absent majorities get a neutral explanatory state. No new data endpoint or access permission is introduced.

## Rival of the weekend

Select the season member with the smallest absolute championship points gap to the viewer. Equal gaps use rank distance, then stable player ID order. The card shows points gap, viewer/rival positions and the differing-pick count for the selected event/session. Differences appear only after reveal and only when both players have submitted.

Weekend predictions initially shows Everyone. You + rival starts with this recommended rival; players can choose any other rival manually and use Compare rival to return to the recommendation. With fewer than two season members, the recommendation is omitted. This recommendation is calculated from the current published standings, not frozen historical standings for the selected event. It does not write a permanent rivalry or change points.

## Personal bests

Records cover the selected season and player:

- Best weekend: highest combined GP and Sprint points from a complete published weekend. Ties retain all matching event names.
- Most exact positions: maximum exact finishing positions across that complete weekend, using the shared scorer.
- Longest scoring streak: consecutive complete weekends with a positive points total. Missing or zero-score entries break the streak. Pending weekends and fully void weekends are skipped. The footer also reports the current streak.

Practice rounds and season title bonuses are excluded. Sprint weekends wait for both GP and Sprint publication, preventing partial totals from becoming records. Scores respect the existing replacement and void-category rules. New personal best means the latest complete weekend strictly exceeded the previous record; a tied record does not receive that badge. A first recorded weekend establishes the baseline. Records are recalculated, not persisted; result corrections can change them. No extra championship points or notification is generated.

## Preview and validation

The existing isolated demo at http://localhost:3008/ uses `weekend-social-preview.json`. Its results and dates are simulated. Weekend predictions defaults to Singapore and recommends Jordan: a four-point championship gap and ten different GP predictions. Choose the Japanese weekend for the private state. On My season, select Personal bests to see 23 points, 10 exact positions and a two-weekend scoring streak for Sietse. Switch demo accounts for different records.

All 138 tests and the production build pass. Six new tests cover majority privacy/membership/draft exclusions, tied majority behavior, stable rival selection, complete-weekend records, streak breaks, practice/fully void/bonus exclusions, no source-state mutation and strictly improved records.

Browser checks cover the rival comparison action, the hidden future-weekend state, aligned desktop record card/value/footer positions, identical rival metric baselines on phone, loaded driver branding, desktop and 390/320 px phone layouts, contained table scrolling and no console errors. An accessibility-label positioning issue that initially widened the phone page was fixed; document widths are 375 px at a 390 px viewport and 305 px at a 320 px viewport, allowing for the scrollbar.

Screenshots: `outputs/player-insights/` in the workspace. Server session: 96819. Included in 0.8.37. No VPS installation or live league data change.

Unified-grid refinement verified: one table, eight Everyone rows, two focused rows, manual rival changes, collapsed/expanded majority highlights, Sprint columns and hidden future predictions. Desktop and 390/320 px phone widths have no page overflow. The internal compare page ID is retained so existing browser navigation history continues to resolve.
