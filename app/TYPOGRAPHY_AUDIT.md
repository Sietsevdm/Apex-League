# Interface typography audit — 28 October 2026

This review uses the isolated local demo, not production data. Desktop: 1440 × 1000; phone: 390 × 844. English baseline coverage includes all eleven player pages, all eleven organiser panels, profile, login, invitation joining and league creation. Main content checks cover rendered font sizes, line-height below font size and document horizontal overflow. Representative dashboard, score, organiser, sidebar and authentication screenshots are in ../outputs/weekend-guidance/.

Player pages: Overview, Predictions, Race calendar, Results & recap, Standings, Head to head, Season picks, My season, League & rules, Season archive and Announcements. Organiser panels: Overview, Seasons & lineup, Race weekends, Results & scoring, Members, Announcements, Branding, Banners, Appearance, Site accounts and Data & history.

## Corrections

- Raise the old 7–9 px base text to 10 px, including table headings, prediction field labels, metric captions and sidebar group labels. Existing body and action hierarchy remains intact.
- Replace fixed font sizes in newer sections with Appearance-controlled sizing. Use the existing label, table, body, heading, button and number groups for new guidance and scoring UI.
- Prevent the countdown's large numeric style from leaking into deadline labels; show full time and timezone as readable supporting text.
- Keep sidebar footer actions visible while the navigation list scrolls independently. Sign out retains a 44 px minimum target.
- Stack results metrics on narrow phones so long summaries have room. Keep score tables in an independently scrollable region with a keyboard focus target and descriptive label.
- Contain the My season prediction-history table in its own focusable scroll region when larger fonts exceed its available width.

## Verification

Baseline desktop/phone page checks found no remaining document-wide horizontal overflow or sampled text below 10 px after corrections. All ten font groups were set to 130% in the isolated demo and the eleven player pages were checked at desktop/phone sizes, plus all eleven organiser panels on phone. This caught the prediction-history overflow; its fix is checked again in the final preview. Preview typography is reset afterwards. English/Dutch core guidance copy is supplied; Dutch dashboard, deadline, scoring and organiser layouts receive spot checks.

Sidebar Sign out returns to the real login screen. Sign in with the isolated sample account and a page refresh retain the demo login. Login, join and create forms fit both widths without a horizontal page scrollbar. No test signup, invitation, notification subscription or live account change is performed.

118 automated tests pass, including independent session locks, outstanding-only checklist counts, absence of guessed private submission counts, and demo login-cookie persistence. Production build includes TypeScript checking and passes. The existing Next.js vulnerability advisory remains an unrelated outstanding dependency issue.

This is a representative browser/layout audit, not a guarantee for every possible custom font, 60–180% Appearance combination, language, device or real dataset. Wide data tables intentionally scroll within their own region rather than shrinking their text. Included in version 0.8.25. GitHub publication does not deploy the VPS.
