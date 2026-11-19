# Vercel deployment and rollback

The Vercel project is `noticeai` under `teaminvoease-hashs-projects`.
The intended public alias is `noticeai-two.vercel.app`. The development branch
is deployed separately; do not merge it to `main` as part of a Vercel release,
because the existing Render integration follows `main`.

## Configuration

Use separate sensitive `SESSION_SECRET` values for preview and production.
The MongoDB integration injects `MYNOTICE_MONGODB_URI`; never copy its value
into source, logs, screenshots, or issue bodies. Set `APP_ENV=staging` for preview
and `APP_ENV=production` for production, with a trusted HTTPS `APP_ORIGIN` for each.
System-variable auto-exposure need not be changed. Preview always rewrites the
database to `noticeai_vercel_staging`, uses a distinct cookie, and disables real
email, AI requests and live payments. Production explicitly uses the existing
`MONGODB_DATABASE_NAME=noticeai`. Private uploads use `UPLOAD_STORAGE=gridfs`.

Production automatic model/index initialization is disabled. The owner approved
only the additive `account_identities` collection and its unique `role,email`
index. `PROVISION_IDENTITY_INDEX=true` is an operator-only, database-restricted
bootstrap for precisely that index; switch it to `false` after verifying setup
and deploy a new production build. No account backfill or record migration runs.
Health checks and account changes fail closed if the unique index is missing.

## Release checks

1. Run unit checks, TypeScript and build, then workflow tests on a loopback-only
   database ending in `_test`, with both filesystem and GridFS storage.
2. Verify the exact Git commit in a protected preview: public routes, API health,
   session/CSRF, synthetic client login, saved intake, and private file transfers.
   Keep all test accounts and documents in the preview database.
3. Disable automatic production domain assignment, build the same commit for
   production, and check the unaliased deployment health without creating test users.
4. Promote the verified production build. Check the public alias anonymously and
   keep preview/unique deployment URL protection enabled.

Legal-commercial approval, public price display, live payment processing and AI
are disabled unless separately configured and approved. SMTP and PayU credentials
are not provisioned by this deployment. Mandatory advocate vetting, corrections
and review gates remain enforced by the backend.

## Rollback

Record the previous production deployment ID before promotion. Roll back by
promoting that previous production build with its existing configuration; do not
rebuild an old commit with different environment values. For an initial release
without a previous Vercel deployment, remove/reassign only the new Vercel alias
if necessary; the existing Hostinger/Render website and DNS are independent.
Do not restore or drop the database as a frontend rollback. Preserve the additive
identity index, existing accounts, cases, document records and GridFS files.

The function request/response limit is lower than the app's 10 MB document limit.
Large files use authenticated 512 KiB parts; downloads re-check file access on
every part. Temporary transfer bytes expire after 30 minutes; completed private
documents retain their existing ownership rules.
