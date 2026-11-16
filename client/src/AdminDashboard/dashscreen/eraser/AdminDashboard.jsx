import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString("en-IN")}`;
};

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

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [notices, setNotices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [clientResult, advocateResult, noticeResult, paymentResult, documentResult] = await Promise.all([
          fetchData(END_POINT.GetClient, METHODS.GET),
          fetchData(END_POINT.GetLawyer, METHODS.GET),
          fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET),
          fetchData(END_POINT.GetAdminPayment, METHODS.GET),
          fetchData(END_POINT.GetAdminDocument, METHODS.GET),
        ]);

        setClients(clientResult?.success ? clientResult.data || [] : []);
        setAdvocates(advocateResult?.success ? advocateResult.data || [] : []);
        setNotices(noticeResult?.success ? noticeResult.data || [] : []);
        setPayments(paymentResult?.success ? paymentResult.data || [] : []);
        setDocuments(documentResult?.success ? documentResult.data || [] : []);
      } catch (error) {
        setClients([]);
        setAdvocates([]);
        setNotices([]);
        setPayments([]);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const clientMap = useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      map.set(String(client._id), client);
    });
    return map;
  }, [clients]);

  const dashboardStats = useMemo(() => {
    const verifiedAdvocates = advocates.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      return status === "verified" || status === "active";
    }).length;
    const pendingAdvocates = advocates.filter((item) => String(item.status || "").toLowerCase() === "pending").length;

    return {
      totalClients: clients.length,
      totalAdvocates: advocates.length,
      verifiedAdvocates,
      pendingAdvocates,
      totalNotices: notices.length,
      totalDocuments: documents.length,
    };
  }, [clients, advocates, notices, documents]);

  const recentNotices = useMemo(() => {
    return [...notices]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 4)
      .map((item) => {
        const client = clientMap.get(String(item.clientId));
        return {
          ...item,
          clientName: client?.name || item.clientName || "-",
        };
      });
  }, [notices, clientMap]);

  const paymentConfigs = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [payments]);

  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [documents]);

  return (
    <AdminPortalLayout
      activeKey="dashboard"
      title="Admin Dashboard"
      subtitle="Monitor live platform counts, recent notice activity, fee configuration, and document updates."
    >
            <section className="stat-grid">
              <article className="stat-item">
                <p className="k">Clients</p>
                <p className="v">{dashboardStats.totalClients}</p>
                <p className="delta">{loading ? "Loading..." : "Live client records"}</p>
              </article>
              <article className="stat-item">
                <p className="k">Advocates</p>
                <p className="v">{dashboardStats.totalAdvocates}</p>
                <p className="delta">{loading ? "Loading..." : `${dashboardStats.pendingAdvocates} pending, ${dashboardStats.verifiedAdvocates} verified/active`}</p>
              </article>
              <article className="stat-item">
                <p className="k">Client Notices</p>
                <p className="v">{dashboardStats.totalNotices}</p>
                <p className="delta">{loading ? "Loading..." : "Submitted notice workflow records"}</p>
              </article>
              <article className="stat-item">
                <p className="k">Documents</p>
                <p className="v">{dashboardStats.totalDocuments}</p>
                <p className="delta">{loading ? "Loading..." : "Available admin document records"}</p>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <h3>Recent Client Notices</h3>
                {recentNotices.length === 0 ? (
                  <p className="pagination-meta">{loading ? "Loading notices..." : "No notices available."}</p>
                ) : (
                  <ul className="status-list">
                    {recentNotices.map((item) => (
                      <li key={item._id}>
                        <div>
                          <strong>{item.subject || item.noticeId || "Notice"}</strong>
                          <small>{item.clientName || "-"} | {formatDateTime(item.updatedAt || item.createdAt)}</small>
                        </div>
                        <span className={`chip ${String(item.status || "").toLowerCase() === "verified" ? "green" : String(item.status || "").toLowerCase() === "uploaded" ? "blue" : "orange"}`}>
                          {item.status || "Pending"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="panel">
                <h3>Admin Quick Actions</h3>
                <div className="action-grid">
                  <Link to="/admin-advocates" className="action-btn">Verify Advocates</Link>
                  <Link to="/admin-payments" className="action-btn">Update Pricing</Link>
                  <Link to="/admin-documents" className="action-btn">Review Documents</Link>
                  <Link to="/admin-notices" className="action-btn">Open Notice Workflow</Link>
                </div>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <h3>Fee Configuration Snapshot</h3>
                {paymentConfigs.length === 0 ? (
                  <p className="pagination-meta">{loading ? "Loading fee configuration..." : "No fee configuration records available."}</p>
                ) : (
                  <div className="kv-list">
                    {paymentConfigs.map((item) => {
                      const scope = String(item.paymentScope || (item.clientId ? "per_client" : "global")).toLowerCase();
                      return (
                        <div className="kv" key={item._id}>
                          <strong>{scope === "per_client" ? (item.clientName || item.clientId?.name || "Per Client") : "Global"}</strong>
                          <span>{formatMoney(item.totalAmount)} total | {formatMoney(item.platformFee)} platform | {formatMoney(item.advocateFee)} advocate</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="panel">
                <h3>Recent Documents</h3>
                {recentDocuments.length === 0 ? (
                  <p className="pagination-meta">{loading ? "Loading documents..." : "No documents available."}</p>
                ) : (
                  <ul className="event-list">
                    {recentDocuments.map((item) => (
                      <li key={item._id}>
                        {item.type || "Document"} | {item.document_id || "-"} | {formatDateTime(item.updatedAt || item.createdAt)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
    </AdminPortalLayout>
  );
};

export default AdminDashboard;
