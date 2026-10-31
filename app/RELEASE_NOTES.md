# Version 0.8.32

Prediction rows are more compact: repeated Winner/Second place/Position labels are removed, numbers align with driver fields, and surrounding padding is reduced. Accessible picker labels and reorder controls remain. The redundant submission-overview panel is removed from predictions; submission indicators remain on Standings.

Positions 1, 2 and 3 now use matching gold, silver and bronze in prediction rows, standings ranks and podium position labels.

Calendar deadline downloads and subscription setup now occupy separate side-by-side cards on desktop and stack on phones.

The Constructors’ champion menu now matches driver pickers, with team logos, team-color backgrounds and contrasting text in both the menu and selected field. All saved constructor values, deadlines and scoring remain unchanged.

Validation: TypeScript and production build pass; browser checks confirm compact centered rows, matching medal colors, no redundant submission panel, a 390 px layout without horizontal overflow, equal calendar-tool cards and all 11 constructor logos plus the selected-team color. All 124 automated tests pass.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.32` with Re-pull image enabled. Preserve secrets and persistent volumes. No database migration or environment change is required. GitHub publication does not install this update on your VPS.
