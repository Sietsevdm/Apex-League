# Version 0.8.14

Saves now return compact changes against a matching client revision when this is smaller than the full response. Stale revisions, account or scope changes and larger updates fall back to full data. The browser verifies the revision before merging and refetches after concurrent changes when needed.

Background refresh now sends a version check. Unchanged authenticated data returns HTTP 304 with no JSON body and no interface update. Session validation, privacy filtering and deadline visibility remain checked on every request. These changes reduce transfer and browser work; the server still builds the safe response.

A fresh live PageSpeed run before these changes scored mobile 98 and desktop 100, with accessibility, best practices and SEO at 100. These scores do not measure this release's impact.

All 64 tests and the production build pass. No database migration is required. Existing clients remain compatible.

Update the existing Portainer stack to `ghcr.io/sietsevdm/apex-league:0.8.14` and re-pull/redeploy. Preserve existing environment values, volumes and image mounts. Create a backup before updating.
