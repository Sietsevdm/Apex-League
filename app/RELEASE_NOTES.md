# Version 0.8.18

Race banners now follow current weather and daylight at the circuit, with sunny, cloudy, rainy and night variants for all 24 included scenes. Night takes priority after dark, while the weather label still describes actual conditions. Provider requests are cached and run separately from league loading and prediction saves. Original artwork remains the fallback when weather or an image is unavailable; manual uploads retain their chosen image. Organisers can preview each condition in Banners.

The compact overview banner groups prediction and GP/Sprint submission badges at the top right, places the countdown below the turquoise prediction button, and shows position and season points underneath. The complete weekend tracker remains at the bottom. Weather sits at the lower right, above the tracker on narrow screens.

The championship table spans the full overview width and retains its existing design, points bars, player highlighting and position-change column. Duplicate overview summary cards and the paddock panel are removed. A dedicated Announcements page appears below Season archive, showing all organiser messages newest first. The existing announcement editor and all other pages remain available.

All 91 automated tests, TypeScript checks and the production build pass locally. A real Spa weather lookup and artwork completeness were verified. No database schema migration or required new environment variable is introduced. Open-Meteo's non-commercial endpoint needs no API key; optional customer access and disable settings are described in WEATHER_BANNERS.md.

Update app and calendar-worker to `ghcr.io/sietsevdm/apex-league:0.8.18` using the existing stack, preserving secrets and persistent volumes. GitHub publication does not update the running VPS automatically.
