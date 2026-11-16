import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const AdminPaymentsPage = () => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadPayments = async () => {
    setLoading(true);
    try {
      const result = await fetchData(END_POINT.GetAdminPayment, METHODS.GET);
      if (result?.success) {
        setPayments(result.data || []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const query = searchText.trim().toLowerCase();
      const status = String(item.status || "").toLowerCase();
      const scope = String(item.paymentScope || (item.clientId ? "per_client" : "global")).toLowerCase();
      const clientName = String(item.clientName || item.clientId?.name || "").toLowerCase();
      const clientCode = String(item.clientCode || item.clientId?.client_id || "").toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;
      return (
        status.includes(query) ||
        scope.includes(query) ||
        clientName.includes(query) ||
        clientCode.includes(query)
      );
    });
  }, [payments, searchText, statusFilter]);

  return (
    <AdminPortalLayout activeKey="payments" title="Payments Display" subtitle="Display payment transactions, ledger and invoice amounts." actions={<><Link className="btn btn-light" to="/admin-payments-create">Create Payment</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="table-panel"><div className="search-row"><input type="text" placeholder="Search by client, scope, status" value={searchText} onChange={(e) => setSearchText(e.target.value)} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Status</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="reject">Reject</option></select></div><div className="table-scroll"><table className="crud-table"><thead><tr><th>Scope</th><th>Client</th><th>Total</th><th>Platform Fee</th><th>Advocate Fee</th><th>Status</th><th>Edit</th></tr></thead><tbody>{loading ? <tr><td colSpan="7">Loading payments...</td></tr> : null}{!loading && filteredPayments.length === 0 ? <tr><td colSpan="7">No payments found</td></tr> : null}{!loading && filteredPayments.map((item) => { const scope = String(item.paymentScope || (item.clientId ? "per_client" : "global")).toLowerCase(); const clientName = item.clientName || item.clientId?.name || "-"; const clientCode = item.clientCode || item.clientId?.client_id || ""; return (<tr key={item._id}><td>{scope === "per_client" ? "Per Client" : "Global"}</td><td>{scope === "per_client" ? `${clientName}${clientCode ? ` (${clientCode})` : ""}` : "-"}</td><td>{item.totalAmount || 0}</td><td>{item.platformFee || 0}</td><td>{item.advocateFee || 0}</td><td>{item.status || "-"}</td><td><Link className="tiny-btn" to={`/admin-payments-create?edit=${item._id}`}>&#9998;</Link></td></tr>); })}</tbody></table></div></article>
      <div className="pagination-wrap"><p className="pagination-meta">Showing {filteredPayments.length} of {payments.length}</p><div className="pagination"><span className="page-btn active">1</span></div></div>
    </AdminPortalLayout>
  );
};

export default AdminPaymentsPage;
