# Version 0.8.37

Weekend predictions replaces Head to head with a single wider prediction grid. Everyone / You + rival filters keep focused comparisons in the same table. A compact Rival of the weekend card recommends the closest championship challenger, shows the points gap and reveal-safe differences, and opens the focused grid. Against the grid highlights your choices against a strict majority of other submitted players; its details start collapsed. Driver colors, logos, readable timing codes and existing privacy rules are retained. Wrapped sidebar labels now align left.

My season now has Overview / Personal bests views. Personal records show highest complete-weekend points, most exact positions and longest/current scoring streaks, with badges for strict record improvements. Shared scoring handles replacements/voids; practice, title bonuses and fully void weekends are excluded. No extra points, private-prediction access, database migration or new setting is introduced. See PLAYER_INSIGHTS.md for definitions.

Validation: all 138 automated tests and final production build pass. Browser verified desktop, 390/320 px phones, aligned record cards, Everyone/focused filters, rival changes, collapsed highlights, Sprint and hidden future-weekend states without page overflow.

After the GitHub release build succeeds, update the existing Portainer stack with `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.37` and Re-pull image enabled. This updates app and calendar-worker together. Preserve existing settings, secrets and volumes. GitHub publication does not install this update on your VPS.
