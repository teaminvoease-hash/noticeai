import WorkflowBoard from '../../../WorkflowBoard';
import {AuthorityPanel} from '../../../Authority';
import {signOut} from '../../../session';
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const formatDateTime = (value) => {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTodayLabel = () =>
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { userData } = useSelector((store) => store.userReducer);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [defaulters, setDefaulters] = useState([]);

  const clientId = useMemo(
    () => userData?._id || userData?.id || userData?.clientId || "",
    [userData]
  );

  const clientName = useMemo(
    () =>
      String(
        userData?.name ||
          userData?.ownerName ||
          userData?.clientName ||
          userData?.fullName ||
          "Client"
      ).trim() || "Client",
    [userData]
  );

  const clientInitials = useMemo(() => {
    const parts = clientName.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "CL";
  }, [clientName]);

  const todayLabel = useMemo(() => formatTodayLabel(), []);

  useEffect(() => {
    if (!clientId) return;

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [noticeResult, paymentResult, documentResult, defaulterResult] = await Promise.all([
          fetchData(`${END_POINT.ClientPortalGetNotices}?clientId=${encodeURIComponent(clientId)}`, METHODS.GET),
          fetchData(`${END_POINT.ClientPortalGetPayments}?clientId=${encodeURIComponent(clientId)}`, METHODS.GET),
          fetchData(`${END_POINT.ClientPortalGetDocuments}?clientId=${encodeURIComponent(clientId)}`, METHODS.GET),
          fetchData(`${END_POINT.ClientPortalGetDefaulters}?clientId=${encodeURIComponent(clientId)}`, METHODS.GET),
        ]);

        setNotices(noticeResult?.success ? noticeResult.data || [] : []);
        setPayments(paymentResult?.success ? paymentResult.data || [] : []);
        setDocuments(documentResult?.success ? documentResult.data || [] : []);
        setDefaulters(defaulterResult?.success ? defaulterResult.data || [] : []);
      } catch (error) {
        setNotices([]);
        setPayments([]);
        setDocuments([]);
        setDefaulters([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [clientId]);

  const dashboardStats = useMemo(() => {
    const pendingReview = notices.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      return status === "pending" || status === "uploaded";
    }).length;
    const completed = notices.filter((item) => String(item.status || "").toLowerCase() === "verified").length;
    const pendingDocumentRequests = documents.filter((item) => {
      const requestedByLawyer = String(item.requestedByRole || "").toLowerCase() === "lawyer";
      const status = String(item.status || "").toLowerCase();
      return requestedByLawyer && status !== "received";
    }).length;

    return {
      totalDefaulters: defaulters.length,
      totalNotices: notices.length,
      pendingReview,
      completed,
      pendingDocumentRequests,
    };
  }, [defaulters, notices, payments, documents]);

  const recentNotices = useMemo(() => {
    return [...notices]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [notices]);

  const lawyerRequests = useMemo(() => {
    return documents
      .filter((item) => String(item.requestedByRole || "").toLowerCase() === "lawyer")
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [documents]);

  return (
    <div className="dashboard-body">
      <main className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`} id="appShell">
        <aside className="app-sidebar">
          <div className="brand-wrap">
            <h2>ResolveX</h2>
            <p>Client workspace</p>
          </div>
          <nav className="side-nav">
            <Link to="/client-dashboard" className="side-link active">Dashboard</Link>
            <Link to="/client-defaulters" className="side-link">Recipients</Link>
            <Link to="/client-defaulters-create" className="side-link">Add Recipient</Link>
            <Link to="/client-notice-submission" className="side-link">Request a Notice</Link>
            <Link to="/client-my-notices" className="side-link">My Notices</Link>
            <Link to="/client-documents" className="side-link">Documents</Link>
            <Link to="/client-payments" className="side-link">Payments</Link>
            <Link to="/client-profile" className="side-link">Profile</Link>
          </nav>
          <div className="side-footer">
            Authority Letter is mandatory before payment and draft generation.
          </div>
        </aside>
        <div className="mobile-overlay" id="mobileOverlay" onClick={() => setSidebarOpen(false)} />

        <section className="app-main">
          <header className="top-header">
            <div className="header-left">
              <button className="menu-toggle" id="menuToggle" type="button" onClick={() => setSidebarOpen((p) => !p)}>Menu</button>
              <div className="header-title">
                <h1>Client Dashboard</h1>
                <p>Track live notice status, document requests, payments, and client activity.</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-light" onClick={() => signOut("client")} >Logout</button>
              <Link className="btn btn-primary" to="/client-notice-submission">New Notice</Link>
              <div className="avatar-chip">{clientInitials}</div>
            </div>
          </header>

          <div className="app-content"><AuthorityPanel clientId={clientId} compact/><WorkflowBoard/><section className="getting-started"><div><p className="eyebrow">YOUR NEXT STEP</p><h2>Start with the facts. Track every handoff.</h2><p>Add your business authority letter, save the recipient and describe your matter.</p></div><div className="start-steps"><Link to="/client-profile">01 · Complete your profile →</Link><Link to="/client-defaulters-create">02 · Add a recipient →</Link><Link to="/client-notice-submission">03 · Request a notice →</Link></div></section>
            <section
              className="panel"
              style={{
                marginBottom: "20px",
                background:
                  "linear-gradient(135deg, #0f2f4a 0%, #175c8f 58%, #d9ecfb 100%)",
                color: "#fff",
                border: "none",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "auto -40px -60px auto",
                  width: "180px",
                  height: "180px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "-40px",
                  right: "120px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "18px",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: "12px",
                      letterSpacing: "1.4px",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.76)",
                    }}
                  >
                    Client Workspace
                  </p>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "30px", lineHeight: 1.2 }}>
                    Welcome, {clientName}
                  </h2>
                  <p style={{ margin: 0, maxWidth: "640px", color: "rgba(255,255,255,0.88)" }}>
                    Stay on top of your notices, documents, and case activity from one place.
                  </p>
                </div>
                <div
                  style={{
                    minWidth: "220px",
                    padding: "16px 18px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.14)",
                    backdropFilter: "blur(4px)",
                    boxShadow: "0 12px 30px rgba(5, 28, 44, 0.18)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "12px",
                      letterSpacing: "1.2px",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.74)",
                    }}
                  >
                    Today
                  </p>
                  <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, lineHeight: 1.5 }}>
                    {todayLabel}
                  </p>
                </div>
              </div>
            </section>

            <section className="stat-grid">
              <article className="stat-item">
                <p className="k">Recipients</p>
                <p className="v">{dashboardStats.totalDefaulters}</p>
                <p className="delta">{loading ? "Loading..." : "Linked to your account"}</p>
              </article>
              <article className="stat-item">
                <p className="k">My Notices</p>
                <p className="v">{dashboardStats.totalNotices}</p>
                <p className="delta">{loading ? "Loading..." : `${dashboardStats.pendingReview} in progress`}</p>
              </article>
              <article className="stat-item">
                <p className="k">Completed Notices</p>
                <p className="v">{dashboardStats.completed}</p>
                <p className="delta">{loading ? "Loading..." : "Verified notices"}</p>
              </article>
              <article className="stat-item">
                <p className="k">Document Requests</p>
                <p className="v">{dashboardStats.pendingDocumentRequests}</p>
                <p className="delta">{loading ? "Loading..." : "Pending lawyer requests"}</p>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <h3>Recent Notice Requests</h3>
                {recentNotices.length === 0 ? (
                  <p className="pagination-meta">{loading ? "Loading notices..." : "No notices available yet."}</p>
                ) : (
                  <ul className="status-list">
                    {recentNotices.map((item) => {
                      const status = String(item.status || "").toLowerCase();
                      const chipClass = status === "verified" ? "green" : status === "uploaded" ? "blue" : "orange";
                      return (
                        <li key={item._id}>
                          <div>
                            <strong>{item.subject || item.noticeId || "Notice"}</strong>
                            <small>{item.noticeId || "-"} | {formatDateTime(item.updatedAt || item.createdAt)}</small>
                          </div>
                          <span className={`chip ${chipClass}`}>{item.status || "Pending"}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>

              <article className="panel">
                <h3>Quick Actions</h3>
                <div className="action-grid">
                  <Link to="/client-notice-submission" className="action-btn">Submit New Notice</Link>
                  <Link to="/client-defaulters-create" className="action-btn">Add Recipient</Link>
                  <Link to="/client-documents" className="action-btn">Open Documents</Link>
                  <Link to="/client-my-notices" className="action-btn">View My Notices</Link>
                </div>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <h3>Lawyer Document Requests</h3>
                {lawyerRequests.length === 0 ? (
                  <p className="pagination-meta">{loading ? "Loading document requests..." : "No lawyer document requests found."}</p>
                ) : (
                  <ul className="event-list">
                    {lawyerRequests.map((item) => (
                      <li key={item._id}>
                        {item.noticeId || "-"} | {item.type || "Document"} | {String(item.status || "sent")}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          </div>
        </section>
      </main>


    </div>
  );
};

export default ClientDashboard;
