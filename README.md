# Notice AI / ResolveX — complete React + Node platform

Restores the Admin, Client and Lawyer portals from `ai.zip`, including the React component source recovered from the supplied build source maps and the existing MongoDB models. Replaces the previous standalone React demo with a single same-origin application: React frontend, Express API, MongoDB persistence, server sessions and private document storage.

## Start locally

Requires Node.js 22.12+ and a MongoDB replica set (transactions are used for payments and wallet accounting). MongoDB Atlas is suitable. A standalone MongoDB instance is insufficient for financial operations.

```sh
npm ci
cp .env.example .env
# Edit .env: MONGODB_URI, SESSION_SECRET (32+ random characters), APP_ORIGIN.
npm run build
npm start
```

Open `http://localhost:6001`. For development use `npm run dev` (Vite proxies `/api` and `/uploads` to Express). All three logins are linked on the homepage.

Create the initial administrator with temporary `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) in the local environment, then run `npm run admin:create`. Remove those provisioning variables afterwards. There are no default credentials and no public administrator registration.

## Role workflows

| Role | Restored and integrated features |
| --- | --- |
| Client | Signup/login/logout, profile and authority-letter upload, counterparties/defaulters, notice preview/submission/editing before review, own notice list, documents and responses, PayU checkout, payment history, private signed-document downloads, delivery records, notifications |
| Lawyer | Application and KYC upload, admin approval, login/logout, assigned notices only, rich-text draft review/editing, document requests, signed PDF uploads, gated email dispatch with signed attachment, profile, wallet ledger and withdrawal requests |
| Administrator | Provisioned login/logout, client/lawyer management and activation, assignment, notice review statuses, pricing and fee splits, payment ledger and external-reference reconciliation, actual client documents, recorded courier delivery/POD, advocate fee credits, withdrawal decisions, templates and service configuration status |

Some recovered screens previously displayed hardcoded sample transactions or delivery details. These now query actual stored records and show empty states. Draft-review links open the working assigned-notice editor. Admin document metadata catalogs remain distinct from uploaded client documents; the Documents menu opens actual client document requests and files.

## Authentication and privacy

Authentication uses HttpOnly, SameSite cookies backed by MongoDB, session rotation, server-side role checks, CSRF tokens and request limits. Browser state is restored from `/api/session`, not trusted localStorage. Clients cannot select another account by changing a query ID. Lawyers receive only assigned matter records and limited related client details. Documents are downloaded through ownership/assignment checks, not a public static directory. Original password hashes and model/collection names are retained for database compatibility.

The uploaded archive contained real credentials. None are included here. Rotate the exposed MongoDB, AI, SMTP and payment credentials before use. Set replacement values only through your private environment/hosting settings. Original logs, `.env`, production bundles, source maps and KYC/test uploads are excluded.

## Optional integrations and truthful states

- **AI:** `OPENAI_API_KEY` enables drafting through the original Responses API integration. Without it, drafts are explicitly marked as preliminary templates. They require professional review. No claim of AI success is made for fallback output.
- **SMTP:** Set SMTP variables and `NOTIFY_EMAIL` for outbound messages. Unconfigured delivery reports an error; it is not simulated. Dispatch requires verified payment, review approval and an uploaded signed PDF. Emails contain that PDF. Courier delivery is recorded separately.
- **PayU:** Set key/salt and the correct `APP_ORIGIN`. Checkout pricing comes from administrator records. Callbacks verify signed data against a previously initiated transaction and amount; replay does not create duplicate payments. There is no client-controlled “paid” switch. Non-gateway references remain pending until an administrator records reconciliation.
- **Courier:** Administrator-entered tracking and proof, not a carrier API. No fabricated delivery statuses.
- **Wallet:** Administrator-recorded verified credits, transactional balance reservations and approvals/rejections. Approval records accounting only; it does not perform a bank payout. Confirm settlements externally before approving.

Integration configuration status indicates whether environment variables are present; it is not a live provider connectivity test. Actual provider credentials and end-to-end provider acceptance must be verified in your deployment.

## Existing production data

1. Back up the original database and uploads before changing deployment. Do not put records or documents in GitHub.
2. Point `MONGODB_URI` at a **private staging copy first**. The original MongoDB collection and model names are preserved; existing accounts use their existing bcrypt passwords. No automatic import from the earlier unrelated PHP/SQLite demo is attempted.
3. Copy the old uploads to a private directory, set `LEGACY_UPLOAD_DIR` and run `node server/scripts/import-files.js` once. It copies supported documents to `DATA_DIR/uploads` and registers them; access follows existing notice/profile/document references. Existing filenames must match record references. It does not overwrite destination files.
4. Prior sample/fabricated delivery and wallet balances are not imported as real transactions. Record verified opening credits and actual delivery data through administrator operations.
5. Verify all three roles in staging, configure integrations and then switch your hosting. No live database or hosting was changed by this repository update.

## Deploy

Build with `npm run build`; run `npm start`. React and API must share the same origin. This requires Node hosting, MongoDB and a persistent private `DATA_DIR` volume; GitHub Pages alone cannot run it. A Dockerfile is included.

Production requires `NODE_ENV=production`, HTTPS `APP_ORIGIN`, a random session secret and `TRUST_PROXY=1` only behind one trusted proxy. Secure cookies require HTTPS. Back up MongoDB and the private data directory together.

## Verification

```sh
npm test                  # HTTP/session security, role access, signatures and financial validation
npm run build             # complete React production build
npm run test:integration  # full workflow on an isolated MongoDB replica set
```

Integration tests use an ephemeral replica set by default (downloads a MongoDB binary), or `TEST_MONGODB_URI` for a **dedicated disposable test database**, which the test drops. Never point it at staging or production. GitHub Actions starts an isolated MongoDB replica set and runs the full suite.

Local security tests and production build were verified. The managed environment blocked MongoDB binary downloads and browser-preview routing, so local real-database integration and visual QA could not be completed there. Live PayU, SMTP, AI, KYC approval and bank payout were not exercised using production credentials.
