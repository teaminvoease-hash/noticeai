import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import LawyerPortalLayout from "./LawyerPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const initialForm = {
  amount: "",
  bankAccount: "",
  ifsc: "",
  bankName: "",
  bankBranch: "",
  remarks: "",
};

const LawyerWithdrawalRequestsPage = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [formData, setFormData] = useState(initialForm);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const lawyerId = useMemo(() => userData?._id || userData?.id || "", [userData]);
  const lawyerName = useMemo(
    () => userData?.name || userData?.lawyerName || userData?.fullName || "Lawyer",
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

  const loadWithdrawals = useCallback(async () => {
    if (!lawyerId) return;
    setLoading(true);
    try {
      const url = `${END_POINT.GetAdminWithdrawal}?advocateId=${encodeURIComponent(lawyerId)}`;
      const result = await fetchData(url, METHODS.GET);
      setWithdrawals(result?.success ? result.data || [] : []);
    } catch (error) {
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, [lawyerId]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const filteredWithdrawals = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return withdrawals.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      const createdDate = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : "";

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (dateFilter && createdDate !== dateFilter) return false;
      if (!query) return true;

      return (
        String(item.request_id || "").toLowerCase().includes(query) ||
        String(item.amount || "").toLowerCase().includes(query) ||
        String(item.bankName || "").toLowerCase().includes(query) ||
        String(item.bankBranch || "").toLowerCase().includes(query) ||
        status.includes(query)
      );
    });
  }, [withdrawals, searchText, statusFilter, dateFilter]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!Number(formData.amount || 0) || Number(formData.amount || 0) <= 0) {
      Swal.fire({
        title: "Invalid Amount",
        text: "Please enter a withdrawal amount greater than zero.",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!formData.bankAccount.trim() || !formData.ifsc.trim() || !formData.bankName.trim() || !formData.bankBranch.trim()) {
      Swal.fire({
        title: "Missing Bank Details",
        text: "Please enter bank account, IFSC, bank name, and bank branch.",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        advocateId: lawyerId,
        advocateName: lawyerName,
        amount: Number(formData.amount || 0),
        walletBalance: 0,
        bankAccount: formData.bankAccount,
        ifsc: formData.ifsc,
        bankName: formData.bankName,
        bankBranch: formData.bankBranch,
        remarks: formData.remarks,
        status: "pending",
      };

      const result = await fetchData(END_POINT.CreateAdminWithdrawal, METHODS.POST, payload);

      if (result?.success) {
        Swal.fire({
          title: "Request Submitted",
          text: `Withdrawal request ${result.data?.request_id || ""} submitted successfully.`,
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        setFormData(initialForm);
        loadWithdrawals();
      } else {
        Swal.fire({
          title: "Submit Failed",
          text: result?.message || "Could not submit withdrawal request.",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Something went wrong. Please try again.",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LawyerPortalLayout
      activeKey="withdrawals"
      title="Withdrawal Requests"
      subtitle="Create wallet withdrawal requests and track admin approval status."
      actions={<><Link className="btn btn-light" to="/lawyer-wallet">Wallet</Link><Link className="btn btn-light" to="/lawyer-dashboard">Dashboard</Link></>}
    >
      <section className="module-grid">
        <article className="form-panel">
          <h3>Create Withdrawal Request</h3>
          <form className="crud-form" onSubmit={handleSubmit}>
            <label>Request ID</label>
            <input type="text" value="Will be generated automatically" disabled />
            <label>Amount</label>
            <input type="number" placeholder="12000" value={formData.amount} onChange={(e) => handleChange("amount", e.target.value)} />
            <label>Bank Account</label>
            <input type="text" placeholder="Account number" value={formData.bankAccount} onChange={(e) => handleChange("bankAccount", e.target.value)} />
            <label>IFSC</label>
            <input type="text" placeholder="ABCD0001234" value={formData.ifsc} onChange={(e) => handleChange("ifsc", e.target.value.toUpperCase())} />
            <label>Bank Name</label>
            <input type="text" placeholder="HDFC Bank" value={formData.bankName} onChange={(e) => handleChange("bankName", e.target.value)} />
            <label>Bank Branch</label>
            <input type="text" placeholder="Delhi Main Branch" value={formData.bankBranch} onChange={(e) => handleChange("bankBranch", e.target.value)} />
            <label>Remarks</label>
            <textarea placeholder="Optional notes for admin" value={formData.remarks} onChange={(e) => handleChange("remarks", e.target.value)} />
            <div className="crud-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Withdrawal"}
              </button>
            </div>
          </form>
        </article>

        <article className="table-panel">
          <div className="search-row">
            <input type="text" placeholder="Search by request id, amount, bank, status" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div className="table-scroll">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Amount</th>
                  <th>Request Date</th>
                  <th>Bank</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Admin Remark</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="7">Loading withdrawal requests...</td></tr> : null}
                {!loading && filteredWithdrawals.length === 0 ? <tr><td colSpan="7">No withdrawal requests found</td></tr> : null}
                {!loading && filteredWithdrawals.map((item) => (
                  <tr key={item._id}>
                    <td>{item.request_id || "-"}</td>
                    <td>{formatAmount(item.amount)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.bankName || "-"}</td>
                    <td>{item.bankBranch || "-"}</td>
                    <td>{item.status || "-"}</td>
                    <td>{item.adminRemarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      <div className="pagination-wrap">
        <p className="pagination-meta">Showing {filteredWithdrawals.length} of {withdrawals.length}</p>
        <div className="pagination"><span className="page-btn active">1</span></div>
      </div>
    </LawyerPortalLayout>
  );
};

export default LawyerWithdrawalRequestsPage;
