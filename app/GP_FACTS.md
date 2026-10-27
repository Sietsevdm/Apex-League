# Grand Prix facts

Researched and checked: **27 October 2026**. Version 0.8.19: **324 facts across 27 venues**, with 12 facts per venue.

The overview places one **Did you know?** card immediately after the race banner and before **The championship fight**. It uses the exact event selected by the banner, including organiser overrides and the existing Monday switch. Facts cover circuit origins, local landmarks, layout quirks and memorable racing history. Every individual fact carries its own primary-source link, displayed beneath the text.

## Rotation and matching

- The client chooses once per circuit per document visit and remembers that choice across timer ticks, background state refreshes and screen remounts.
- A full browser reload chooses again, excluding the previous fact saved for that circuit in sessionStorage. Selection memory is per browser tab; it is public trivia, not league data.
- If browser storage is disabled, the card still works and remains stable during the visit, but consecutive reloads cannot guarantee avoiding a repeat.
- Provider circuit IDs take priority, then recognised circuit names. Race-name fallback is used only without an explicit circuit identity and only for unambiguous names. Madrid and Barcelona remain separate, as do Monza and Imola, and Austin/Miami/Las Vegas.
- Unknown circuits and practice rounds have no fact card; no generic fact is passed off as a verified fact about an unknown track.
- English fact text is marked with lang="en". The heading, loading text and Source label follow the English/Dutch interface language. The facts themselves remain English.

## Coverage and primary guides

The included 24 artwork venues are covered, plus Barcelona, Zandvoort and Imola for current/older season imports. Historical race names at the same recognised venue reuse that circuit's fact bank. Each record in the catalogue links to its exact supporting reference; the table lists the main guide for each venue. Additional historical sources include FIA, official circuits and Porsche Motorsport.

| GP / venue | Catalogue key | Facts | Main guide |
| --- | --- | ---: | --- |
| Bahrain | bahrain | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/bahrain) |
| Saudi Arabia | jeddah | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/saudi-arabia) |
| Australia | albert-park | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/australia) |
| China | shanghai | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/china) |
| Japan | suzuka | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/japan) |
| Miami | miami | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/miami) |
| Canada | montreal | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/canada) |
| Monaco | monaco | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/monaco) |
| Barcelona | barcelona | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/spain) |
| Great Britain | silverstone | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/great-britain) |
| Austria | spielberg | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/austria) |
| Belgium | spa | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/belgium) |
| Hungary | hungaroring | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/hungary) |
| Netherlands | zandvoort | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/netherlands) |
| Italy | monza | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/italy) |
| Azerbaijan | baku | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/azerbaijan) |
| Singapore | singapore | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/singapore) |
| United States | austin | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/united-states) |
| Mexico | mexico-city | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/mexico) |
| Sao Paulo | interlagos | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/brazil) |
| Las Vegas | las-vegas | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/las-vegas) |
| Qatar | lusail | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/qatar) |
| Abu Dhabi | yas-marina | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/united-arab-emirates) |
| Turkiye | istanbul | 12 | [Formula 1](https://www.formula1.com/en/racing/2021/turkey) |
| Portugal | portimao | 12 | [Formula 1](https://www.formula1.com/en/racing/2021/portugal) |
| Madrid | madrid | 12 | [MADRING](https://www.madring.com/en/circuit) |
| Emilia-Romagna | imola | 12 | [Formula 1](https://www.formula1.com/en/racing/2025/emiliaromagna) |

## Maintenance

- Catalogue: lib/gp-facts-data.ts. Each string uses the pack's primary reference; specific historical facts can override it with their own source. Retain attribution when editing.
- Matching, random selection and document-visit cache: lib/gp-facts.ts. Rendering: components/GrandPrixFact.tsx, placed next to the banner using the same selected event in components/screens/Home.tsx.
- Append facts to the end of a pack. Its numbered IDs are persistent; inserting or reordering existing entries would change remembered IDs. Fixing an existing fact's wording/source in place retains its ID.
- Research new entries against primary sources. Prefer completed historical events and explicit years; avoid changing win totals, current lap records, ticket prices and unqualified claims about future schedules. Circuit measurements and scheduled lap counts in the catalogue are tied to the referenced layout/year where appropriate.
- The catalogue is bundled with the authenticated overview. There is no per-refresh external fact request, added database table, cron job or content-generation service. New facts require an app rebuild; clicking Source opens the cited reference without sending league information.

## Verification

All 106 tests, TypeScript and the production build pass. Six fact-specific tests check coverage/unique source records, known circuit IDs, ambiguous venue names, no-repeat random choice, stability across remounts and correct ordering between banner and standings. Storage-denied fallback is covered.

The actual local browser preview confirmed the Japanese GP card in place and a different fact after reload (Fuji's first Japanese GP, then Suzuka's Ferris wheel). Exactly one fact was present, no page-width overflow was detected at the existing viewport, and browser error logs were empty. Local QA screenshot: workspace outputs/gp-facts-preview.jpg (kept outside the publishing package). Mobile styles are included; no device-size override was used. The preview stays running at http://127.0.0.1:3001/ with simulated demo dates. GitHub release publication does not install the update on a live server. The existing Next.js dependency security advisory remains outstanding.
