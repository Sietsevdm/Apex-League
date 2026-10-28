# Login artwork — 0.8.22

Night garage is the user-selected default. It matches Apex's midnight navy, turquoise and warm gold palette. The existing Apex A mark and league name are rendered separately in HTML, so background cropping cannot cut them off. The desktop panel uses 76% background opacity and a subtle 6 px blur; mobile uses the stacked layout with its existing dark gradient.

Three original backgrounds were made with the built-in ImageGen tool, inspired by user-provided motorsport celebration, garage and Austin sunset photographs. They are original generated scenes, not copies of the reference photographs. Each has a desktop WebP and a smaller mobile WebP in `app/public/`. Night garage files are `login-garage.webp` and `login-garage-mobile.webp`; Race celebration uses `login-grid`, and Golden-hour circuit uses `login-sunset`.

Custom mounted login/login-mobile files retain precedence. There is no new setting or database change. See [deployment](../app/DEPLOYMENT.md#banners-and-login-artwork) for mounted artwork.

## Preview and maintenance

From the app directory after a production build, run `node --import tsx login-artwork-preview.ts`. This recreates a standalone comparison gallery under `outputs/login-options/`, using the actual Auth/AppEntry components, global styles and bundled fonts. The preview forms do not submit. It is a design review artifact, not an alternative login endpoint.

The scenes were generated without text or logos. Night garage prompt: photorealistic cinematic landscape, a realistic dark navy open-wheel racing car in three-quarter side view in a cavernous night garage; restrained red starting-light reflections, turquoise edge lighting, warm gold accents, atmospheric haze and wet concrete. Palette: #0B1020, #151D30, #2DE2C4 and #F4C76B. Wide pagewide composition with dark negative space for white headings and the car near the center/right for responsive cropping.
