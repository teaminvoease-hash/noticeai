# Notice workflow

Every role's Dashboard shows the current step, the next responsible role and a button to open the relevant work screen. Use “Needs my action” to focus the queue, or find a matter by ID, subject or client name. Refresh status after another role completes a handoff.

## Authority letter

1. Admin: open **Workflow operations**, select the client under **Client authority letters**, and upload the PDF that the client should sign.
2. Client: open **Profile → Authority letter**, download the letter, check the details and sign it outside the app. Upload the signed PDF. The upload is linked to the account immediately; saving Basic Details is a separate action.
3. Admin: open the current signed file and record approval or request corrections with a reason. Admin can upload a signed copy received from the client on their behalf.
4. Client: see the saved review status and any feedback in Profile and on the Dashboard. Upload a replacement only when required. A replacement starts a new review; ordinary profile saves preserve approval.

The app stores documents and review records; it does not sign for a client or administrator. Previously uploaded letters remain available but require explicit admin approval before a new payment can be initiated. Existing paid matters can continue.

## Notice handoffs

1. Client adds a recipient and submits the notice request and supporting records.
2. Admin reviews the authority letter. Client initiates payment after approval. Offline payment references require administrator reconciliation; PayU requires server-side callback verification.
3. Admin assigns an approved advocate. Advocate opens the assigned matter, requests missing documents and reviews/edits the draft after verified payment.
4. Advocate records professional review approval, then uploads the final signed PDF. Final signed matters cannot be edited, reassigned, or moved back to an earlier review status through the workflow endpoints.
5. Admin records courier, tracking reference, dispatch date and delivery updates. Client accesses the signed notice and recorded delivery updates/downloads.

Payment integrations, actual dispatch and professional judgment remain external actions configured or performed by the operator. The workflow board reflects stored records, not a live courier feed or an automatic legal approval.
