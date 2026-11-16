import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const AdminWithdrawalsPage = () => {
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [remarkDrafts, setRemarkDrafts] = useState({});

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const result = await fetchData(END_POINT.GetAdminWithdrawal, METHODS.GET);
      const data = result?.success ? result.data || [] : [];
      setWithdrawals(data);
      setRemarkDrafts(data.reduce((acc, item) => ({ ...acc, [item._id]: item.adminRemarks || "" }), {}));
    } catch (error) {
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((item) => {
      const query = searchText.trim().toLowerCase();
      const status = String(item.status || "").toLowerCase();
      const reqId = String(item.request_id || "").toLowerCase();
      const advocate = String(item.advocateName || "").toLowerCase();
      const bank = String(`${item.bankName || ""} ${item.bankBranch || ""}`).toLowerCase();
      const processed = String(item.processedDate || "");

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (dateFilter && processed !== dateFilter) return false;
      if (!query) return true;

      return reqId.includes(query) || advocate.includes(query) || bank.includes(query) || status.includes(query);
    });
  }, [withdrawals, searchText, statusFilter, dateFilter]);

  const saveWithdrawalUpdate = async (item, updates = {}) => {
    if (!item?._id) return;
    setUpdatingStatusId(item._id);

    try {
      const payload = {
        advocateId: item.advocateId || "",
        advocateName: item.advocateName || "",
        amount: Number(item.amount || 0),
        walletBalance: Number(item.walletBalance || 0),
        bankAccount: item.bankAccount || "",
        ifsc: item.ifsc || "",
        bankName: item.bankName || "",
        bankBranch: item.bankBranch || "",
        remarks: item.remarks || "",
        adminRemarks: updates.adminRemarks ?? item.adminRemarks ?? "",
        processedDate: item.processedDate || "",
        status: updates.status || item.status || "pending",
      };

      const result = await fetchData(`${END_POINT.UpdateAdminWithdrawal}${item._id}`, METHODS.POST, payload);

      if (result?.success && result?.data) {
        setWithdrawals((prev) => prev.map((withdrawal) => (
          withdrawal._id === item._id ? result.data : withdrawal
        )));
        setRemarkDrafts((prev) => ({ ...prev, [item._id]: result.data.adminRemarks || "" }));
        Swal.fire({
          title: "Updated",
          text: "Withdrawal updated",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Update Failed",
          text: result?.message || "Could not update withdrawal status",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not update withdrawal status",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setUpdatingStatusId("");
    }
  };

  const handleStatusChange = async (item, nextStatus) => {
    if (!item?._id || !nextStatus || nextStatus === item.status) return;
    await saveWithdrawalUpdate(item, {
      status: nextStatus,
      adminRemarks: remarkDrafts[item._id] ?? item.adminRemarks ?? "",
    });
  };

  const handleRemarkSave = async (item) => {
    if (!item?._id) return;
    await saveWithdrawalUpdate(item, {
      adminRemarks: remarkDrafts[item._id] ?? "",
    });
  };

  return (
    <AdminPortalLayout
      activeKey="withdrawals"
      title="Withdrawals Display"
      subtitle="Display advocate wallet withdrawal requests."
      actions={<Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link>}
    >
      <article className="table-panel">
        <div className="search-row">
          <input
            type="text"
            placeholder="Search by request id, advocate, bank, status"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
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
                <th>Advocate</th>
                <th>Amount</th>
                <th>Bank</th>
                <th>Branch</th>
                <th>Account</th>
                <th>IFSC</th>
                <th>Status</th>
                <th>Admin Remark</th>
                <th>Processed Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="10">Loading withdrawals...</td></tr> : null}
              {!loading && filteredWithdrawals.length === 0 ? <tr><td colSpan="10">No withdrawals found</td></tr> : null}
              {!loading && filteredWithdrawals.map((item) => (
                <tr key={item._id}>
                  <td>{item.request_id || "-"}</td>
                  <td>{item.advocateName || "-"}</td>
                  <td>{item.amount || 0}</td>
                  <td>{item.bankName || "-"}</td>
                  <td>{item.bankBranch || "-"}</td>
                  <td>{item.bankAccount || "-"}</td>
                  <td>{item.ifsc || "-"}</td>
                  <td>
                    <select
                      value={String(item.status || "pending").toLowerCase()}
                      onChange={(e) => handleStatusChange(item, e.target.value)}
                      disabled={updatingStatusId === item._id}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={remarkDrafts[item._id] ?? item.adminRemarks ?? ""}
                      onChange={(e) => setRemarkDrafts((prev) => ({ ...prev, [item._id]: e.target.value }))}
                      placeholder="Admin remark"
                      style={{ minWidth: "180px" }}
                    />
                    <button
                      type="button"
                      className="tiny-btn"
                      onClick={() => handleRemarkSave(item)}
                      disabled={updatingStatusId === item._id}
                    >
                      Save
                    </button>
                  </td>
                  <td>{item.processedDate || "NA"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className="pagination-wrap">
        <p className="pagination-meta">Showing {filteredWithdrawals.length} of {withdrawals.length}</p>
        <div className="pagination"><span className="page-btn active">1</span></div>
      </div>
    </AdminPortalLayout>
  );
};

export default AdminWithdrawalsPage;
