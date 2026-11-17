# Notice AI / ResolveX development upgrade

Scope: development branch based on main `2addc39c4a9da751f062322f826f621dca0bc38b`. No live website, production deployment, DNS, production secrets or production database were accessed or changed by this upgrade. The local staging database is new and empty except synthetic QA records. This is a development release, pending the release gates below.

## Code and data inventory

The existing application is a Vite/React frontend, Express API, Mongoose/MongoDB models, session-cookie authentication, private filesystem/GridFS attachments, PayU, SMTP and OpenAI integrations. The supplied PHP archive was inspected as source material, never executed. Its root and nested versions contain duplicate public/authentication/case pages. The original Node archive includes earlier builds and configuration; private configuration and uploaded documents are excluded from Git.

| Module | Existing behaviour preserved | Development change |
| --- | --- | --- |
| Public website | Services, contact details, policy content, registration/login | White/navy responsive public shell, 31 archived notice categories, contact enquiry API and administrator queue; archived policy content sanitized |
| Authentication | Client, administrator, advocate roles, approval status, sessions | Strictly typed role shell; accessible mobile drawer and matter search; transactional new-account identity reservations; legacy case-insensitive email and PHP bcrypt compatibility |
| Client requests | Recipients, saved five-step intake, files, authority review | New real-data dashboard, exact matter actions, shared matter page and AI/extraction panel |
| Authority | Administrator-provided template, client signature/upload, admin approval/corrections | Existing once-per-client persisted approval retained; unrelated profile edits do not reset approval |
| Notice work | Assignment, paid edit guards, draft versions, approvals, signed file, timeline | AI proposals stored separately; explicit consent and advocate application; current saved draft exports to unsigned PDF/DOCX |
| Documents | Private upload, request/upload/review/corrections, version history | Local PDF/DOCX extraction with isolated worker, resource limits and no OCR claim |
| Payments | Signed PayU callbacks and administrator-reconciled external payments | Server-authoritative verified pricing, pending gateway session reuse, one active payment session per notice |
| Administration | Clients, advocates, pricing, templates, blog, home settings, ledger, wallets, withdrawals | Existing routes retained inside new shell; enquiries queue; status capabilities; client removal deactivates records |
| Notifications/tracking | Real SMTP attempts, in-app records, manual courier records | Staging SMTP disabled by default; unavailable integrations shown honestly; no fabricated delivery events |

All existing MongoDB collections and record identifiers remain in place. Additive collections: account identities, public enquiries, AI artifacts. Additive indexes are created at startup; production must review and schedule index creation. No destructive migration is supplied.

The PHP archive has a separate flat-file user store. It has **not** been merged into MongoDB. `node server/scripts/audit-legacy.js /archive` reports only counts, field names and password scheme counts. It never prints names, emails, passwords or document contents. A production merge needs identity collision resolution, record/file linkage and reconciliation against the authoritative deployed data. A password compatibility adapter alone is not a user migration.

## Technical boundaries

New public pages, dashboard, shell, components and AI workspace use TypeScript, Tailwind and shadcn-style Radix components. Legacy JSX administration and matter forms remain operational behind this typed boundary; `checkJs` is disabled. A complete strict-TypeScript conversion is **not** claimed. Existing CSS is retained with a scoped modern theme to avoid removing workflows.

Extraction supports text PDFs and DOCX only. Images/scans need manual transcription. Processing uses a child process with a 192 MB Node heap, 20-second timeout, one concurrent worker, 10 MB file/50 PDF page limits, and bounded ZIP expansion. It sends no data to AI. AI requires a separate enabled provider key and explicit per-request consent; errors never silently masquerade as AI output. Legal references are curated candidates, not current-law retrieval. AI output requires professional verification. Provider validation uses a mocked transport in tests; a real provider call was not made.

Exports mark every generated PDF/DOCX as an unsigned working copy. Client final downloads use the actual uploaded signed notice. Clients cannot fetch an advocate's reusable signature image. Payments require real provider sandbox UAT before release; no real charge was made.

## Security and release gates

Session cookies are HTTP-only and same-site, mutation APIs require CSRF, records/files enforce role ownership, and the CSP limits scripts to self. Staging rejects known production origins, requires a staging database name/distinct cookie, and forbids live PayU. Tests refuse destructive cleanup unless the database URI is loopback and explicitly ends in `_test`/`_tests`.

Before production: independently review security and all role workflows; reconcile PHP/Node users, cases and document mappings; take and verify backups; test actual provider sandbox payments/callbacks, SMTP and AI with separate credentials; verify current legal provisions and notice wording; review policy pricing (archived terms mention ₹2,499 plus GST while runtime pricing is administrator configurable); test real phones, keyboards and screen readers; assess upload quotas, data retention, operational logs and production load. No penetration-test or legal-compliance certification is claimed.

The dependency audit reports two low-severity Quill ecosystem advisories with no current non-breaking fix. Rich content is sanitized and CSP enforced, but that does not eliminate the need to monitor/replace the editor when a supported fix is available.
