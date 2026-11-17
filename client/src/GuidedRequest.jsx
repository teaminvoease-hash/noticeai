import noticeCategories from './data/categories.json';
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ClientLayout from "./AdminDashboard/dashscreen/eraser/ClientPortalLayout";
import { fetchData, FileUpload } from "./helper/ApiCall";
const steps = [
  "Matter type",
  "Recipient",
  "Facts",
  "Documents",
  "Review & submit",
];
const initial = {
  subject: "",
  category: "",
  defaulterId: "",
  recipientDetails: "",
  caseSummary: "",
  supportingDocument: "",
  supportingDocuments: [],
};
export default function GuidedRequest() {
  const navigate = useNavigate(),
    location = useLocation(),
    id = new URLSearchParams(location.search).get("draft"),
    edit = new URLSearchParams(location.search).get("edit");
  const requestedCategory = new URLSearchParams(location.search).get("category");
  const selectedCategory = Object.values(noticeCategories).flat().includes(requestedCategory) ? requestedCategory : "";
  const [list, setList] = useState(null),
    [draft, setDraft] = useState(null),
    [form, setForm] = useState(initial),
    [step, setStep] = useState(0),
    [recipients, setRecipients] = useState([]),
    [error, setError] = useState(""),
    [errors, setErrors] = useState({}),
    [saveState, setSaveState] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [adding, setAdding] = useState(false),
    [person, setPerson] = useState({
      name: "",
      address: "",
      email: "",
      phone: "",
      companyName: "",
    });
  const context = useRef(null),
    heading = useRef(null),
    revision = useRef(0),
    current = useRef({ form: initial, step: 0 }),
    saved = useRef(""),
    queue = useRef(Promise.resolve()),
    conflict = useRef(false),
    ready = useRef(false);
  current.current = { form, step };
  async function request(url, method = "GET", body) {
    const r = await fetchData(url, method, body);
    if (!r.success) throw Error(r.message || "Unable to complete this action");
    return r.data;
  }
  useEffect(() => {
    if (edit) navigate("/matters/" + edit, { replace: true });
  }, [edit]);
  useEffect(() => {
    let active = true;
    request("/api/client-portal/defaulters")
      .then((d) => active && setRecipients(d))
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    ready.current = false;
    conflict.current = false;
    setDraft(null);
    setError("");
    setConfirmed(false);
    if (!id) {
      setList(null);
      request("/api/intake-drafts")
        .then((d) => active && setList(d))
        .catch((e) => active && setError(e.message));
      return () => {
        active = false;
      };
    }
    request("/api/intake-drafts/" + id)
      .then((d) => {
        if (!active) return;
        if (d.state === "submitted" && d.noticeId) {
          navigate("/matters/" + d.noticeId, { replace: true });
          return;
        }
        const f = { ...initial, ...d.fields };
        setDraft(d);
        setForm(f);
        setStep(d.step);
        revision.current = d.revision;
        saved.current = JSON.stringify({ form: f, step: d.step });
        context.current = {
          id,
          revision: d.revision,
          saved: saved.current,
          queue: Promise.resolve(),
          conflict: false,
        };
        current.current = { form: f, step: d.step };
        ready.current = true;
        setSaveState(
          d.state === "submitting"
            ? "Submission is processing. Check its result below."
            : "Saved to your account",
        );
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
      ready.current = false;
    };
  }, [id]);
  function save(snapshot = current.current) {
    const ctx = context.current,
      text = JSON.stringify(snapshot);
    if (!ready.current || !draft || draft.state !== "draft" || !ctx)
      return queue.current;
    if (ctx.conflict)
      return Promise.reject(
        Error("Reload the saved version before editing further."),
      );
    setSaveState("Saving…");
    const operation = ctx.queue
      .catch(() => {})
      .then(async () => {
        if (ctx.conflict)
          throw Error("Reload the saved version before editing further.");
        if (text === ctx.saved) {
          if (context.current === ctx) setSaveState("Saved to your account");
          return;
        }
        try {
          const data = await request("/api/intake-drafts/" + ctx.id, "PUT", {
            revision: ctx.revision,
            fields: snapshot.form,
            step: snapshot.step,
          });
          ctx.revision = data.revision;
          ctx.saved = text;
          if (context.current === ctx) {
            revision.current = data.revision;
            saved.current = text;
            setSaveState(
              JSON.stringify(current.current) === text
                ? "Saved to your account"
                : "Saving changes…",
            );
          }
        } catch (e) {
          if (/changed|another tab|Reload/i.test(e.message))
            ctx.conflict = true;
          if (context.current === ctx) {
            conflict.current = ctx.conflict;
            setSaveState("Not saved — " + e.message);
          }
          throw e;
        }
      });
    ctx.queue = operation;
    queue.current = operation;
    return operation;
  }

  useEffect(() => {
    if (!ready.current || !draft) return;
    setConfirmed(false);
    const timer = setTimeout(() => save().catch(() => {}), 800);
    return () => clearTimeout(timer);
  }, [form, step, draft]);
  useEffect(() => {
    const warn = (e) => {
      if (
        id &&
        ready.current &&
        JSON.stringify(current.current) !== saved.current
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [id]);
  useEffect(() => {
    heading.current?.focus();
  }, [step, id]);
  useEffect(() => {
    if (!id || !draft) return;
    const dirty = () =>
      ready.current && JSON.stringify(current.current) !== saved.current;
    const click = (e) => {
      const link = e.target.closest?.("a[href]");
      if (
        !link ||
        link.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        !dirty()
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname.startsWith("/uploads/")
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      save()
        .then(() => navigate(url.pathname + url.search + url.hash))
        .catch((err) => setError(err.message));
    };
    const pop = () => {
      if (dirty()) save().catch(() => {});
    };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop, true);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop, true);
    };
  }, [id, draft]);

  function change(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
    setError("");
  }
  function validate(index) {
    const e = {};
    if (index === 0) {
      if (!form.category) e.category = "Choose the type of matter.";
      if (!form.subject.trim()) e.subject = "Enter a short subject.";
    }
    if (index === 1 && !form.defaulterId)
      e.defaulterId = "Choose or add the recipient.";
    if (index === 2 && form.caseSummary.trim().length < 20)
      e.caseSummary = "Describe the facts in at least 20 characters.";
    return e;
  }
  async function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) {
      setError("Please complete the highlighted fields.");
      document.getElementById("request-" + Object.keys(e)[0])?.focus();
      return;
    }
    try {
      await save();
      setStep((s) => Math.min(4, s + 1));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  async function close() {
    setBusy(true);
    try {
      await save();
      navigate("/client-notice-submission");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const d = await request("/api/intake-drafts", "POST");
      if (selectedCategory) await request("/api/intake-drafts/" + d._id, "PUT", {
        revision: d.revision, fields: {...initial, category: selectedCategory}, step: 0
      });
      navigate("?draft=" + d._id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function addRecipient() {
    setBusy(true);
    try {
      const d = await request("/api/intake-recipients", "POST", person);
      setRecipients((p) => [d, ...p]);
      change("defaulterId", d._id);
      setAdding(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    const files = [...(e.target.files || [])];
    if (files.length + (form.supportingDocuments || []).length > 5) {
      setError("Choose up to five supporting documents.");
      return;
    }
    setUploading(true);
    setError("");
    const names = [];
    try {
      for (const file of files) {
        const r = await FileUpload(file);
        if (!r.success) throw Error(r.message);
        names.push(r.fileName);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      if (names.length)
        setForm((p) => {
          const documents = [...(p.supportingDocuments || []), ...names];
          return {
            ...p,
            supportingDocument: documents[0] || "",
            supportingDocuments: documents,
          };
        });
      setUploading(false);
      e.target.value = "";
    }
  }
  async function submit() {
    const all = { ...validate(0), ...validate(1), ...validate(2) };
    if (Object.keys(all).length) {
      setErrors(all);
      setStep(!form.category || !form.subject ? 0 : !form.defaulterId ? 1 : 2);
      setError("Complete the required details before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await save();
      const result = await request(
        "/api/intake-drafts/" + id + "/submit",
        "POST",
        { revision: revision.current },
      );
      navigate("/matters/" + result._id, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function field(key, label, textarea = false, hint = "") {
    return (
      <div className="matter-field">
        <label htmlFor={"request-" + key}>{label}</label>
        {hint && <p id={"hint-" + key}>{hint}</p>}
        {textarea ? (
          <textarea
            id={"request-" + key}
            value={form[key]}
            rows={key === "caseSummary" ? 9 : 3}
            maxLength={key === "caseSummary" ? 20000 : 3000}
            aria-describedby={
              "hint-" + key + (errors[key] ? " error-" + key : "")
            }
            aria-invalid={!!errors[key]}
            onChange={(e) => change(key, e.target.value)}
            onBlur={() => save().catch(() => {})}
          />
        ) : (
          <input
            id={"request-" + key}
            value={form[key]}
            maxLength={200}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? "error-" + key : undefined}
            onChange={(e) => change(key, e.target.value)}
            onBlur={() => save().catch(() => {})}
          />
        )}{" "}
        {errors[key] && (
          <p className="field-error" id={"error-" + key}>
            {errors[key]}
          </p>
        )}
      </div>
    );
  }
  const recipient = recipients.find((r) => r._id === form.defaulterId);
  return (
    <ClientLayout
      title="Request a notice"
      subtitle="Build your request one step at a time. Unfinished requests are saved privately to your account."
      activeKey="submit"
    >
      <div className="matter-message" role="alert">
        {error}
      </div>
      {!id ? (
        <section className="form-panel">
          <h2>Start or resume a request</h2>
          {selectedCategory && <p role="status"><strong>Selected notice type:</strong> {selectedCategory}. A new request will start with this category; existing saved requests stay unchanged.</p>}
          <p>
            A saved request is private to you. It becomes a matter for the team
            after submission.
          </p>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            onClick={create}
          >
            {busy ? "Starting…" : "Start a new request →"}
          </button>
          <h3>Your unfinished requests</h3>
          {!list ? (
            <p>Loading saved requests…</p>
          ) : !list.length ? (
            <p>No unfinished requests yet.</p>
          ) : (
            <ul className="saved-requests">
              {list.map((d) => (
                <li key={d._id}>
                  <div>
                    <strong>{d.fields?.subject || "Untitled request"}</strong>
                    <p>
                      Step {(d.step || 0) + 1} of 5 · saved{" "}
                      {new Date(d.updatedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Link className="btn btn-light" to={"?draft=" + d._id}>
                    {d.state === "submitting"
                      ? "Check submission"
                      : "Resume request"}{" "}
                    →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : !draft ? (
        <section className="form-panel">
          <p role="status">
            {error
              ? "The saved request could not be opened."
              : "Opening saved request…"}
          </p>
          <Link to="/client-notice-submission">Back to saved requests</Link>
        </section>
      ) : (
        <section
          className="form-panel request-wizard"
          aria-busy={busy || uploading}
        >
          <div className="wizard-save">
            <p role="status" aria-live="polite">
              {saveState}
            </p>
            <button
              type="button"
              className="btn btn-light"
              disabled={busy || uploading}
              onClick={close}
            >
              Save and close
            </button>
          </div>
          <ol className="request-steps" aria-label="Request progress">
            {steps.map((title, i) => (
              <li key={title} aria-current={step === i ? "step" : undefined}>
                <span>{i + 1}</span>
                {title}
              </li>
            ))}
          </ol>
          <h2 ref={heading} tabIndex={-1}>
            Step {step + 1}: {steps[step]}
          </h2>
          {conflict.current && (
            <button
              type="button"
              className="btn btn-light"
              onClick={() => window.location.reload()}
            >
              Reload saved version (discard local edits)
            </button>
          )}
          {draft.state === "submitting" ? (
            <>
              <p>
                Your request may already have been accepted. Check its status
                before creating another request.
              </p>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={submit}
              >
                Check submission result
              </button>
            </>
          ) : (
            <>
              <fieldset disabled={busy || uploading} className="wizard-fields">
                <legend className="sr-only">{steps[step]}</legend>
                {step === 0 && (
                  <>
                    <label htmlFor="request-category">
                      What is this matter about?
                    </label>
                    <select
                      id="request-category"
                      value={form.category}
                      aria-invalid={!!errors.category}
                      aria-describedby={
                        errors.category ? "error-category" : undefined
                      }
                      onChange={(e) => change("category", e.target.value)}
                    >
                      <option value="">Choose a matter type</option>{Object.entries(noticeCategories).map(([group,items])=><optgroup key={group} label={group}>{items.map(item=><option key={item} value={item}>{item}</option>)}</optgroup>)}
                      {[
                        ["Financial", "Payments, invoices or refunds"],
                        ["Contract", "Contracts, vendors or services"],
                        ["Employment", "Employment or HR"],
                        ["Property", "Property or tenancy"],
                        ["General", "Other business matter"],
                      ].map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="field-error" id="error-category">
                        {errors.category}
                      </p>
                    )}
                    {field(
                      "subject",
                      "Give this request a short subject",
                      false,
                    )}
                  </>
                )}
                {step === 1 && (
                  <>
                    <label htmlFor="request-defaulterId">
                      Who should receive the notice?
                    </label>
                    <select
                      id="request-defaulterId"
                      value={form.defaulterId}
                      aria-invalid={!!errors.defaulterId}
                      aria-describedby={
                        errors.defaulterId ? "error-defaulterId" : undefined
                      }
                      onChange={(e) => change("defaulterId", e.target.value)}
                    >
                      <option value="">Choose a saved recipient</option>
                      {recipients.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name} {r.companyName ? "· " + r.companyName : ""}
                        </option>
                      ))}
                    </select>
                    {errors.defaulterId && (
                      <p className="field-error" id="error-defaulterId">
                        {errors.defaulterId}
                      </p>
                    )}
                    {recipient && <p>{recipient.address}</p>}
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => setAdding((p) => !p)}
                      aria-expanded={adding}
                    >
                      Add a new recipient
                    </button>
                    {adding && (
                      <fieldset className="recipient-entry">
                        <legend>Recipient details</legend>
                        {[
                          ["name", "Name (required)"],
                          ["companyName", "Company (optional)"],
                          ["address", "Postal address (required)"],
                          ["email", "Email (optional)"],
                          ["phone", "Phone (optional)"],
                        ].map(([k, l]) => (
                          <label key={k} htmlFor={"recipient-" + k}>
                            {l}
                            <input
                              id={"recipient-" + k}
                              type={k === "email" ? "email" : "text"}
                              autoComplete={
                                k === "email"
                                  ? "email"
                                  : k === "phone"
                                    ? "tel"
                                    : "off"
                              }
                              value={person[k]}
                              onChange={(e) =>
                                setPerson((p) => ({
                                  ...p,
                                  [k]: e.target.value,
                                }))
                              }
                            />
                          </label>
                        ))}
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={addRecipient}
                        >
                          Save recipient
                        </button>
                      </fieldset>
                    )}
                    {field(
                      "recipientDetails",
                      "Additional recipient details (optional)",
                      true,
                      "Include the relevant contact, department or alternative address if needed.",
                    )}
                  </>
                )}
                {step === 2 && (
                  <>
                    {field(
                      "caseSummary",
                      "Explain what happened",
                      true,
                      "Include key dates, amounts (if applicable), what was agreed, what went wrong and the resolution you want. Share facts you can support with records.",
                    )}
                  </>
                )}
                {step === 3 && (
                  <>
                    <p>
                      Attach up to five supporting records, such as a contract,
                      invoice or correspondence. Documents are optional at this
                      stage; your reviewer may request more.
                    </p>
                    <label htmlFor="request-files">
                      Supporting documents (up to 10 MB per file)
                    </label>
                    <input
                      id="request-files"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={upload}
                    />
                    <ul>
                      {(form.supportingDocuments || []).map((file, i) => (
                        <li key={file}>
                          <a
                            href={"/uploads/" + file}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Supporting record {i + 1} ↗
                          </a>{" "}
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => {
                              const documents = form.supportingDocuments.filter(
                                (f) => f !== file,
                              );
                              change("supportingDocuments", documents);
                              change("supportingDocument", documents[0] || "");
                            }}
                          >
                            Remove from request
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p>
                      Removing a file here removes its attachment to this
                      request; it does not delete the uploaded file.
                    </p>
                  </>
                )}
                {step === 4 && (
                  <>
                    <p>
                      Check the facts before sending. You will track payment,
                      professional review and delivery from your matter page.
                      Submission does not send a notice to the recipient.
                    </p>
                    <dl className="matter-summary">
                      <dt>Matter type</dt>
                      <dd>{form.category}</dd>
                      <dt>Subject</dt>
                      <dd>{form.subject}</dd>
                      <dt>Recipient</dt>
                      <dd>
                        {recipient?.name}
                        <br />
                        {recipient?.address}
                      </dd>
                      <dt>Additional recipient details</dt>
                      <dd>{form.recipientDetails || "None"}</dd>
                      <dt>Facts and requested resolution</dt>
                      <dd className="preserve-lines">{form.caseSummary}</dd>
                      <dt>Supporting records</dt>
                      <dd>{form.supportingDocuments.length} attached</dd>
                    </dl>
                    <p>
                      A signed authority letter must be uploaded in{" "}
                      <Link to="/client-profile">Profile</Link> before
                      submission. Your saved request remains available if that
                      step is incomplete.
                    </p>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      I have reviewed the recipient, facts and attachments.
                    </label>
                  </>
                )}
              </fieldset>
              <div className="wizard-actions">
                <button
                  type="button"
                  className="btn btn-light"
                  disabled={step === 0 || busy || uploading}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </button>
                {step < 4 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || uploading}
                    onClick={next}
                  >
                    {uploading ? "Uploading…" : "Save and continue →"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      busy || uploading || !confirmed || conflict.current
                    }
                    onClick={submit}
                  >
                    {busy ? "Submitting…" : "Submit request →"}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </ClientLayout>
  );
}
