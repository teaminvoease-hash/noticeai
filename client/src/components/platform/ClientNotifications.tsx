import { Link } from "react-router-dom";
import ClientLayout from "@/AdminDashboard/dashscreen/eraser/ClientPortalLayout";
import { api } from "@/lib/api";
import { refreshNotifications, useClientUpdates } from "@/lib/notifications";
import { useState } from "react";
export default function ClientNotifications() {
  const feed = useClientUpdates(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  return (
    <ClientLayout
      title="Your updates"
      activeKey="notifications"
      subtitle="Notice progress, signed documents and courier receipts in one place."
    >
      <p role="status">
        {feed.unreadCount} unread updates. Refreshes every 5 seconds while this
        page is open.
      </p>
      {(error || feed.error) && <p role="alert">{error || feed.error}</p>}
      <button
        className="btn btn-light"
        onClick={() => void refreshNotifications()}
      >
        Refresh updates
      </button>
      {!feed.loaded ? (
        <p>Loading updates…</p>
      ) : !feed.items.length ? (
        <p>No updates yet. Your team’s updates will appear here.</p>
      ) : (
        <ol className="matter-timeline">
          {feed.items.map((item) => (
            <li key={item._id}>
              <p>
                <strong>{item.noticeId || "Account update"}</strong> ·{" "}
                {item.status === "Unread" ? "New" : "Read"}
              </p>
              <p className="preserve-lines">{item.message}</p>
              <p>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </time>
              </p>
              {item.matterId && (
                <Link
                  className="btn btn-light"
                  to={"/matters/" + item.matterId + "#" + item.section}
                >
                  Open matter update
                </Link>
              )}
              {item.status === "Unread" && (
                <button
                  className="btn btn-light"
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy(item._id);
                    setError("");
                    try {
                      await api(
                        "/api/client-portal/notifications/" +
                          item._id +
                          "/read",
                        "PATCH",
                      );
                      await refreshNotifications();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Unable to mark update read.",
                      );
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === item._id ? "Saving…" : "Mark as read"}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      <p>
        These are in-app updates. Courier status is recorded by your team; it is
        not a live carrier feed.
      </p>
    </ClientLayout>
  );
}
