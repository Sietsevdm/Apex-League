# Player guide (local preview)

The player guide opens on the first authenticated visit for each account in a browser. Dismissing, finishing or following a guide shortcut records `apex-player-guide:v1:<userId>` in browser local storage. It is a device/browser preference, not an account-wide setting; clearing site storage or using another browser can show the guide again. If storage is blocked, the guide still works but dismissal cannot persist.

Players can always reopen it with **Player guide** in the sidebar (inside the menu on mobile), or the book button in the top bar. All six topics support direct selection, Back/Next navigation, and shortcuts to the relevant screens. Opening the guide never enables notifications or changes picks.

Topics: overview, submitting predictions and separate Sprint deadlines, profile push reminders and iOS setup, calendar downloads/subscriptions, season picks and rules, standings/results and prediction privacy. Content follows the selected English/Dutch language. Reminder delivery remains dependent on existing server configuration and browser support.

Topic navigation explicitly aligns each button's content to the start, keeping number badges and labels in consistent columns for selected and unselected topics (8 November 2026).

Accessibility: native modal dialog with labelled heading, description, focus trapping, inert background, Escape dismissal and focus restoration. The content fits small screens with a horizontally scrollable topic list and vertically scrollable dialog.

## Local preview

From the `app` directory in PowerShell:

```powershell
$env:DEMO_MODE = 'true'
$env:DEMO_DATA_FILE = 'player-guide-preview.json'
node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3011
```

Open http://127.0.0.1:3011 and sign in using a sample account shown by the demo. The preview uses an isolated demo data file, with no production database or real notifications configured.

Review: first sign-in opens the guide; navigate all topics; test shortcuts; dismiss and reload; reopen from both entry points; change language; try a phone-sized window and keyboard-only navigation. A different demo account gets its own first-visit state.

Validation: TypeScript passes; all 156 existing automated tests pass. The dev server reports ready on port 3011. Automated browser QA is unverified because loopback access is blocked in this session and the preview panel tool failed. No GitHub publication, release or VPS installation performed.

Build verification: Turbopack is blocked by Windows junction permissions. The webpack fallback is blocked by DNS/network access to fonts.googleapis.com for the existing Barlow Condensed and DM Sans fonts. No production build is verified in this session.



## Windows launcher

Double-click Start-Player-Guide-Preview.cmd in the app folder. It starts a dedicated demo server window, waits for an HTTP 200 response, and opens the browser only when ready. Keep the server window open while reviewing. This launcher must run on your own Windows desktop; the assistant's restricted session cannot expose its server to the browser. Existing Google Fonts may fall back in development if internet access is unavailable.

Correction: the previous startup message did not establish a reachable preview. No successful HTTP or visual check has been completed.

