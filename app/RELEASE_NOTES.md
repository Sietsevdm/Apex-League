# Version 0.8.49

Fixes FIA lineup refresh failing with DOMMatrix is not defined in the production container. PDF extraction now runs in an isolated native Node process, with DOMMatrix/ImageData/Path2D loaded before PDF.js. Its PDF.js module, ESM worker, canvas package and architecture-specific native binding are packaged explicitly; Next.js no longer wraps these imports.

Each finished AMD64/ARM64 image must read the official FIA São Paulo PDF fixture as the non-root application user before it can publish. This catches missing native libraries, omitted packages, worker import errors and graphics bootstrap failures in the actual runtime image. The fixture is mounted only during the build check, not retained as application data.

PDF size/page checks, disabled evaluation, process timeout, memory limit and validated output remain in place. The saved lineup and original predictions are unchanged when a provider or PDF fails. No database migration or new settings are required.

Update both app and calendar-worker to `APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.49` with Re-pull image enabled, then retry Administration > Race weekends > Driver replacements > Refresh driver lineup from FIA.

Validation: all 189 automated tests and TypeScript pass, including isolated production dependency packaging and a fresh-process FIA PDF extraction. Both container architectures must also pass the final-image smoke check before publication.
