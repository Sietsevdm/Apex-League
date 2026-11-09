# FIA PDF production runtime

The deployed 0.8.48 refresh failed during PDF.js module import with `DOMMatrix is not defined`. Source-level tests had the canvas dependency available, but the bundled production PDF reader could not initialize the required graphics globals. The parser itself never reached the FIA table.

## 0.8.49 repair

The application sends the downloaded PDF on stdin to scripts/fia-pdf-runtime.mjs in a separate Node process. This entry point is copied to the image without being imported by Next. It explicitly initializes DOMMatrix, ImageData and Path2D from the real canvas package before loading PDF.js and its ESM worker through native Node module resolution.

scripts/prepare-fia-pdf-runtime.mjs copies PDF.js, canvas and the current platform's native canvas binding into vendor/fia-pdf. Docker ignores workstation-generated vendor files and builds a fresh platform-specific runtime for AMD64 and ARM64. The final image copies that complete runtime explicitly rather than depending on Next output tracing for dynamic/native modules. The application process has a 30-second extraction timeout and an 8 MB output cap; the PDF process has a 256 MB JS heap cap. The existing 5 MB input/eight-page limit and disabled PDF evaluation are retained. Returned word geometry is checked before parsing.

The Dockerfile mounts the official FIA São Paulo fixture from the builder stage and runs scripts/verify-fia-pdf-runtime.mjs as the application user in the final runtime image. It must extract all 22 expected race driver codes plus CAM/car 51, without source node_modules or inherited graphics globals. A failure blocks image publication. The fixture is not copied into the final image. Unit/API tests continue to check exact FIA identity, real car numbers and roster preservation; an additional isolated packaged-runtime regression test uses a fresh Node process.

## Install

1. In the existing Portainer stack, set APEX_IMAGE=ghcr.io/sietsevdm/apex-league:0.8.49.
2. Redeploy app and calendar-worker with Re-pull image enabled. Keep the existing configuration and data volumes; no database migration or new setting is required.
3. Return to Administration > Race weekends > Driver replacements, choose the weekend/session and click Refresh driver lineup from FIA again.

The failed refresh did not replace the saved lineup. The normal requirement for an FIA entry list for the selected weekend still applies. This change also repairs automatic FIA replacement checks, which use the same PDF reader.

Validation: all 189 automated tests and TypeScript pass, including isolated production dependency packaging and a fresh-process FIA PDF extraction. Both container architectures must also pass the final-image smoke check before publication.
