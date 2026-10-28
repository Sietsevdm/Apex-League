# Version 0.8.26

The mobile weekend banner is easier to scan: the race title comes first, status labels are quieter, GP/Sprint buttons share a row and the main prediction button spans the width. Countdown columns are unboxed and deadlines, season metrics, weather and weekend progress follow a clear reading order.

A lighter translucent overlay reveals more of the circuit artwork without blur. Exact deadlines, timezone labels, submission states and actions remain available. Desktop styling is retained.

Validation: all 118 tests and TypeScript pass. Browser checks cover 320/390 px phones, desktop, the forecast dialog and navigation to the saved Sprint draft. The existing Next.js dependency advisory remains outstanding.

Update the app and calendar worker to `ghcr.io/sietsevdm/apex-league:0.8.26` with Re-pull image enabled. Preserve existing secrets and volumes. No new environment variable, database migration or scoring change is required. GitHub publication does not install this update on your VPS.
