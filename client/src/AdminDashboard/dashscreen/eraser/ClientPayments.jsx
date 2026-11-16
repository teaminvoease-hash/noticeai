import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import ClientPortalLayout from "./ClientPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const ClientPayments = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const clientId = useMemo(
    () => userData?._id || userData?.id || userData?.clientId || "",
    [userData]
  );

  const formatAmount = (amount) => {
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) return "-";
    return `₹ ${numericAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return "-";
    return value.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const loadPayments = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const url = `${END_POINT.ClientPortalGetPayments}?clientId=${encodeURIComponent(clientId)}`;
      const result = await fetchData(url, METHODS.GET);
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
  }, [clientId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return payments.filter((payment) => {
      const status = String(payment.status || "").toLowerCase();
      const paymentDate = payment.createdAt
        ? new Date(payment.createdAt).toISOString().slice(0, 10)
        : "";

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (dateFilter && paymentDate !== dateFilter) return false;
      if (!query) return true;

      return (
        String(payment.txnId || "").toLowerCase().includes(query) ||
        String(payment.noticeId || "").toLowerCase().includes(query) ||
        String(payment.amount || "").toLowerCase().includes(query) ||
        status.includes(query)
      );
    });
  }, [payments, searchText, statusFilter, dateFilter]);

  return (
    <ClientPortalLayout
      activeKey="payments"
      title="Payments"
      subtitle="View completed notice payment transactions and receipts."
      actions={<><Link className="btn btn-light" to="/client-downloads">View Receipts</Link><Link className="btn btn-light" to="/client-dashboard">Dashboard</Link></>}
    >
      <article className="table-panel client-payments-panel">
        <div className="search-row client-payments-filter-row">
          <input
            type="text"
            placeholder="Search by txn id, notice id, amount, status"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
        <div className="table-scroll client-payments-table-scroll">
          <table className="crud-table client-payments-table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Notice ID</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5">Loading payments...</td></tr>
              ) : null}
              {!loading && filteredPayments.length === 0 ? (
                <tr><td colSpan="5">No payments found</td></tr>
              ) : null}
              {!loading && filteredPayments.map((payment) => (
                <tr key={payment._id || payment.txnId}>
                  <td>{payment.txnId || "-"}</td>
                  <td>{payment.noticeId || "-"}</td>
                  <td className="amount-cell">{formatAmount(payment.amount)}</td>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>{payment.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className="pagination-wrap">
        <p className="pagination-meta">Showing {filteredPayments.length} of {payments.length}</p>
        <div className="pagination"><span className="page-btn active">1</span></div>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientPayments;
