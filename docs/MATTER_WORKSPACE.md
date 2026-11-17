# Guided requests and shared matter workspace

## Client

Open **Request a Notice** and choose **Start a new request** or resume an unfinished one. The five steps are matter type, recipient, facts, documents, and review/submission. Requests are saved on the server privately for the signed-in client. Watch the save indicator; **Save and close** waits for persistence. A conflicting edit from another tab/device requires reloading the saved copy rather than silently overwriting it.

A recipient can be added during intake; invoice dates and email are optional for non-invoice matters. Attach up to five supporting records. Upload a signed authority letter through Profile before submitting. Authority review/approval is required before payment, as before. Submission creates one matter even if the submission action is retried; it does not send a legal notice to the recipient.

Dashboard actions open the exact `/matters/:id` and relevant section. The shared page contains facts, authority status, document requests, assignments, current draft and saved versions, payment records, signed notice, delivery and activity history. Facts can be corrected before payment and assignment; the preliminary draft is regenerated as a new version.

## Administrator and advocate

The administrator can assign an approved advocate and review the client's authority letter from the same matter. Pending external payment records have a reconciliation action bound to that exact transaction; PayU payments still require verified gateway callbacks.

The assigned advocate can edit a paid matter's draft. Each save creates a version and invalidates an earlier review approval. Conflicting edits are rejected. **Refresh comparison** fetches the latest saved draft while retaining the local editor text; compare and save explicitly. Opening an old version does not restore it automatically: using it in the editor still requires a new save.

A reviewer can request a document with clear instructions. The client uploads a response. A reviewer marks it Reviewed or supplies a reason for Corrections needed. New responses preserve the earlier submission history. A client cannot mark their own response reviewed. Outstanding document requests must be reviewed before notice approval. Final signed notices retain the existing locks against editing, reassignment and review rollback.

## History and privacy

Drafts are private until submission. Matter access is limited to the owner, assigned advocate, and administrator. Supporting records and prior document responses retain private download checks. Version history starts with this release; the initial baseline is labelled as such, and earlier versions/events are not reconstructed. Payment verification and subsequent recorded matter actions appear in the timeline. A payment/dispatch record does not itself transfer funds or send a courier item.

## Validation

- Production build and security unit checks.
- HTTP integration against an isolated MongoDB replica set with filesystem storage and MongoDB GridFS: private saved requests, stale saves, repeated/concurrent submission, cross-role access, multiple attachments, document corrections/resubmission/review, stale reviews, sanitisation, draft versions, review invalidation and final-document locks.
- Native Chromium checks with actual local test accounts for Client, Admin and Advocate. Client creation, save/close/resume, validation, submission and exact-matter navigation; advocate draft editing and version save; keyboard focus, menu Escape/return focus; narrow-screen reflow using 300% page zoom across roles. A short-screen sticky-header issue was corrected.
- Browser device emulation is disabled by the environment. Physical-device/touch and screen-reader testing remain separate checks. The native file-picker could not complete the synthetic-file selection reliably; file upload and document-response transitions were verified through HTTP integration with both storage adapters.
