# Professional review, client handoff and accessibility

Development review: 17 November 2026 (India). Scope: `development/modern-platform`, draft PR #7. No live site, production database, real client notice, provider payment, external AI request or external email was used. QA identities and matter QA-REVIEW-2026 are synthetic, local staging records.

## Mandatory notice review

The public website, all three login pages, role dashboards and matter workspace now state that **assigned-advocate vetting, checking and necessary corrections/updates are mandatory before approval, signature and issuance**. This is a platform safeguard, not a claim that BCI issued a particular AI checklist or approved ResolveX.

The server requires an active assigned advocate, an administrator's recorded practising-credential checks, a current saved nonempty draft and revision, required document-response reviews, payment verification, eight personal professional checks, reasoned review conclusions, corrections/updates, and a checked communication/service route. An administrator cannot give professional approval. No-change conclusions require reasons; meaningless edits are not required. Review conclusions are visible to the client; private conflicts or third-party details should not be entered there.

Approval is bound to advocate, revision and SHA-256 of the saved draft. Draft, assignment and document workflow changes invalidate approval. Signing and dispatch recheck current review and credentials. Approval history is appended to `professional_reviews`; timeline entries record the actor. Credential checks are an operator-maintained current record, not automated State Bar Council verification. A credential change/withdrawal blocks subsequent issuance. Actual identity, enrolment, practising status and applicable certificate-of-practice requirements must be checked by the operator; a checkbox cannot establish them.

Dispatch uses the advocate-approved email destination, including counsel where appropriate; a manual-service review cannot trigger email. Only the uploaded signed PDF is attached; the email no longer issues an inline preliminary draft. The advocate must ensure the uploaded signed file matches the reviewed text. The system cannot establish a PDF signature's legal validity or verify legal merits. Existing historical records/files remain readable; new issuance of legacy notices lacking the new review record is blocked until properly reviewed. Do not manufacture retrospective approvals.

## Client handoff

Each matter shows the current step, responsible role, precise next action, what happens next, latest team update and expected next update (or explicitly not scheduled). Recorded times display in IST. Staff enter an optional communication commitment in their local time; it is not a legal deadline. Overdue update messaging does not calculate limitation. Admin/assigned advocate updates atomically save a matter note, actor timeline event and real client portal notification. Clients cannot write staff updates, and stale submissions are rejected. Dashboard actions link to the appropriate section of the exact matter.

## BCI-related rules and release boundary

The following are primary government/State Bar Council sources reviewed for this development work. They are not an exhaustive statement of current law. A practising Indian advocate must review amendments, applicability and actual business arrangements before release.

