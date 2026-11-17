# Workflow recheck — 17 November 2026

Environment: development/modern-platform, isolated local MongoDB replica set. No production database, hosting, DNS or main branch changes. Fixtures contain synthetic identities and documents. No real payment, email or external AI request was made.

## Findings fixed

| Finding | Result |
| --- | --- |
| Repeated authority submission reset a reviewed file to pending | Reposting the same pending/approved file is idempotent; approval and reviewed/submitted timestamps remain unchanged. Changed files still require review. Concurrent authority changes are rejected. |
| Legacy document intake bypassed final notice restrictions | Both request APIs and document response/review mutations now write the parent matter in the same transaction. Signed matters reject document changes; additional evidence invalidates prior approval. Role/actor metadata comes from the session. |
| Signing could trust an inconsistent legacy approval | Signing independently checks every document is reviewed and a saved draft exists, then commits against the exact current assignment, payment, status and revision. |
| Reassignment retained previous professional approval | Assigning a different advocate resets review to pending; assignment uses a conditional update to prevent changing a concurrently signed matter. |
| Older profile/admin edits bypassed signup identity uniqueness | Client profile and administrator client/advocate changes use transactional email identity reservations. Validation and concurrent collision tests cover signup/edit conflicts. No legacy records or indexes were deleted. |
| External payment creation could race gateway settlement | Recording an external payment now conditionally locks the unpaid matter in the same transaction. It cannot downgrade a concurrent gateway settlement. Admin reconciliation cannot mark a second record paid for an already paid matter. New pending records no longer advertise a nonexistent PDF receipt. |
| Legacy CSS overrode new components | Fixed light-text headings, dark text on navy buttons, muted text/surface variable collisions and an unlayered global reset that suppressed utility spacing. Cards now use the intended light border. |
| Mobile drawer inherited Tailwind 4 translation | Explicitly reset the individual translate property, use full viewport height and restore keyboard focus to the menu trigger on close. Final visual retest remains pending after browser service reset. |
| A failed lazy module could leave a blank screen | Added a root error boundary with an explicit reload action and a warning about unsaved changes. Saved server drafts remain in the account. |

## Automated workflow matrix

`npm test`: 9 unit checks. Integration suite: 13 checks with filesystem storage and the same 13 with GridFS (35 test cases total). TypeScript validation and frontend production build pass. CI additionally builds the Node image and smoke-tests staging startup.

- Login/session rotation, CSRF, logout, administrator provisioning restrictions and role/record ownership.
- Authority template sharing, client signed-file submission, correction/review, stale-file checks and idempotent approved-file retries.
- Notice intake, private saved drafts, cross-tab revision conflicts, single submission, exact scoped matter access and fact regeneration.
- Server pricing, pending gateway-session reuse, signed callback validation/replay protection, external reconciliation guards, wallet reservation and duplicate withdrawal processing.
- Assignment, document requested/uploaded/corrections/reviewed loop, history and stale document revisions; draft versioning and approval; final signing, immutable signed notices and delivery records.
- Export ownership, real PDF/DOCX extraction round trips including Hindi, private reusable advocate signature restrictions, enquiry permissions and non-mutating GET deletion rejection.
- Explicit AI consent/configuration, mocked provider proposals, assigned advocate application and stale proposal rejection.
- Legacy document intake, review invalidation and advocate reassignment; inconsistent legacy approval checks; concurrent final signing/document creation (only one may commit).
- Administrator-only external payment reconciliation, reference requirements, duplicate settlement rejection and concurrent gateway settlement versus external record creation.
- Case-insensitive PHP bcrypt login, concurrent signup and profile email edits, administrator duplicate-email rejection and short password rejection.

Test fixtures use a dedicated loopback `_test` database. The suite's cleanup guard remains enabled. The expanded regression fixture starts a second test app instance so hundreds of synthetic requests do not exhaust the real per-process rate limiter; no production limiter was disabled or relaxed.

## Visual verification and limits

Observed in native Chromium on isolated staging before the browser service reset: public landing page, working workflow section link, synthetic client login, dashboard empty states, corrected card headings/spacing/button contrast, five-step request entry, saving a subject/category, moving to recipient step, save-and-close and persisted request resumption. Narrow layout was exercised at 250% browser zoom (roughly 490 CSS pixels), revealing the drawer translation issue.

The drawer correction, final login muted-text correction, admin/advocate visual walkthrough and screen-reader/physical-phone verification were not completed: the subsequent browser retry reported `Browser Use could not read requirements`, and native Chromium did not reopen. Automated API checks cover all roles, but do not substitute for these visual/accessibility checks. Do not claim that every screen or device has passed.

Provider sandbox UAT, current legal/policy review, independent security/load assessment and PHP/Node data reconciliation remain release gates from MODERNIZATION-AUDIT.md. Two low-severity Quill dependency advisories remain. Leave the PR in draft and unmerged.
