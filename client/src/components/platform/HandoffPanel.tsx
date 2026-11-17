import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Role } from "@/types/platform";
export interface Handoff {
  step: number;
  owner: Role | null;
  label: string;
  nextAction?: string;
  whatHappensNext?: string;
  section?: string;
  updateNote?: string;
  nextUpdateAt?: string | null;
  updatedAt?: string;
}
const roles = {
  client: "Client",
  admin: "Administration",
  lawyer: "Assigned advocate",
};
const when = (s?: string | null) =>
  s
    ? new Date(s).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "Not yet scheduled";
export default function HandoffPanel({
  matterId,
  workflow,
  role,
  updatedAt,
  onUpdated,
}: {
  matterId: string;
  workflow: Handoff;
  role: Role;
  updatedAt: string;
  onUpdated: () => Promise<unknown>;
}) {
  const [note, setNote] = useState(""),
    [next, setNext] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Card className="my-5" id="next-action" tabIndex={-1}>
      <CardHeader>
        <CardTitle>What happens next</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="handoff-grid">
          <div>
            <dt>Current step</dt>
            <dd>{workflow.label}</dd>
          </div>
          <div>
            <dt>Responsible now</dt>
            <dd>
              {workflow.owner
                ? workflow.owner === role
                  ? "You"
                  : roles[workflow.owner]
                : "No action pending"}
            </dd>
          </div>
          <div>
            <dt>Next update expected</dt>
            <dd>{when(workflow.nextUpdateAt)}</dd>
          </div>
          <div>
            <dt>Last matter update</dt>
            <dd>{when(updatedAt)}</dd>
          </div>
        </dl>
        <p className="my-4 leading-7">{workflow.nextAction}</p>
        <p className="text-sm leading-7 text-muted-foreground">
          {workflow.whatHappensNext}
        </p>
        {workflow.updateNote && (
          <p className="my-4 rounded-lg bg-muted p-4 whitespace-pre-wrap">
            <strong>Latest team update: </strong>
            {workflow.updateNote}
          </p>
        )}
        {workflow.nextUpdateAt &&
          new Date(workflow.nextUpdateAt) < new Date() &&
          workflow.step !== 7 && (
            <p role="status" className="my-3 text-sm text-amber-800">
              The recorded update time has passed. Ask the team for a fresh
              update; this does not determine a legal deadline.
            </p>
          )}
        <Button asChild className="mt-4" variant="outline">
          <a href={"#" + (workflow.section || "timeline")}>
            {workflow.owner === role
              ? "Go to your next step"
              : "View the current step"}
          </a>
        </Button>
        {role === "client" && (
          <p className="mt-4 text-sm leading-7">
            No update time is guaranteed unless recorded by the team. For urgent
            deadlines, contact your advocate promptly.{" "}
            <a href="/contact" className="underline">
              Contact support
            </a>
            .
          </p>
        )}
        {role !== "client" && (
          <details className="mt-5">
            <summary>Record an update for the client</summary>
            <form
              className="mt-4 grid gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await api("/api/matters/" + matterId + "/handoff", "POST", {
                    note,
                    nextUpdateAt: next ? new Date(next).toISOString() : null,
                    expectedUpdatedAt: updatedAt,
                  });
                  setNote("");
                  setNext("");
                  await onUpdated();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Unable to save update",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="client-handoff-note">Clear client update</label>
              <textarea
                id="client-handoff-note"
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                className="rounded-lg border border-input p-3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <label htmlFor="client-next-update">
                Expected next update (your local time, optional)
              </label>
              <input
                id="client-next-update"
                type="datetime-local"
                className="rounded-lg border border-input p-3"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <p className="text-xs leading-6 text-muted-foreground">
                This records a communication commitment, not a limitation or
                service deadline. An in-app notification is saved for the
                client.
              </p>
              {error && <p role="alert">{error}</p>}
              <Button disabled={busy} type="submit">
                {busy ? "Saving update…" : "Save client update"}
              </Button>
            </form>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
