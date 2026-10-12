# Apex-League

F1 Prediction League. Self-hosted F1 prediction league for friends, with English/Dutch UI, GP and Sprint predictions, automatic scoring, banners, encrypted backups and admin season tools.

## Install and update

Use the ready-built image `ghcr.io/sietsevdm/apex-league:0.8.1` with [app/compose.yml](app/compose.yml). Follow the [deployment and update guide](app/DEPLOYMENT.md) for Portainer and Nginx Proxy Manager.

The admin panel shows stable release updates. Change APEX_IMAGE in the existing Portainer stack and pull/redeploy to install one.

## Publish a release

Update app/package.json and app/RELEASE_NOTES.md, then push to main. GitHub Actions tests the app, builds and pushes AMD64/ARM64 images and creates a release after success. Each release uses a fixed version tag; bump the version for subsequent changes. Workflow dispatch can retry a failed first publication. The current GHCR image is public and needs no registry password.

## Development

Application source is in app/. Install dependencies with pnpm, run pnpm test and pnpm build. Credentials and local data must stay outside Git. See [app/README.md](app/README.md) for features and [release notes](app/RELEASE_NOTES.md) for upgrade considerations.
