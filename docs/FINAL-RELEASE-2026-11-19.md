# Final release review — 19 November 2026

Target: existing Vercel project `noticeai` in `teaminvoease-hashs-projects`,
production alias `https://noticeai-two.vercel.app`. Keep `main` unmerged because
the independent Render service follows it. No Hostinger or DNS change is part
of this release.

## Additional release fixes

1. Client notifications now provide cursor-based access to older updates, beyond
   the latest 50. The unread total remains complete. Loaded history survives new
   polling results without gaps or duplicates, and older updates can be marked read.
2. Edited AI proposals warn before close, page exit or navigation through a link.
   New draft generation is disabled while an edited proposal remains unsaved.
3. AI, vetting, handoff and courier panels reset when the matter changes. The
   selected signed PDF is also cleared. A current-matter identifier is checked
   by the apply endpoint, preventing a proposal from being applied through the
   wrong matter page. Browser back navigation does not have a router-level blocker;
   save a reviewed proposal before leaving work that must be retained.
4. Vercel static pages now receive a Content Security Policy, anti-framing,
   MIME-sniffing, referrer and permissions headers. Existing function protections
   and private/no-store document rules remain intact.
   All API responses, including sessions and CSRF tokens, explicitly disallow
   shared/browser caching with `private, no-store`.

## Verification

- 70 automated checks: 18 unit + 26 filesystem workflow + 26 GridFS workflow.
  TypeScript and the Vercel build pass.
- A fresh local Chromium run completed AI revision → edited proposal → manual
  version → fresh mandatory vetting → signed PDF → courier receipt → client
  notification/private downloads → admin delivery handoff, without browser errors.
- A separate fresh browser run checked unsaved close/navigation warnings, isolated
  AI/signature/handoff state across two matters, notification pagination, older
  read-state updates and retained history while new notifications arrive. The
  390 px client notification layout had no horizontal overflow.
- Only synthetic loopback test records and mocked AI responses were used. No
  real AI request, payment or email was sent. Fresh captures and the browser
  journey result are in `docs/release-2026-11-19/`.

## Configuration and remaining limits

The Vercel environment currently has no OpenAI key, PayU credentials or SMTP
configuration. AI, live payments, public price display and legal-commercial
approval flags remain disabled. Release the tested manual/in-app workflows under
these existing safeguards. This is not activation of an automated paid AI service.
Real provider UAT, independent review of the commercial/legal model, full
screen-reader/physical-device checks and production load testing remain separate.

The upstream latest Quill version is still 2.0.3; a patched 2.0.4 is not available
in the registry checked. Two low-severity Quill-related HTML-export advisories
remain. The app does not call `getSemanticHTML`, and existing server sanitization,
sanitized client rendering and CSP remain enforced. No moderate/high/critical
production-dependency advisories were reported in the dependency audit. This does
not constitute a security certification.

## Deployment and rollback

Build the exact reviewed commit as an unaliased production deployment, verify
read-only health and public routes, then promote that production build without
rebuilding. Keep preview protection in place.

Previous production deployment: `dpl_7ZHmPWtFzCY6rHB5kg23UvzjiUKF`, commit
`bab806dfb6488a866345422605eefa75fcc6012a`. If the new deployment fails after
promotion, promote that existing deployment as the rollback; do not restore or
drop the database.

The identity bootstrap flag is false. No startup migration, automatic production
index creation, record backfill, account seeding or document deletion is included.
Pre-release read-only baseline: 1 client, 0 client notices, 3 private-file records.
Record the final deployment ID, production health result and CI result in PR #7.
