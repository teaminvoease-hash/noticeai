import { useClientUpdates } from "./lib/notifications";
import DeliveryPanel from "./components/platform/DeliveryPanel";
import ProfessionalNotice from "./components/platform/ProfessionalNotice";
import HandoffPanel from "./components/platform/HandoffPanel";
import VettingPanel from "./components/platform/VettingPanel";
const AiWorkspace = lazy(() => import("./components/platform/AiWorkspace"));
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import DOMPurify from "dompurify";
import ClientLayout from "./AdminDashboard/dashscreen/eraser/ClientPortalLayout";
import AdminLayout from "./AdminDashboard/dashscreen/eraser/AdminPortalLayout";
import LawyerLayout from "./AdminDashboard/dashscreen/eraser/LawyerPortalLayout";
import { AuthorityPanel } from "./Authority";
import { fetchData, FileUpload } from "./helper/ApiCall";
import "react-quill/dist/quill.snow.css";
const Editor = lazy(() => import("react-quill"));
const dates = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
    : "Not recorded";
function FileLink({ file, children }) {
  return file ? (
    <a
      className="font-medium text-primary underline underline-offset-4"
      href={"/uploads/" + encodeURIComponent(file)}
      target="_blank"
      rel="noreferrer"
    >
      {children || "View file"} ↗
    </a>
  ) : null;
}
export default function MatterPage() {
  const { id } = useParams(),
    location = useLocation(),
    role = useSelector((s) => s.userReducer.userData?.role),
    Layout =
      role === "admin"
        ? AdminLayout
        : role === "lawyer"
          ? LawyerLayout
          : ClientLayout;
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [lawyers, setLawyers] = useState([]),
    [lawyer, setLawyer] = useState(""),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(""),
    [revision, setRevision] = useState(0),
    [version, setVersion] = useState(null),
    [events, setEvents] = useState([]),
    [versions, setVersions] = useState([]),
    [moreEvents, setMoreEvents] = useState(false),
    [moreVersions, setMoreVersions] = useState(false),
    [request, setRequest] = useState({ type: "", requestMessage: "" }),
    [notes, setNotes] = useState({}),
    [corrections, setCorrections] = useState({}),
    [signed, setSigned] = useState(null),
    [editFacts, setEditFacts] = useState(false),
    [facts, setFacts] = useState({ subject: "", caseSummary: "" }),
    [loadingMore, setLoadingMore] = useState(false),
    [reconciliations, setReconciliations] = useState({});
  const updates = useClientUpdates(role === "client");
  const latestClientUpdate = updates.items.find(item => item.matterId === id)?._id;
  const handledUpdate = useRef(null);
  const title = useRef(null),
    docInputs = useRef({}),
    mounted = useRef(true);
  async function api(url, method = "GET", body) {
    const r = await fetchData(url, method, body);
    if (!r.success) throw Error(r.message || "Unable to complete this action");
    return r.data;
  }
  async function load() {
    const result = await api("/api/matters/" + id);
    if (!mounted.current) return;
    setData(result);
    setEvents(result.events);
    setVersions(result.versions);
    setMoreEvents(result.events.length === 30);
    setMoreVersions(result.versions.length === 10);
    setRevision(result.notice.draftRevision || 0);
    setDraft(result.notice.generatedNotice || "");
    setLawyer(result.notice.lawyerId || "");
    setFacts({
      subject: result.notice.subject,
      caseSummary: result.notice.caseSummary || "",
    });
    return result;
  }
  useEffect(() => {
    mounted.current = true;
    setData(null);
    setError("");
    setEditing(false);
    setEditFacts(false);
    setVersion(null);
    load()
      .then(() => title.current?.focus())
      .catch((e) => setError(e.message));
    if (role === "admin")
      api("/api/get-lawyer")
        .then(setLawyers)
        .catch((e) => setError(e.message));
    return () => {
      mounted.current = false;
    };
  }, [id, role]);
  useEffect(() => {
    if (role !== 'client' || !data || !latestClientUpdate || handledUpdate.current === latestClientUpdate || busy || editing || editFacts) return;
    handledUpdate.current = latestClientUpdate;
    load().catch(e => setError(e.message));
  }, [latestClientUpdate, busy, editing, editFacts, !!data, id, role]);
  useEffect(() => {
    if (version) document.getElementById("version-preview")?.focus();
  }, [version]);
  useEffect(() => {
    if (data && location.hash) {
      const element = document.getElementById(location.hash.slice(1));
      element?.scrollIntoView({ behavior: "auto", block: "start" });
      element?.focus({ preventScroll: true });
    }
  }, [!!data, location.hash]);
  async function act(fn, success, options = {}) {
    if ((editing || editFacts) && !options.allowEdits) {
      setError("Save or cancel your current edits before another action.");
      return false;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await load();
      setMessage(success);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function uploadFiles(event, doc) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    if (files.length > 5) {
      setError("Upload up to five files per response.");
      return;
    }
    await act(async () => {
      const names = [];
      for (const file of files) {
        const u = await FileUpload(file);
        if (!u.success) throw Error(u.message);
        names.push(u.fileName);
      }
      await api("/api/document-requests/" + doc._id + "/respond", "POST", {
        revision: doc.revision || 0,
        responseFiles: names,
      });
    }, "Files submitted. Awaiting reviewer assessment.");
    event.target.value = "";
  }
  async function review(doc, status) {
    await act(
      () =>
        api("/api/document-requests/" + doc._id + "/review", "POST", {
          revision: doc.revision || 0,
          status,
          reviewNote: notes[doc._id] || "",
        }),
      status === "Reviewed"
        ? "Document response reviewed."
        : "Corrections requested. The client can upload a new response.",
    );
  }
  async function saveDraft() {
    const ok = await act(
      () =>
        api("/api/client-portal/notices/" + id + "/generated-notice", "POST", {
          generatedNotice: draft,
          revision,
        }),
      "Draft version saved.",
      { allowEdits: true },
    );
    if (ok) setEditing(false);
  }
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/payu/initiate", "POST", {
        noticeId: data.notice.noticeId,
      });
      const form = document.createElement("form");
      form.method = "POST";
      form.action = d.payuUrl;
      for (const [name, value] of Object.entries(d)) {
        if (name === "payuUrl") continue;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = String(value);
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function more(kind) {
    setLoadingMore(true);
    try {
      const items = kind === "events" ? events : versions,
        last = items.at(-1);
      const values = await api(
        "/api/matters/" +
          id +
          "/" +
          kind +
          "?before=" +
          encodeURIComponent(kind === "events" ? last._id : last.revision),
      );
      if (kind === "events") {
        setEvents((p) => [...p, ...values]);
        setMoreEvents(values.length === 30);
      } else {
        setVersions((p) => [...p, ...values]);
        setMoreVersions(values.length === 10);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }
  useEffect(() => {
    const warn = (e) => {
      if (editing || editFacts) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, editFacts]);
  const pendingDocuments = data?.documents.some((d) => d.status !== "Reviewed");
  const n = data?.notice,
    isClient = role === "client",
    isReviewer = ["admin", "lawyer"].includes(role),
    reviewed =
      !!n?.professionalReview &&
      ["approved", "verified"].includes(String(n?.status).toLowerCase()),
    frozen = !!n?.signedFile;
  return (
    <Layout
      title={n ? n.noticeId : "Matter workspace"}
      subtitle={
        n
          ? n.subject
          : "Open the facts, documents, drafts and progress for this matter."
      }
      activeKey={
        isClient ? "notices" : role === "admin" ? "notices" : "assigned"
      }
      actions={
        <Link className="btn btn-light" to={"/" + role + "-dashboard"}>
          Dashboard
        </Link>
      }
    >
      <a href="#matter-main" className="skip-link">
        Skip to matter details
      </a>
      <div ref={title} tabIndex={-1} className="matter-message" role="alert">
        {error}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {!data ? (
        <section className="form-panel">
          <h2>{error ? "Matter could not be opened" : "Loading matter…"}</h2>
          {error && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setError("");
                load().catch((e) => setError(e.message));
              }}
            >
              Retry
            </button>
          )}
        </section>
      ) : (
        <>
          <section
            className="form-panel matter-overview"
            id="matter-main"
            tabIndex={-1}
          >
            <p className="eyebrow">ONE MATTER · ONE RECORD</p>
            <h2>{n.subject}</h2>
            <p>
              <strong>{data.workflow.label}</strong> ·{" "}
              {data.workflow.owner
                ? "Next action: " +
                  ({
                    lawyer: "assigned advocate",
                    admin: "administration",
                    client: "client",
                  }[data.workflow.owner] || data.workflow.owner)
                : "Complete"}
            </p>
            <dl className="matter-summary">
              <dt>Client</dt>
              <dd>{data.client?.name || "Client"}</dd>
              <dt>Recipient</dt>
              <dd>
                {data.recipient?.name || n.defaulterName || "Recipient"}
                <br />
                {data.recipient?.address}
              </dd>
              <dt>Category</dt>
              <dd>{n.category}</dd>
              <dt>Assigned advocate</dt>
              <dd>{n.lawyerName || "Awaiting assignment"}</dd>
              <dt>Created</dt>
              <dd>{dates(n.createdAt)}</dd>
            </dl>
            <nav className="matter-nav" aria-label="Matter sections">
              {[
                ["next-action", "Next steps"],
                ["professional-review", "Mandatory advocate review"],
                ["facts", "Facts"],
                ["authority", "Authority"],
                ["documents", "Documents"],
                ["draft", "Draft & versions"],
                ["payment", "Payment"],
                ["delivery", "Signed notice & delivery"],
                ["timeline", "Timeline"],
              ].map(([hash, text]) => (
                <a key={hash} href={"#" + hash}>
                  {text}
                </a>
              ))}
            </nav>
          </section>
          <ProfessionalNotice />
          <HandoffPanel
            matterId={id}
            workflow={data.workflow}
            role={role}
            updatedAt={n.updatedAt}
            onUpdated={load}
          />
          <section
            className="form-panel matter-section"
            id="facts"
            tabIndex={-1}
          >
            <h2>Request facts</h2>
            <p className="preserve-lines">
              {n.caseSummary || "No facts recorded."}
            </p>
            {n.recipientDetails && (
              <p className="preserve-lines">
                Additional recipient details: {n.recipientDetails}
              </p>
            )}
            {isClient && n.paymentStatus !== "Paid" && !n.lawyerId && (
              <>
                <button
                  className="btn btn-light"
                  disabled={busy}
                  type="button"
                  aria-expanded={editFacts}
                  onClick={() => {
                    setFacts({
                      subject: n.subject,
                      caseSummary: n.caseSummary || "",
                    });
                    setEditFacts((p) => !p);
                  }}
                >
                  {editFacts ? "Cancel fact edits" : "Edit request facts"}
                </button>
                {editFacts && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await act(
                        () =>
                          api("/api/client-portal/notices/" + id, "PUT", {
                            ...n,
                            ...facts,
                            clientId: n.clientId,
                          }),
                        "Request facts updated.",
                        { allowEdits: true },
                      );
                      if (ok) setEditFacts(false);
                    }}
                  >
                    <label htmlFor="matter-subject">Subject</label>
                    <input
                      id="matter-subject"
                      value={facts.subject}
                      maxLength={200}
                      required
                      onChange={(e) =>
                        setFacts((p) => ({ ...p, subject: e.target.value }))
                      }
                    />
                    <label htmlFor="matter-facts">
                      Facts and requested resolution
                    </label>
                    <textarea
                      id="matter-facts"
                      rows={8}
                      minLength={20}
                      maxLength={20000}
                      required
                      value={facts.caseSummary}
                      onChange={(e) =>
                        setFacts((p) => ({ ...p, caseSummary: e.target.value }))
                      }
                    />
                    <button disabled={busy} className="btn btn-primary">
                      Save facts and regenerate preliminary draft
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
          <section className="matter-section" id="authority" tabIndex={-1}>
            {["client", "admin"].includes(role) ? (
              <AuthorityPanel
                clientId={n.clientId}
                initialData={data.client}
                admin={role === "admin"}
              />
            ) : (
              <article className="form-panel">
                <h2>Authority letter</h2>
                <p>
                  {data.client?.authorityStatus === "approved"
                    ? "Approved by administrator"
                    : "Refer to the administrator for authority review status."}
                </p>
                <FileLink file={n.authorityLetter}>
                  View authority letter
                </FileLink>
              </article>
            )}
          </section>
          <section
            className="form-panel matter-section"
            id="documents"
            tabIndex={-1}
          >
            <h2>Supporting documents and requests</h2>
            <p>
              Requested → Uploaded → Reviewed, or Corrections needed → a new
              client upload.
            </p>
            {[
              ...new Set(
                [n.supportingDocument, ...(n.supportingDocuments || [])].filter(
                  Boolean,
                ),
              ),
            ].map((file, i) => (
              <p key={file}>
                <FileLink file={file}>
                  Intake supporting record {i + 1}
                </FileLink>
              </p>
            ))}
            {isReviewer && !frozen && (
              <details>
                <summary>Request a document from the client</summary>
                <form
                  className="matter-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await act(
                      () =>
                        api(
                          "/api/matters/" + id + "/document-requests",
                          "POST",
                          request,
                        ),
                      "Document requested.",
                    );
                    if (ok) setRequest({ type: "", requestMessage: "" });
                  }}
                >
                  <label htmlFor="document-title">Document needed</label>
                  <input
                    id="document-title"
                    required
                    maxLength={150}
                    value={request.type}
                    onChange={(e) =>
                      setRequest((p) => ({ ...p, type: e.target.value }))
                    }
                  />
                  <label htmlFor="document-instructions">
                    What should the client provide?
                  </label>
                  <textarea
                    id="document-instructions"
                    required
                    maxLength={2000}
                    rows={3}
                    value={request.requestMessage}
                    onChange={(e) =>
                      setRequest((p) => ({
                        ...p,
                        requestMessage: e.target.value,
                      }))
                    }
                  />
                  <button className="btn btn-primary" disabled={busy}>
                    Send document request
                  </button>
                </form>
              </details>
            )}
            {!data.documents.length && (
              <p>No additional documents have been requested.</p>
            )}
            {data.documents.map((doc) => (
              <article className="document-request" key={doc._id}>
                <h3>{doc.type}</h3>
                <p>
                  <span className="matter-status">{doc.status}</span> · Revision{" "}
                  {doc.revision || 0}
                </p>
                <p className="preserve-lines">
                  {doc.requestMessage || "Supporting document"}
                </p>
                {doc.reviewNote && (
                  <p className="review-note">
                    <strong>Reviewer feedback:</strong> {doc.reviewNote}
                  </p>
                )}
                {doc.fileName && (
                  <p>
                    <FileLink file={doc.fileName}>Reference document</FileLink>
                  </p>
                )}
                {(doc.responseFiles || []).map((file, i) => (
                  <p key={file}>
                    <FileLink file={file}>Client response {i + 1}</FileLink>
                  </p>
                ))}
                {doc.reviewedAt && <p>Reviewed: {dates(doc.reviewedAt)}</p>}
                {isClient &&
                  !frozen &&
                  ["Requested", "Corrections needed"].includes(doc.status) && (
                    <>
                      <label htmlFor={"respond-" + doc._id}>
                        Upload response (up to five records, 10 MB each)
                      </label>
                      <input
                        id={"respond-" + doc._id}
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        disabled={busy}
                        onChange={(e) => uploadFiles(e, doc)}
                      />
                    </>
                  )}
                {isClient && doc.status === "Uploaded" && (
                  <p>
                    Your response is saved. Wait for the reviewer’s assessment.
                  </p>
                )}
                {isReviewer && doc.status === "Uploaded" && (
                  <div className="matter-form">
                    <label htmlFor={"review-" + doc._id}>
                      Review notes (required for corrections)
                    </label>
                    <textarea
                      id={"review-" + doc._id}
                      rows={3}
                      maxLength={2000}
                      value={notes[doc._id] || ""}
                      onChange={(e) =>
                        setNotes((p) => ({ ...p, [doc._id]: e.target.value }))
                      }
                    />
                    <div className="live-tools">
                      <button
                        type="button"
                        disabled={busy}
                        className="btn btn-primary"
                        onClick={() => review(doc, "Reviewed")}
                      >
                        Mark response reviewed
                      </button>
                      <button
                        type="button"
                        disabled={busy || !notes[doc._id]?.trim()}
                        className="btn btn-light"
                        onClick={() => review(doc, "Corrections needed")}
                      >
                        Request corrections
                      </button>
                    </div>
                  </div>
                )}
                {doc.responseHistory?.length > 0 && (
                  <details>
                    <summary>
                      Previous submissions ({doc.responseHistory.length})
                    </summary>
                    {doc.responseHistory.map((item, i) => (
                      <div key={i}>
                        <p>
                          Submission {i + 1} · {dates(item.uploadedAt)}
                        </p>
                        {item.files.map((file, j) => (
                          <p key={file}>
                            <FileLink file={file}>Record {j + 1}</FileLink>
                          </p>
                        ))}
                      </div>
                    ))}
                  </details>
                )}
              </article>
            ))}
          </section>
          <Suspense
            fallback={<p role="status">Loading document intelligence tools…</p>}
          >
            <AiWorkspace
              matterId={id}
              role={role}
              revision={n.draftRevision || 0}
              paymentStatus={n.paymentStatus}
              signedFile={n.signedFile}
              files={[
                n.supportingDocument,
                ...(n.supportingDocuments || []),
                ...data.documents.flatMap((d) => [
                  d.fileName,
                  ...(d.responseFiles || []),
                ]),
              ].filter(Boolean)}
              caseSummary={n.caseSummary}
              hasDraft={!!n.generatedNotice?.trim()}
              editingDraft={editing || editFacts}
              onApplied={load}
              onAdoptFacts={
                isClient && n.paymentStatus !== "Paid" && !n.lawyerId
                  ? (text) => {
                      setFacts({ subject: n.subject, caseSummary: text });
                      setEditFacts(true);
                      document
                        .getElementById("facts")
                        ?.scrollIntoView({ block: "start" });
                    }
                  : undefined
              }
            />
          </Suspense>
          <section
            className="form-panel matter-section"
            id="assignment"
            tabIndex={-1}
          >
            <h2>Advocate assignment</h2>
            <p>
              {n.lawyerName ||
                "The administrator will assign an approved advocate."}
            </p>
            {role === "admin" && !frozen && n.paymentStatus === "Paid" && (
              <form
                className="matter-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(
                    () =>
                      api(
                        "/api/client-portal/notices/" + id + "/assign-lawyer",
                        "POST",
                        { lawyerId: lawyer },
                      ),
                    "Advocate assigned.",
                  );
                }}
              >
                <label htmlFor="matter-lawyer">Approved advocate</label>
                <select
                  id="matter-lawyer"
                  required
                  value={lawyer}
                  onChange={(e) => setLawyer(e.target.value)}
                >
                  <option value="">Choose an advocate</option>
                  {lawyers
                    .filter((l) => ["active", "verified"].includes(l.status))
                    .map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name}
                      </option>
                    ))}
                </select>
                <button className="btn btn-primary" disabled={busy || !lawyer}>
                  Save assignment
                </button>
              </form>
            )}
          </section>
          <section
            className="form-panel matter-section"
            id="draft"
            tabIndex={-1}
          >
            <h2>Notice draft and versions</h2>
            <p>
              This is preliminary content until professional review. Current
              saved revision: {n.draftRevision || 0}.
            </p>
            {editing ? (
              <>
                <label htmlFor="matter-draft-editor">Edit notice draft</label>
                <Suspense fallback={<p>Loading draft editor…</p>}>
                  <Editor
                    ref={(instance) => {
                      if (instance) {
                        const root = instance.getEditor().root;
                        root.setAttribute("role", "textbox");
                        root.setAttribute("aria-label", "Notice draft content");
                        root.setAttribute("aria-multiline", "true");
                        root
                          .closest(".quill")
                          ?.querySelectorAll(".ql-toolbar button")
                          .forEach((b) =>
                            b.setAttribute(
                              "aria-label",
                              (
                                (b.className || "").replace("ql-", "") +
                                " " +
                                (b.value || "")
                              ).trim(),
                            ),
                          );
                      }
                    }}
                    modules={{
                      toolbar: [
                        ["bold", "italic", "underline"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["clean"],
                      ],
                    }}
                    id="matter-draft-editor"
                    theme="snow"
                    value={draft}
                    onChange={setDraft}
                    readOnly={busy || frozen}
                  />
                </Suspense>
                <details>
                  <summary>Compare with the current saved draft</summary>
                  <div
                    className="notice-content"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(n.generatedNotice || ""),
                    }}
                  />
                </details>
                <button
                  type="button"
                  className="btn btn-light"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const latest = await api("/api/matters/" + id);
                      setData(latest);
                      setVersions(latest.versions);
                      setRevision(latest.notice.draftRevision || 0);
                      setMessage(
                        "Latest saved content is available for comparison. Your editor text has been kept.",
                      );
                      setError("");
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Refresh comparison (keep my editor text)
                </button>
                <div className="live-tools">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || frozen}
                    onClick={saveDraft}
                  >
                    Save as new version
                  </button>
                  <button
                    type="button"
                    className="btn btn-light"
                    disabled={busy}
                    onClick={() => {
                      setDraft(n.generatedNotice || "");
                      setEditing(false);
                    }}
                  >
                    Cancel edits
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="notice-content"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      n.generatedNotice || "<p>No draft available.</p>",
                    ),
                  }}
                />
                {role === "lawyer" && !frozen && n.paymentStatus === "Paid" && (
                  <button
                    className="btn btn-light"
                    type="button"
                    disabled={busy}
                    onClick={() => setEditing(true)}
                  >
                    Edit draft
                  </button>
                )}
              </>
            )}
            <VettingPanel
              matterId={id}
              role={role}
              revision={n.draftRevision || 0}
              paid={n.paymentStatus === "Paid"}
              frozen={frozen}
              updatedAt={n.updatedAt}
              onUpdated={load}
            />
            <h3>Saved draft versions</h3>
            {!versions.length && (
              <p>
                Version history starts with the next saved draft edit. Earlier
                versions are not reconstructed.
              </p>
            )}
            <ul className="version-list">
              {versions.map((v) => (
                <li key={v._id}>
                  <span>
                    Revision {v.revision} · {v.actorRole} · {dates(v.createdAt)}
                    <small>{v.label}</small>
                  </span>
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setVersion(v)}
                  >
                    View revision {v.revision}
                  </button>
                </li>
              ))}
            </ul>
            {moreVersions && (
              <button
                className="btn btn-light"
                type="button"
                disabled={loadingMore}
                onClick={() => more("versions")}
              >
                Load older versions
              </button>
            )}
            {version && (
              <section
                className="version-preview"
                id="version-preview"
                tabIndex={-1}
              >
                <h3>Viewing saved revision {version.revision}</h3>
                <p>
                  {version.label}. This is a historical copy, not the current
                  draft.
                </p>
                <div
                  className="notice-content"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(version.content || ""),
                  }}
                />
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setVersion(null)}
                >
                  Close historical version
                </button>
                {role === "lawyer" && !frozen && n.paymentStatus === "Paid" && (
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => {
                      setDraft(version.content);
                      setEditing(true);
                      setVersion(null);
                    }}
                  >
                    Use as an editable draft (save required)
                  </button>
                )}
              </section>
            )}
          </section>
          <section
            className="form-panel matter-section"
            id="payment"
            tabIndex={-1}
          >
            <h2>Payment</h2>
            <p>
              Status: <strong>{n.paymentStatus}</strong>
            </p>
            {isClient && n.paymentStatus !== "Paid" && (
              <>
                <p>
                  Authority approval and configured pricing are required before
                  the gateway can open. No payment is taken when you submit a
                  notice request. If online payment is unavailable, contact the
                  administrator for a reconciled payment option.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !data.capabilities?.paymentGateway}
                  onClick={pay}
                >
                  {data.capabilities?.paymentGateway
                    ? "Continue to payment gateway"
                    : "Online payments unavailable"}
                </button>
              </>
            )}
            {!data.payments.length ? (
              <p>No payment records for this matter.</p>
            ) : (
              <ul>
                {data.payments.map((p) => (
                  <li key={p._id}>
                    {p.status}
                    {p.amount != null ? " · ₹" + p.amount : ""}
                    {p.txnId ? " · " + p.txnId : ""} ·{" "}
                    {dates(p.updatedAt || p.createdAt)}
                  </li>
                ))}
              </ul>
            )}
            {role === "admin" &&
              data.payments
                .filter((p) => p.status === "Pending" && p.method !== "PayU")
                .map((p) => (
                  <form
                    className="matter-form"
                    key={p._id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(
                        () =>
                          api(
                            "/api/payment-ledger/" + p._id + "/verify",
                            "POST",
                            { reference: reconciliations[p._id] },
                          ),
                        "External payment reconciliation recorded.",
                      );
                    }}
                  >
                    <p>
                      Reconcile external payment {p.txnId} · ₹{p.amount}. Check
                      the actual bank receipt first; this records reconciliation
                      and does not transfer money.
                    </p>
                    <label htmlFor={"reconcile-" + p._id}>
                      Bank reconciliation reference
                    </label>
                    <input
                      id={"reconcile-" + p._id}
                      required
                      value={reconciliations[p._id] || ""}
                      onChange={(e) =>
                        setReconciliations((r) => ({
                          ...r,
                          [p._id]: e.target.value,
                        }))
                      }
                    />
                    <button className="btn btn-primary" disabled={busy}>
                      Confirm reconciled payment
                    </button>
                  </form>
                ))}
          </section>
          <section
            className="form-panel matter-section"
            id="signed"
            tabIndex={-1}
          >
            <div id="delivery" tabIndex={-1} />
            <h2>Final signed notice and delivery</h2>
            {n.signedFile ? (
              <p>
                <FileLink file={n.signedFile}>
                  Download final signed notice
                </FileLink>
              </p>
            ) : (
              <p>
                A final signed PDF becomes available after payment and
                professional review.
              </p>
            )}
            {role === "lawyer" &&
              !frozen &&
              reviewed &&
              n.paymentStatus === "Paid" && (
                <form
                  className="matter-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      const u = await FileUpload(signed);
                      if (!u.success) throw Error(u.message);
                      await api(
                        "/api/client-portal/notices/" + id + "/signed-file",
                        "POST",
                        {
                          signedFile: u.fileName,
                          revision: n.draftRevision || 0,
                        },
                      );
                    }, "Final signed notice uploaded.");
                  }}
                >
                  <label htmlFor="signed-pdf">Final signed PDF</label>
                  <input
                    id="signed-pdf"
                    type="file"
                    accept=".pdf"
                    required
                    disabled={busy}
                    onChange={(e) => setSigned(e.target.files[0])}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={busy || !signed}
                  >
                    Upload final signed notice
                  </button>
                </form>
              )}
            <DeliveryPanel notice={n} canUpdate={['admin','lawyer'].includes(role)} onUpdated={load}/>

          </section>
          <section
            className="form-panel matter-section"
            id="timeline"
            tabIndex={-1}
          >
            <h2>Activity timeline</h2>
            <p>
              Recorded activity from this update onward. Older actions are not
              reconstructed; current payment and delivery records appear in
              their sections above.
            </p>
            <ol className="matter-timeline">
              {events.map((event) => (
                <li key={event._id}>
                  <strong>{event.label}</strong>
                  <p>
                    {event.actorRole} · {dates(event.createdAt)}
                  </p>
                  {(event.attachments || []).map(file => <p key={file._id || file.fileName}><FileLink file={file.fileName}>{file.kind === 'courierReceipt' ? 'Courier receipt' : 'Proof of delivery'}</FileLink></p>)}
                  {event.detail && (
                    <p className="preserve-lines">{event.detail}</p>
                  )}
                </li>
              ))}
              <li>
                <strong>Request created</strong>
                <p>{dates(n.createdAt)}</p>
              </li>
            </ol>
            {moreEvents && (
              <button
                className="btn btn-light"
                type="button"
                disabled={loadingMore}
                onClick={() => more("events")}
              >
                Load earlier activity
              </button>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
