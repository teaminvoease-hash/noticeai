import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const AdminWithdrawalsCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    request_id: "",
    advocateId: "",
    advocateName: "",
    amount: "",
    walletBalance: "",
    bankAccount: "",
    ifsc: "",
    bankName: "",
    bankBranch: "",
    remarks: "",
    status: "pending",
    adminRemarks: "",
  });

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  useEffect(() => {
    if (!isEditMode) return;

    const loadWithdrawal = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.GetAdminWithdrawalById}${editId}`, METHODS.GET);
        if (result?.success && result?.data) {
          const data = result.data;
          setFormData({
            request_id: data.request_id || "",
            advocateId: data.advocateId || "",
            advocateName: data.advocateName || "",
            amount: Number(data.amount || 0),
            walletBalance: Number(data.walletBalance || 0),
            bankAccount: data.bankAccount || "",
            ifsc: data.ifsc || "",
            bankName: data.bankName || "",
            bankBranch: data.bankBranch || "",
            remarks: data.remarks || "",
            status: String(data.status || "pending").toLowerCase(),
            adminRemarks: data.adminRemarks || "",
          });
        }
      } catch (error) {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    loadWithdrawal();
  }, [editId, isEditMode]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.advocateName.trim()) {
      Swal.fire({
        title: "Missing Advocate",
        text: "Please enter advocate name",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        advocateId: formData.advocateId,
        advocateName: formData.advocateName,
        amount: Number(formData.amount || 0),
        walletBalance: Number(formData.walletBalance || 0),
        bankAccount: formData.bankAccount,
        ifsc: formData.ifsc,
        bankName: formData.bankName,
        bankBranch: formData.bankBranch,
        remarks: formData.remarks,
        status: formData.status,
        adminRemarks: formData.adminRemarks,
      };

      const result = isEditMode
        ? await fetchData(`${END_POINT.UpdateAdminWithdrawal}${editId}`, METHODS.POST, payload)
        : await fetchData(END_POINT.CreateAdminWithdrawal, METHODS.POST, payload);

      if (result?.success) {
        Swal.fire({
          title: isEditMode ? "Withdrawal Updated" : "Withdrawal Created",
          text: isEditMode ? "Withdrawal updated successfully" : "Withdrawal created successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/admin-withdrawals");
      } else {
        Swal.fire({
          title: isEditMode ? "Update Failed" : "Create Failed",
          text: result?.message || "Could not save withdrawal",
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
    <AdminPortalLayout activeKey="withdrawals" title={isEditMode ? "Edit Withdrawal" : "Create Withdrawal"} subtitle="Create withdrawal request entries from advocate wallets." actions={<><Link className="btn btn-light" to="/admin-withdrawals">Withdrawals Display</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="form-panel"><h3>{isEditMode ? "Withdrawal Edit Form" : "Withdrawal Create Form"}</h3><form className="crud-form" onSubmit={handleSubmit}><label>Request ID</label><input type="text" value={formData.request_id || "Will be generated automatically"} disabled /><label>Advocate Name</label><input type="text" placeholder="Rahul Rao" value={formData.advocateName} onChange={(e) => handleChange("advocateName", e.target.value)} /><label>Amount</label><input type="number" placeholder="15000" value={formData.amount} onChange={(e) => handleChange("amount", e.target.value)} /><label>Wallet Balance</label><input type="number" placeholder="42000" value={formData.walletBalance} onChange={(e) => handleChange("walletBalance", e.target.value)} /><label>Bank Account</label><input type="text" placeholder="Account number" value={formData.bankAccount} onChange={(e) => handleChange("bankAccount", e.target.value)} /><label>IFSC</label><input type="text" placeholder="ABCD0001234" value={formData.ifsc} onChange={(e) => handleChange("ifsc", e.target.value.toUpperCase())} /><label>Bank Name</label><input type="text" placeholder="HDFC Bank" value={formData.bankName} onChange={(e) => handleChange("bankName", e.target.value)} /><label>Bank Branch</label><input type="text" placeholder="Delhi Main Branch" value={formData.bankBranch} onChange={(e) => handleChange("bankBranch", e.target.value)} /><label>Lawyer Remarks</label><textarea placeholder="Lawyer request notes" value={formData.remarks} onChange={(e) => handleChange("remarks", e.target.value)} /><label>Status</label><select value={formData.status} onChange={(e) => handleChange("status", e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><label>Admin Remarks</label><textarea placeholder="Reason for rejection or approval notes" value={formData.adminRemarks} onChange={(e) => handleChange("adminRemarks", e.target.value)} /><div className="crud-actions"><button type="submit" className="btn btn-primary" disabled={loading || submitting}>{loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Request" : "Create Request")}</button></div></form></article>
    </AdminPortalLayout>
  );
};

export default AdminWithdrawalsCreatePage;
