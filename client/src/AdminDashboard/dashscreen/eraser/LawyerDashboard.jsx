import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";
import LawyerPortalLayout from "./LawyerPortalLayout";


const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const todayLabel = () => {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const STATUS_DONE = ["uploaded", "verified", "signed", "delivered", "completed"];

const LawyerDashboard = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState([]);

  const lawyerId = useMemo(() => userData?._id || userData?.id || "", [userData]);
  const lawyerName = useMemo(() => userData?.name || userData?.lawyerName || "Lawyer", [userData]);

  useEffect(() => {
    if (!lawyerId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const noticeResult = await fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET);

        const allNotices = noticeResult?.success ? noticeResult.data || [] : [];
        const assigned = allNotices.filter(
          (item) => String(item.lawyerId || "") === String(lawyerId)
        );
        setNotices(assigned);
      } catch {
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [lawyerId, lawyerName]);

  const stats = useMemo(() => {
    const total = notices.length;
    const pending = notices.filter(
      (n) => !STATUS_DONE.includes(String(n.status || "").toLowerCase())
    ).length;
    const uploadedToday = notices.filter(
      (n) =>
        STATUS_DONE.includes(String(n.status || "").toLowerCase()) &&
        isToday(n.updatedAt || n.createdAt)
    ).length;

    return { total, pending, uploadedToday };
  }, [notices]);

  const recentNotices = useMemo(() => {
    return [...notices]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0)
      )
      .slice(0, 4);
  }, [notices]);

  const recentActivity = useMemo(() => {
    return [...notices]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0)
      )
      .slice(0, 4)
      .map((n) => {
        const status = String(n.status || "").toLowerCase();
        if (status === "uploaded" || status === "signed") return `Signed notice uploaded for ${n.noticeId || "-"}.`;
        if (status === "verified") return `Notice ${n.noticeId || "-"} verified by admin.`;
        if (status === "pending") return `Notice ${n.noticeId || "-"} is pending review.`;
        return `Notice ${n.noticeId || "-"} status: ${n.status || "unknown"}.`;
      });
  }, [notices]);

  const newAssignments = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return notices.filter(
      (n) => new Date(n.createdAt || 0) >= sevenDaysAgo
    ).slice(0, 3);
  }, [notices]);

  const getChipClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "verified" || s === "delivered" || s === "completed") return "green";
    if (s === "uploaded" || s === "signed") return "blue";
    return "orange";
  };

  return (
    <LawyerPortalLayout
      activeKey="dashboard"
      title={`Welcome, ${lawyerName}`}
      subtitle={`${todayLabel()} - Review notices, request documents, and track wallet earnings.`}
      actions={<Link className="btn btn-primary" to="/lawyer-assigned-notices">Open Assigned Case</Link>}
    >
            <section className="stat-grid">
              <article className="stat-item">
                <p className="k">Assigned Notices</p>
                <p className="v">{loading ? "..." : stats.total}</p>
                <p className="delta">{loading ? "Loading..." : "Total cases assigned to you"}</p>
              </article>
              <article className="stat-item">
                <p className="k">Pending Review</p>
                <p className="v">{loading ? "..." : stats.pending}</p>
                <p className="delta">{loading ? "Loading..." : "Action required"}</p>
              </article>
              <article className="stat-item">
                <p className="k">Completed Today</p>
                <p className="v">{loading ? "..." : stats.uploadedToday}</p>
                <p className="delta">{loading ? "Loading..." : "Uploaded / verified today"}</p>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <h3>Assigned Notice Queue</h3>
                {loading ? (
                  <p className="pagination-meta">Loading notices...</p>
                ) : recentNotices.length === 0 ? (
                  <p className="pagination-meta">No notices assigned yet.</p>
                ) : (
                  <ul className="status-list">
                    {recentNotices.map((n) => (
                      <li key={n._id}>
                        <div>
                          <strong>{n.subject || n.noticeId || "Notice"}</strong>
                          <small>#{n.noticeId || "-"} | {formatDateTime(n.updatedAt || n.createdAt)}</small>
                        </div>
                        <span className={`chip ${getChipClass(n.status)}`}>
                          {n.status || "Pending"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="panel">
                <h3>Quick Actions</h3>
                <div className="action-grid">
                  <Link to="/lawyer-assigned-notices" className="action-btn">Open Assigned Cases</Link>
                  <Link to="/lawyer-document-requests" className="action-btn">Request Document</Link>
                  
                </div>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <h3>Recent Activity</h3>
                {loading ? (
                  <p className="pagination-meta">Loading activity...</p>
                ) : recentActivity.length === 0 ? (
                  <p className="pagination-meta">No recent activity.</p>
                ) : (
                  <ul className="event-list">
                    {recentActivity.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="panel">
                <h3>New Assignments (Last 7 Days)</h3>
                {loading ? (
                  <p className="pagination-meta">Loading...</p>
                ) : newAssignments.length === 0 ? (
                  <p className="pagination-meta">No new assignments in the last 7 days.</p>
                ) : (
                  <div className="kv-list">
                    {newAssignments.map((n) => (
                      <div className="kv" key={n._id}>
                        <strong>New Assignment</strong>
                        <span>#{n.noticeId || "-"} &mdash; {n.subject || "Notice"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
    </LawyerPortalLayout>
  );
};

export default LawyerDashboard;
