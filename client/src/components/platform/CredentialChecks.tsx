import { useEffect, useState } from "react";
import AdminLayout from "../../AdminDashboard/dashscreen/eraser/AdminPortalLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
interface Advocate {
  _id: string;
  name: string;
  email: string;
  status: string;
  enrollmentNo?: string;
  credentialReview?: {
    status: string;
    barCouncil: string;
    enrolmentNumber: string;
    sourceReference: string;
    checkedAt: string;
  };
}
export default function CredentialChecks() {
  const [rows, setRows] = useState<Advocate[]>([]),
    [id, setId] = useState(""),
    [barCouncil, setBar] = useState(""),
    [enrolmentNumber, setNumber] = useState(""),
    [sourceReference, setReference] = useState(""),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    setRows(await api<Advocate[]>("/api/get-lawyer"));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  const selected = rows.find((r) => r._id === id);
  useEffect(() => {
    setBar(selected?.credentialReview?.barCouncil || "");
    setNumber(
      selected?.credentialReview?.enrolmentNumber ||
        selected?.enrollmentNo ||
        "",
    );
    setReference("");
    setChecked(false);
    setMessage("");
  }, [id]);
  async function record(status: "verified" | "withdrawn") {
    setBusy(true);
    setError("");
    try {
      await api("/api/advocates/" + id + "/credential-review", "POST", {
        status,
        barCouncil,
        enrolmentNumber,
        sourceReference,
        practisingStatusChecked: checked,
      });
      await load();
      setMessage(
        "Credential check recorded. This does not certify BCI approval of the advocate or platform.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save verification");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminLayout
      title="Advocate credential checks"
      activeKey="credentials"
      subtitle="Record source-based manual verification before an advocate can approve or issue notices."
    >
      <section className="form-panel">
        <h2>Practising credentials</h2>
        <p className="mb-5 leading-7">
          Verify enrolment, identity and current practising status with the
          relevant State Bar Council and supporting records, including
          certificate-of-practice requirements where applicable. An active login
          alone is not credential verification.
        </p>
        <label htmlFor="credential-advocate">Choose advocate</label>
        <select
          id="credential-advocate"
          className="my-3 w-full rounded-lg border p-3"
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          <option value="">Select an advocate</option>
          {rows.map((r) => (
            <option value={r._id} key={r._id}>
              {r.name} — {r.credentialReview?.status || "Not checked"}
            </option>
          ))}
        </select>
        {selected && (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              record("verified");
            }}
          >
            <p>
              Recorded state:{" "}
              <strong>
                {selected.credentialReview?.status || "Not checked"}
              </strong>
              {selected.credentialReview?.checkedAt
                ? " · " +
                  new Date(selected.credentialReview.checkedAt).toLocaleString(
                    "en-IN",
                    { timeZone: "Asia/Kolkata" },
                  ) +
                  " IST"
                : ""}
            </p>
            <label htmlFor="credential-council">State Bar Council</label>
            <input
              id="credential-council"
              className="rounded-lg border p-3"
              required
              maxLength={1000}
              value={barCouncil}
              onChange={(e) => setBar(e.target.value)}
            />
            <label htmlFor="credential-number">Enrolment number</label>
            <input
              id="credential-number"
              className="rounded-lg border p-3"
              required
              maxLength={1000}
              value={enrolmentNumber}
              onChange={(e) => setNumber(e.target.value)}
            />
            <label htmlFor="credential-source">
              Verification source/reference and date checked
            </label>
            <textarea
              id="credential-source"
              className="rounded-lg border p-3"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              value={sourceReference}
              onChange={(e) => setReference(e.target.value)}
            />
            <label className="flex items-start gap-3 text-sm leading-7">
              <input
                required
                type="checkbox"
                className="mt-1 size-5"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              I personally checked current practising status and the applicable
              supporting requirements against the stated source.
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>
                Record verified credentials
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => record("withdrawn")}
              >
                Withdraw verification
              </Button>
            </div>
          </form>
        )}
        {error && (
          <p className="mt-4" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4" role="status">
            {message}
          </p>
        )}
      </section>
    </AdminLayout>
  );
}
