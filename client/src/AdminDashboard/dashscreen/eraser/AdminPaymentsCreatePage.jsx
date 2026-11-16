import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const STANDARD_PRICE = { totalAmount: 5000, platformFee: 1500, advocateFee: 3500 };

const AdminPaymentsCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [globalPaymentId, setGlobalPaymentId] = useState("");
  const [formData, setFormData] = useState({
    paymentScope: "global",
    clientId: "",
    clientName: "",
    priceMode: "custom",
    totalAmount: "",
    platformFee: "",
    advocateFee: "",
    status: "pending",
    notes: "",
  });

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [paymentResult, clientResult] = await Promise.all([
          fetchData(END_POINT.GetAdminPayment, METHODS.GET),
          fetchData(END_POINT.GetClient, METHODS.GET),
        ]);

        const paymentList = paymentResult?.success ? paymentResult.data || [] : [];
        const existingGlobalPayment = paymentList.find((item) => {
          const scope = String(item.paymentScope || (item.clientId ? "per_client" : "global")).toLowerCase();
          return scope === "global";
        });

        setGlobalPaymentId(existingGlobalPayment?._id || "");
        setClients(clientResult?.success ? clientResult.data || [] : []);
      } catch (error) {
        setGlobalPaymentId("");
        setClients([]);
      }
    };
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    const loadPayment = async () => {
      setLoading(true);
      try {
        const [paymentResult, clientResult] = await Promise.all([
          fetchData(`${END_POINT.GetAdminPaymentById}${editId}`, METHODS.GET),
          fetchData(END_POINT.GetClient, METHODS.GET),
        ]);

        setClients(clientResult?.success ? clientResult.data || [] : []);

        if (paymentResult?.success && paymentResult?.data) {
          const data = paymentResult.data;
          const paymentScope = String(data.paymentScope || (data.clientId ? "per_client" : "global")).toLowerCase();
          const selectedClientId = typeof data.clientId === "object" ? data.clientId?._id || "" : data.clientId || "";
          const selectedClientName =
            data.clientName ||
            (typeof data.clientId === "object" ? data.clientId?.name || "" : "");

          setFormData({
            paymentScope,
            clientId: selectedClientId,
            clientName: selectedClientName,
            priceMode: String(data.priceMode || "custom").toLowerCase(),
            totalAmount: Number(data.totalAmount || 0),
            platformFee: Number(data.platformFee || 0),
            advocateFee: Number(data.advocateFee || 0),
            status: String(data.status || "pending").toLowerCase(),
            notes: data.notes || "",
          });
        }
      } catch (error) {
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    loadPayment();
  }, [isEditMode, editId]);

  const handleChange = (key, value) => {
    if (key === "paymentScope") {
      setFormData((prev) => ({
        ...prev,
        paymentScope: value,
        clientId: value === "per_client" ? prev.clientId : "",
        clientName: value === "per_client" ? prev.clientName : "",
      }));
      return;
    }

    if (key === "clientId") {
      const selectedClient = clients.find((client) => String(client._id) === String(value));
      setFormData((prev) => ({
        ...prev,
        clientId: value,
        clientName: selectedClient?.name || "",
      }));
      return;
    }

    if (key === "priceMode") {
      if (value === "standard") {
        setFormData((prev) => ({ ...prev, priceMode: "standard", ...STANDARD_PRICE }));
      } else {
        setFormData((prev) => ({ ...prev, priceMode: "custom", totalAmount: "", platformFee: "", advocateFee: "" }));
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.paymentScope === "per_client" && !formData.clientId) {
      Swal.fire({
        title: "Client Required",
        text: "Please select a client for per client pricing",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        paymentScope: formData.paymentScope,
        clientId: formData.paymentScope === "per_client" ? formData.clientId : "",
        clientName: formData.paymentScope === "per_client" ? formData.clientName : "",
        priceMode: formData.priceMode,
        totalAmount: Number(formData.totalAmount || 0),
        platformFee: Number(formData.platformFee || 0),
        advocateFee: Number(formData.advocateFee || 0),
        status: formData.status,
        notes: formData.notes,
      };

      const targetId =
        isEditMode
          ? editId
          : formData.paymentScope === "global" && globalPaymentId
            ? globalPaymentId
            : "";

      const result = targetId
        ? await fetchData(`${END_POINT.UpdateAdminPayment}${targetId}`, METHODS.POST, payload)
        : await fetchData(END_POINT.CreateAdminPayment, METHODS.POST, payload);

      const isUpdatingExistingGlobal = !isEditMode && formData.paymentScope === "global" && Boolean(globalPaymentId);
      const successTitle = isEditMode || isUpdatingExistingGlobal ? "Payment Updated" : "Payment Created";
      const successText = isEditMode || isUpdatingExistingGlobal
        ? "Payment updated successfully"
        : "Payment created successfully";
      const failureTitle = isEditMode || isUpdatingExistingGlobal ? "Update Failed" : "Create Failed";

      if (result?.success) {
        Swal.fire({
          title: successTitle,
          text: successText,
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/admin-payments");
      } else {
        Swal.fire({
          title: failureTitle,
          text: result?.message || "Could not save payment",
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
    <AdminPortalLayout activeKey="payments" title={isEditMode ? "Edit Payment" : "Create Payment"} subtitle="Create payment and fee split records." actions={<><Link className="btn btn-light" to="/admin-payments">Payments Display</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="form-panel"><h3>{isEditMode ? "Payment Edit Form" : "Payment Create Form"}</h3><form className="crud-form" onSubmit={handleSubmit}><label>Pricing Scope</label><div className="price-toggle"><label><input type="radio" name="paymentScope" checked={formData.paymentScope === "global"} onChange={() => handleChange("paymentScope", "global")} /><span className="toggle-pill">Global</span></label><label><input type="radio" name="paymentScope" checked={formData.paymentScope === "per_client"} onChange={() => handleChange("paymentScope", "per_client")} /><span className="toggle-pill">Per Client</span></label></div>{formData.paymentScope === "per_client" ? <><label>Select Client</label><select value={formData.clientId} onChange={(e) => handleChange("clientId", e.target.value)}><option value="">Select Client</option>{clients.map((client) => (<option key={client._id} value={client._id}>{client.name || client.client_name || "Unnamed Client"}{client.client_id ? ` (${client.client_id})` : ""}</option>))}</select></> : null}<label>Price Mode</label><div className="price-toggle"><label><input type="radio" name="priceMode" checked={formData.priceMode === "custom"} onChange={() => handleChange("priceMode", "custom")} /><span className="toggle-pill">Custom Price</span></label><label><input type="radio" name="priceMode" checked={formData.priceMode === "standard"} onChange={() => handleChange("priceMode", "standard")} /><span className="toggle-pill">Standard Price</span></label></div><label>Total Amount</label><input type="number" placeholder="Enter total amount" value={formData.totalAmount} onChange={(e) => handleChange("totalAmount", e.target.value)} disabled={formData.priceMode === "standard"} /><label>Platform Fee</label><input type="number" placeholder="Enter platform fee" value={formData.platformFee} onChange={(e) => handleChange("platformFee", e.target.value)} disabled={formData.priceMode === "standard"} /><label>Advocate Fee</label><input type="number" placeholder="Enter advocate fee" value={formData.advocateFee} onChange={(e) => handleChange("advocateFee", e.target.value)} disabled={formData.priceMode === "standard"} /><label>Status</label><select value={formData.status} onChange={(e) => handleChange("status", e.target.value)}><option value="pending">Pending</option><option value="verified">Verified</option><option value="reject">Reject</option></select><label>Ledger/Invoice Notes</label><textarea placeholder="Upload ledger and invoice details" value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} /><div className="crud-actions"><button type="submit" className="btn btn-primary" disabled={loading || submitting}>{loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Payment" : "Create Payment")}</button></div></form></article>
    </AdminPortalLayout>
  );
};

export default AdminPaymentsCreatePage;
