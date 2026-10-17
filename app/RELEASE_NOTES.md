# Version 0.8.17

Overview now shows separate GP/Sprint submitted, draft or missing entry status with links to the correct session. Standings include position changes since the previous completed GP weekend, using the existing tie-breaks.

New corrections to published results require a reason and record the organiser, timestamp, previous/new outcomes and per-player point changes. Players can inspect this history in Results & recap. Older corrections cannot be reconstructed.

Race calendar now offers personal, revocable subscription links for automatically updated prediction deadlines. Calendar apps determine refresh and reminder timing. Links expose deadlines only; disabled accounts, removed membership and backup restoration revoke access.

Normal weekend banners show FP1, FP2, FP3, Quali and Race; Sprint weekends show FP1, Sprint Quali, Sprint Race, Quali and Race. FP2/FP3 times import on calendar sync or can be edited manually; missing times are not guessed.

Ordinary league reads no longer take writer locks or rewrite state. Writes retain transactional validation, unchanged transactions skip persistence, and the banner timer pauses in hidden tabs.

All 83 tests and the production build pass. Live PostgreSQL load and external calendar-client refresh still require deployed verification. No database schema migration is required. Local demo accounts, predictions and runtime data are excluded.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.17`, re-pull and redeploy through the existing Portainer stack, preserving environment values and volumes.