| Source / rule | Development response | Remaining professional decision |
| --- | --- | --- |
| [Ministry of Law and Justice, 9 Aug 2024](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2043470), Rule 36 and July 2024 online-platform directions | Neutral workspace wording; no outcome/ranking claims; public price display disabled by default | Review the entire actual public website, operator identity, solicitation, advocate listings and acquisition channels. A disclaimer alone is insufficient. |
| [BCI professional duties, Rules 19–20](https://ksbc.org.in/advo_act63.php) | Instructions/authority, engagement and lawful non-contingent fee checks | Verify authorised instructions, independent engagement, fee/expense accounts and absence of outcome-based remuneration. |
| [BCI conduct rules, Rules 33–37](https://ksbc.org.in/advo_act64.php) | Conflicts, independence and representation/service checks; counsel destination support; no administrator legal approval | Resolve conflicts, represented-party communication restrictions, unauthorised practice and professional responsibility. |
| [Conditions for right to practise, Chapter III Rule 2](https://ksbc.org.in/advo_act68.php) | New production financial processing paused pending independent legal review | Review actual commissions, referral arrangements and money flows. Renaming a charge a platform fee does not cure prohibited sharing of professional remuneration. |

`LEGAL_MODEL_REVIEW_APPROVED` defaults false. Only an operator acting on documented independent legal review may enable it for production. With it unset, new PayU initiation, new external-payment submissions, wallet credits, new withdrawals and withdrawal approval return an explicit pause message in production. Existing provider callbacks, payment reconciliation, withdrawal rejection and records remain available. This preserves existing financial records; it does not certify past arrangements. Non-production/staging can run isolated QA; staging separately disables live gateways.

`PUBLIC_PRICE_DISPLAY_APPROVED` defaults false. Public price API returns no amount until expressly enabled after review; authenticated configured prices and existing agreed records are not deleted. Development policy wording no longer promises a public fixed price; historical Git versions and existing client agreements remain unchanged. Reconcile terms/privacy/refund disclosures with the actual reviewed engagement, fee model, AI processing and retention practices before release. Neither flag was enabled here.

## Visual and accessibility evidence

Native Chromium, approximately 1180 CSS pixels at 100% zoom and 393 CSS pixels at 300% zoom; public navigation additionally checked at 400% (about 295 CSS pixels). Zoom reflow is not physical-device emulation. Evidence was captured before changes, defects were fixed, and the saved after-images were reopened for inspection. Accepted files are in `/workspace/shared/notice-audit`; initial black/invalid captures are excluded.

| Step | Observed result | Health |
| --- | --- | --- |
| 1. Client, admin and advocate login | Legible labels and mandatory-review notice; synthetic login works | Pass for tested desktop paths |
| 2. Admin dashboard and practising-credential page | Manual-source requirements and distinct administrative responsibility shown | Pass visual/read-only; no real credentials verified |
| 3. Admin matter handoff | Synthetic update saved and displayed after refresh | Pass UI and API |
| 4. Client matter handoff | Same update visible, responsible role shown, no staff edit form | Pass UI and authorization tests |
| 5. Advocate matter review | Mandatory personal checklist and unverified-credential blocking state shown | Pass observed blocked state; approved path covered by isolated API tests |
| 6. Narrow role navigation | Left drawer no longer clipped at 300%; content scrolls | Pass tested layout |
| 7. Keyboard drawer navigation | Escape closes drawer; subsequent Tab has visible focus on search | Pass tested interaction |
| 8. Exact matter anchors | Found new review heading obscured by sticky header; added explicit scroll margins and focusable handoff anchor | Rechecked in final build |
| 9. Public navigation reflow | Found cramped login text at 300%; stacked logo and navigation, rechecked controls at 300% and 400% | Pass tested controls |
| 10. Text contrast | Muted token initially 4.34:1 on white / 4.04:1 on #f5f7fb; darkened shared muted/shell text tokens to 5.30:1 on white / 4.94:1 on the workspace background | Token calculation only; not all rendered combinations |

Evidence: 05 mandatory login policy; 06 admin dashboard; 07 saved admin handoff; 08 client handoff; 09 mobile drawer at 300%; 10 visible keyboard focus; later images cover advocate and final landing/review checks. The local report links the accepted files.

New forms use explicit labels, native required controls, fieldsets/legends, associated checkbox text, alert/status messaging and buttons with real API actions. Existing reduced-motion handling remains. The mobile drawer now uses a separate placement without the conflicting centered-dialog translation. Do not infer full WCAG conformance from screenshots, semantic code or a few keyboard checks.

Outstanding release validation: NVDA/JAWS/VoiceOver reading and announcements; real iOS/Android touch and text scaling; full keyboard order/focus traps through every legacy modal/editor; complete WCAG 2.2 AA audit including rendered contrast, non-text contrast, errors and PDF/DOCX accessibility. The native accessibility tree did not expose browser DOM semantics in this environment. No screen-reader conformance claim is made.

## Reproducible automated checks

`npm run typecheck`, `npm run build`, `npm test` (11 tests), plus `npm run test:integration` against an explicitly isolated loopback replica-set database with both filesystem and `UPLOAD_STORAGE=gridfs` (18 tests each). Integration tests reject non-test databases before dropping their test fixtures. Tests cover role/assignment isolation, credentials, mandatory attestation, stale revisions, review hash/history, withdrawal blocking, document re-review, handoff conflicts and client notifications, private summary payloads, approved dispatch destinations and public-price gating. Provider delivery, legal correctness, signature validity and production arrangements require separate validation.

Deployment remains subject to draft PR review and the existing staging/rollback guide. Preserve predeployment backups and existing engagements. Do not merge or deploy this branch merely because technical tests pass.


## Reviewed screenshot samples

All samples show isolated staging and synthetic records. These are the exact saved images reopened during visual review, not generated mockups.

- [Client receives the saved handoff](audit-2026-11-17/08-client-handoff.jpg)
- [Repaired mobile drawer, 300% zoom](audit-2026-11-17/09-mobile-drawer-300-percent.jpg)
- [Visible keyboard focus after Escape and Tab](audit-2026-11-17/10-keyboard-focus.jpg)
- [Mandatory advocate review and credential blocking state](audit-2026-11-17/11-advocate-mandatory-review.jpg)
- [Public mandatory-review disclosure](audit-2026-11-17/13-public-mandatory-policy.jpg)
- [Public controls at 400% zoom](audit-2026-11-17/15-public-navigation-400-percent.jpg)

The final GridFS rerun initially hit the long-lived local MongoDB container's open-file limit (WiredTiger `Too many open files`). Raising the staging container's `nofile` limit to 16,384, within this workspace's maximum, preserved its named volume and allowed all 18 tests to pass. No test database failure was hidden or counted as a pass. Final totals: 11 unit + 18 filesystem + 18 GridFS = **47 passing checks**; TypeScript and Vite production build also passed. External integrations remained disabled.
