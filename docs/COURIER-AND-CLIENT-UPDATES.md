# Notice handoff, courier receipts and client updates

The saved request collects the notice type, supporting records, recipient and
facts. Documents can also be attached directly from the first step. Submission
opens the matter's payment section. Authority review and verified payment remain
mandatory; administration cannot assign an unpaid request. This change does not
enable live PayU or change commercial/legal approval settings.

After administration assigns an advocate, the assigned advocate vets the exact
draft, makes necessary corrections, records mandatory checks, and uploads the
actual final signed PDF. Payment verification, assignment, draft/review activity,
document requests, signed-copy upload and staff handoff updates create client
notifications. The signed-file event and notification now commit with the signed
file reference, rather than after sending a successful response.

## Courier updates

From **Matter → Signed notice & delivery**, administration or the assigned
advocate can save the carrier, tracking reference, dispatch date, status, client
message, courier receipt and delivery proof. PDF, PNG and JPEG receipts use the
existing private upload service and its 10 MB cap. The actual signed notice and
current mandatory professional review must exist before recording dispatch.

Clients see receipts in the matter, delivery tracking and downloads. Each update
retains an immutable timeline entry and its attached files; replacing the current
receipt does not erase previous receipts. Unrelated clients and advocates cannot
read them. The mutation, timeline and client notification share one MongoDB
transaction. Identical retries do not create duplicate notifications; stale or
concurrent writes receive a conflict instead of silently overwriting changes.

## Ongoing communication

The notification badge, notification screen and an open client matter use one
shared polling feed per tab, checking every five seconds while visible. Requests
are deduplicated, stop when subscribers unmount, pause when hidden, and resume on
focus. Updates are persisted immediately; five-second polling is not a WebSocket
or guaranteed instantaneous delivery. The latest 50 updates and the complete
unread count are fetched with client scope enforced on the server. Notification
links open the exact matter section, and marking a notification read is scoped
to its owner.

The team can record the expected next communication time and continue to send
handoff/delivery updates. Due times are shown in the existing workflow dashboard;
they are not courier estimates or legal deadlines. No automatic carrier tracking,
scheduled email/SMS/WhatsApp messaging, or notification when the browser is closed
is claimed. Existing outbound-provider settings remain unchanged.

## Verification

Isolated replica-set tests cover the complete existing request/payment/review/
signing workflow plus courier permissions, private file access, preserved receipt
history, invalid dates, stale writes, retry deduplication, notification ownership,
and transaction rollback when notification storage fails. Replayed PayU callbacks
must produce exactly one payment notification.

A local Chromium test used separate advocate and client sessions with synthetic
records: the advocate uploaded a receipt, an already-open client matter refreshed
without manual reload, the client downloaded it, opened notifications, followed
the exact matter link, and marked the update read. The 390 px client layout had
no horizontal overflow and no browser exceptions. Screenshots are in
`docs/courier-workflow/`. This is local browser evidence, not remote Vercel UAT,
screen-reader certification or physical-device testing.

No production records, production database schema, main branch, DNS or production
deployment are changed by developing this feature. Production promotion is a
separate release step; no data backfill is needed for these optional fields.
