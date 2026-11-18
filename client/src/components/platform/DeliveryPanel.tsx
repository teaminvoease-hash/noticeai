import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FileUpload } from "@/helper/ApiCall";
interface DeliveryMatter {
  _id: string;
  updatedAt: string;
  signedFile?: string;
  courier?: string;
  trackingId?: string;
  dispatchDate?: string;
  deliveryStatus?: string;
  courierReceipt?: string;
  proofOfDelivery?: string;
}
const fileLink = (name: string, label: string) => (
  <a
    className="font-medium text-primary underline underline-offset-4"
    href={"/uploads/" + encodeURIComponent(name)}
    target="_blank"
    rel="noreferrer"
  >
    {label} ↗
  </a>
);
export default function DeliveryPanel({
  notice,
  canUpdate,
  onUpdated,
}: {
  notice: DeliveryMatter;
  canUpdate: boolean;
  onUpdated: () => Promise<unknown>;
}) {
  const [fields, setFields] = useState({
    courier: "",
    trackingId: "",
    dispatchDate: "",
    deliveryStatus: "In Transit",
    note: "",
    nextUpdateAt: "",
  });
  const [receipt, setReceipt] = useState<File | null>(null),
    [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    setFields({
      courier: notice.courier || "",
      trackingId: notice.trackingId || "",
      dispatchDate: notice.dispatchDate || "",
      deliveryStatus:
        notice.deliveryStatus && notice.deliveryStatus !== "Not dispatched"
          ? notice.deliveryStatus
          : "In Transit",
      note: "",
      nextUpdateAt: "",
    });
  }, [notice.updatedAt]);
  return (
    <>
      <h3>Courier receipt and delivery</h3>
      <dl className="matter-summary">
        <dt>Courier</dt>
        <dd>{notice.courier || "Not recorded"}</dd>
        <dt>Tracking reference</dt>
        <dd>{notice.trackingId || "Not dispatched"}</dd>
        <dt>Dispatch date</dt>
        <dd>{notice.dispatchDate || "Not recorded"}</dd>
        <dt>Delivery status</dt>
        <dd>{notice.deliveryStatus || "Not dispatched"}</dd>
      </dl>
      {notice.courierReceipt && (
        <p>{fileLink(notice.courierReceipt, "View courier receipt")}</p>
      )}
      {notice.proofOfDelivery && (
        <p>{fileLink(notice.proofOfDelivery, "View proof of delivery")}</p>
      )}
      {canUpdate && notice.signedFile && (
        <form
          className="matter-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            setMessage("");
            try {
              const body: Record<string, unknown> = {
                ...fields,
                expectedUpdatedAt: notice.updatedAt,
              };
              if (fields.nextUpdateAt)
                body.nextUpdateAt = new Date(fields.nextUpdateAt).toISOString();
              else delete body.nextUpdateAt;
              for (const [key, file] of [
                ["courierReceipt", receipt],
                ["proofOfDelivery", proof],
              ] as const) {
                if (!file) continue;
                const upload = await FileUpload(file);
                if (!upload.success)
                  throw Error(upload.message || "Upload failed.");
                body[key] = upload.fileName;
              }
              await api(
                "/api/client-portal/notices/" + notice._id + "/delivery",
                "POST",
                body,
              );
              setReceipt(null);
              setProof(null);
              await onUpdated();
              setMessage(
                "Delivery update saved. The client has an in-app notification.",
              );
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Unable to save delivery update.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Administration or the assigned advocate can record dispatch, upload
            the courier receipt, and keep the client informed. Previous
            attachments remain in the timeline.
          </p>
          <fieldset disabled={busy} className="grid gap-3">
            <legend className="sr-only">Record a courier update</legend>
            {(
              [
                ["courier", "Courier", "text"],
                ["trackingId", "Tracking reference", "text"],
                ["dispatchDate", "Dispatch date", "date"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} htmlFor={"delivery-" + key}>
                {label}
                <input
                  id={"delivery-" + key}
                  type={type}
                  required
                  maxLength={key === "courier" ? 120 : 160}
                  value={fields[key]}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
            <label htmlFor="delivery-status">
              Delivery status
              <select
                id="delivery-status"
                value={fields.deliveryStatus}
                onChange={(e) =>
                  setFields((p) => ({ ...p, deliveryStatus: e.target.value }))
                }
              >
                <option>In Transit</option>
                <option>Delivered</option>
                <option>Returned</option>
              </select>
            </label>
            <label htmlFor="courier-receipt">
              Courier receipt (PDF, JPG or PNG, up to 10 MB)
              <input
                key={notice.updatedAt + "receipt"}
                id="courier-receipt"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              />
            </label>
            <label htmlFor="delivery-proof">
              Proof of delivery (optional)
              <input
                key={notice.updatedAt + "proof"}
                id="delivery-proof"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setProof(e.target.files?.[0] || null)}
              />
            </label>
            <label htmlFor="delivery-note">
              Update for the client
              <textarea
                id="delivery-note"
                maxLength={2000}
                rows={3}
                value={fields.note}
                onChange={(e) =>
                  setFields((p) => ({ ...p, note: e.target.value }))
                }
              />
            </label>
            <label htmlFor="delivery-next-update">
              Next update expected (your local time, optional)
              <input
                id="delivery-next-update"
                type="datetime-local"
                value={fields.nextUpdateAt}
                onChange={(e) =>
                  setFields((p) => ({ ...p, nextUpdateAt: e.target.value }))
                }
              />
            </label>
            <p>
              Record another update when the carrier provides new information.
              This date is a team communication commitment, not an automated
              courier update or legal deadline.
            </p>
            <button disabled={busy} className="btn btn-primary">
              {busy ? "Saving delivery update…" : "Save and notify client"}
            </button>
          </fieldset>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </>
  );
}
