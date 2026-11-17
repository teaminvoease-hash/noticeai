# Isolated staging and safe release

Do not merge this development branch into `main`: the existing Render service follows main and may deploy it automatically. Do not connect staging to the production database, production uploads, provider keys or live payment account. This work does not provision an externally accessible staging site.

## Local Node staging

Requirements: Node 22.12+, npm 11.9, Docker (for isolated MongoDB).

```
npm ci
npm run staging:prepare
# Creates ignored mode-600 local .env.staging and .env.staging.runtime files.
docker compose --env-file .env.staging.runtime -f compose.staging.yml up -d mongo
npm run typecheck
npm test
npm run build
ENV_FILE=.env.staging npm start
```

Open http://localhost:6080. The preparation script generates a fresh session secret; do not paste it into Git or chat. Inspect the example for documented settings. The database is `noticeai_staging` on localhost:27120, GridFS contains staging files only, cookie `resolvex.staging.sid`. No default administrator/password is installed. Provision a staging administrator using the existing CLI with `ENV_FILE=.env.staging npm run admin:create`; first set ADMIN_NAME, ADMIN_EMAIL and a unique ADMIN_PASSWORD (at least 12 characters) locally in the ignored staging environment file, without putting the password into shell history. Remove ADMIN_PASSWORD from that local file after provisioning. Never use production users as test fixtures.

For a complete container deployment stop the native server first, then `npm run staging:up`. Use `npm run staging:down` to stop services; it retains the database volume. Do not add `-v` unless intentionally erasing disposable staging data. MongoDB's port binds loopback only; never expose the unauthenticated staging Mongo container publicly.

## Hostinger compatibility

The frontend is static `client/dist` served by Express, which also serves `/api` and protected uploads. Use a Hostinger plan with Node.js application support, Node 22.12+ and a persistent running process. A PHP-only/shared static plan cannot run the complete Express application. Build command: `npm ci && npm run typecheck && npm run build`; start: `npm start`. For a build-on-host deployment install development dependencies during the build; never skip Vite/TypeScript until after the build. The server honors the platform `PORT`.

Create a **separate** staging website/subdomain from this feature branch. Configure a new staging MongoDB database/account restricted to that database, fresh session secret, `APP_ENV=staging`, `STAGING_DATABASE_NAME=noticeai_staging`, `SESSION_COOKIE_NAME=resolvex.staging.sid`, GridFS and external integrations disabled. Set APP_ORIGIN to its HTTPS staging URL. Set NODE_ENV=production and TRUST_PROXY=1 only behind the host's trusted single reverse proxy; HTTPS is required for secure cookies. Do not copy `.env` files into the public web root or change production DNS. If hosting lacks a supported Node process, keep the API on a separate Node staging host and serve the built frontend through it; splitting origins needs an explicit cookie/CORS design and is not configured here.

GridFS avoids ephemeral local upload loss. MongoDB must support transactions (replica set/Atlas). Hosting access and plan capabilities still need operator verification; no Hostinger account change was made.

## Validation

Use a new disposable local database for integration tests:

```
TEST_MONGODB_URI='mongodb://127.0.0.1:27120/noticeai_modern_test?replicaSet=rs0&directConnection=true' npm run test:integration
UPLOAD_STORAGE=gridfs TEST_MONGODB_URI='mongodb://127.0.0.1:27120/noticeai_modern_test?replicaSet=rs0&directConnection=true' npm run test:integration
```

These commands deliberately clear **that test database**, not staging or production. Provider keys are synthetic. CI runs the same role and workflow checks. Exercise the entire request → authority → payment → assignment → document loop → advocate revision/approval → signed upload → dispatch journey with synthetic records before release.

## Release and rollback

Release only after the audit release gates pass and the owner explicitly authorizes production deployment. Record the currently deployed commit/image, runtime configuration names, database indexes, encrypted database backup and file backup; verify restoration to an isolated database. Use an immutable release commit/image. Deploy first to separate staging and smoke-test health, login, role boundaries and private files. Any final production PR must identify additive indexes and data compatibility, and be reviewed independently.

For an application regression, redeploy the previous recorded image/commit with its original environment. Do not delete new collections, drop indexes or restore an old database automatically: rolling data backward would discard notices/payments created since the backup. Halt new payment initiation if payment state is uncertain and reconcile against provider records. Restore data only under an approved, rehearsed recovery procedure into a separate database before any cutover. DNS and live hosting remain unchanged by this branch.
