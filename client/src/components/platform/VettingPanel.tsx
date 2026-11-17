import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Role } from "@/types/platform";
interface Review {
  revision: number;
  reviewedAt: string;
  note: string;
  updates: string;
}
interface Status {
  current: boolean;
  credentialStatus: string;
  review: Review | null;
  credentials?: {
    barCouncil: string;
    enrolmentNumber: string;
    checkedAt: string;
  };
}
export default function VettingPanel({
  matterId,
  role,
  revision,
  paid,
  frozen,
  updatedAt,
  onUpdated,
}: {
  matterId: string;
  role: Role;
  revision: number;
  paid: boolean;
  frozen: boolean;
  updatedAt: string;
  onUpdated: () => Promise<unknown>;
}) {
  const [policy, setPolicy] = useState<{
      checklist: Record<string, string>;
      mandatory: string;
    } | null>(null),
    [status, setStatus] = useState<Status | null>(null),
    [checks, setChecks] = useState<Record<string, boolean>>({}),
    [note, setNote] = useState(""),
    [updates, setUpdates] = useState(""),
    [route, setRoute] = useState(""),
    [email, setEmail] = useState(""),
    [basis, setBasis] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [p, s] = await Promise.all([
      api<{ checklist: Record<string, string>; mandatory: string }>(
        "/api/professional-policy",
      ),
      api<Status>("/api/matters/" + matterId + "/professional-review"),
    ]);
    setPolicy(p);
    setStatus(s);
  }
  useEffect(() => {
    setChecks({});
    setNote("");
    setUpdates("");
    setRoute("");
    setEmail("");
    setBasis("");
    load().catch((e) => setError(e.message));
  }, [matterId, revision, frozen, updatedAt]);
  return (
    <Card id="professional-review" className="my-6 scroll-mt-5" tabIndex={-1}>
      <CardHeader>
        <CardTitle>Mandatory advocate vetting, checking and updates</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 leading-7">
          {policy?.mandatory ||
            "The assigned advocate must check this notice and make necessary corrections and updates before approval, signature and issuance."}
        </p>
        <p className="mb-4 text-sm leading-7">
          Credential checks:{" "}
          <strong>
            {status?.credentialStatus === "verified"
              ? "Recorded by the platform administrator"
              : "Not recorded or withdrawn"}
          </strong>
          .{" "}
          {status?.credentials?.enrolmentNumber && (
            <span>
              {status.credentials.barCouncil} · Enrolment{" "}
              {status.credentials.enrolmentNumber}.{" "}
            </span>
          )}
          This is not BCI certification or an automated verification against a
          Bar Council register.
        </p>
        {status?.current ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <strong>
              Assigned advocate approval recorded for revision{" "}
              {status.review?.revision}.
            </strong>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              {status.review?.note}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              Corrections/updates: {status.review?.updates}
            </p>
            {role === "lawyer" && !frozen && (
              <Button
                className="mt-4"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(
                      "/api/client-portal/notices/" + matterId + "/status",
                      "POST",
                      { status: "pending", revision },
                    );
                    await onUpdated();
                    await load();
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Unable to reopen review",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Reopen review for corrections or route changes
              </Button>
            )}
          </div>
        ) : (
          <p
            role="status"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7"
          >
            Professional approval of this exact saved revision is not recorded.
            Submission, AI generation, payment and admin authority approval do
            not issue a notice.
          </p>
        )}
        {role === "admin" && (
          <p className="mt-4 text-sm leading-7">
            Administration coordinates records and verifies credentials. It
            cannot provide the assigned advocate’s professional approval.{" "}
            <Link className="underline" to="/admin-credential-checks">
              Record credential checks
            </Link>
            .
          </p>
        )}
        {role === "lawyer" && !frozen && !status?.current && (
          <form
            className="mt-5 grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await api(
                  "/api/client-portal/notices/" + matterId + "/status",
                  "POST",
                  {
                    status: "approved",
                    revision,
                    vetting: {
                      checklist: checks,
                      note,
                      updates,
                      serviceRoute: { mode: route, email, basis },
                    },
                  },
                );
                await onUpdated();
                await load();
                setMessage(
                  "Mandatory vetting and updates recorded for this saved revision. A separately signed PDF is still required.",
                );
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to record review",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset className="grid gap-4" disabled={busy}>
              <legend className="mb-4 font-semibold">
                Your personal professional checks — all mandatory
              </legend>
              {policy &&
                Object.entries(policy.checklist).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-start gap-3 text-sm leading-7"
                  >
                    <input
                      required
                      type="checkbox"
                      className="mt-1 size-5 shrink-0"
                      checked={!!checks[key]}
                      onChange={(e) =>
                        setChecks((v) => ({ ...v, [key]: e.target.checked }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
            </fieldset>
            <fieldset className="grid gap-3">
              <legend className="mb-3 font-semibold">
                Professionally checked communication/service route
              </legend>
              <label htmlFor="vetting-route">Route</label>
              <select
                id="vetting-route"
                required
                className="rounded-lg border border-input p-3"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              >
                <option value="">Select a checked route</option>
                <option value="unrepresented_email">
                  Email to an unrepresented recipient, after checking
                  appropriateness
                </option>
                <option value="through_counsel">
                  Communication through the recipient’s advocate
                </option>
                <option value="manual_service">
                  Non-email service determined by the advocate
                </option>
              </select>
              {route && route !== "manual_service" && (
                <>
                  <label htmlFor="vetting-email">
                    Verified destination email{" "}
                    {route === "through_counsel"
                      ? "of the recipient’s advocate"
                      : ""}
                  </label>
                  <input
                    id="vetting-email"
                    type="email"
                    required
                    className="rounded-lg border border-input p-3"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </>
              )}
              <label htmlFor="vetting-basis">
                Representation/service checks and route basis
              </label>
              <textarea
                id="vetting-basis"
                required
                minLength={20}
                maxLength={2000}
                rows={3}
                className="rounded-lg border border-input p-3"
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
              />
            </fieldset>
            <label htmlFor="vetting-note">
              Review conclusion (20–2,000 characters)
            </label>
            <textarea
              id="vetting-note"
              minLength={20}
              maxLength={2000}
              required
              rows={3}
              className="rounded-lg border border-input p-3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <label htmlFor="vetting-updates">
              Corrections and updates made
            </label>
            <textarea
              id="vetting-updates"
              minLength={20}
              maxLength={2000}
              required
              rows={3}
              className="rounded-lg border border-input p-3"
              value={updates}
              onChange={(e) => setUpdates(e.target.value)}
            />
            <p className="text-xs leading-6 text-muted-foreground">
              These review conclusions and updates are visible to the client. Do
              not include confidential conflict-check details or third-party
              information here. Save necessary edits as a draft version first.
              If no change was necessary, explain why the checked text is
              appropriate. Any later draft, document or assignment change
              requires fresh professional approval.
            </p>
            <Button
              disabled={
                busy ||
                !paid ||
                !policy ||
                status?.credentialStatus !== "verified"
              }
              type="submit"
            >
              {busy
                ? "Recording review…"
                : "Record mandatory advocate approval"}
            </Button>
            {!paid && (
              <p className="text-sm">
                Payment must be verified before professional approval.
              </p>
            )}
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
      </CardContent>
    </Card>
  );
}
