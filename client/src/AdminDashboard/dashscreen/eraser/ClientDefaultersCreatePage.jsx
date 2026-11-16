import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import ClientPortalLayout from "./ClientPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const ClientDefaultersCreatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    defaulterId: "",
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    totalDueAmount: "",
    lastInvoiceDate: "",
  });

  const clientId = useMemo(
    () => userData?._id || userData?.id || userData?.clientId || "",
    [userData]
  );

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  useEffect(() => {
    if (!isEditMode) return;

    const loadDefaulter = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.ClientPortalGetDefaulterById}${editId}`, METHODS.GET);
        if (result?.success && result?.data) {
          const data = result.data;
          setFormData({
            defaulterId: data.defaulterId || "",
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            companyName: data.companyName || "",
            address: data.address || "",
            totalDueAmount: Number(data.totalDueAmount || 0),
            lastInvoiceDate: data.lastInvoiceDate || "",
          });
        }
      } catch (error) {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    loadDefaulter();
  }, [editId, isEditMode]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientId) {
      Swal.fire({
        title: "Session Missing",
        text: "Please login again as client",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.companyName.trim() ||
      !formData.address.trim() ||
      !formData.lastInvoiceDate.trim()
    ) {
      Swal.fire({
        title: "Missing Information",
        text: "Please fill all required defaulter fields",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        clientId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        companyName: formData.companyName.trim(),
        address: formData.address.trim(),
        totalDueAmount: Number(formData.totalDueAmount || 0),
        lastInvoiceDate: formData.lastInvoiceDate,
      };

      const url = isEditMode
        ? `${END_POINT.ClientPortalUpdateDefaulter}${editId}`
        : END_POINT.ClientPortalCreateDefaulter;
      const method = isEditMode ? METHODS.PUT : METHODS.POST;

      const result = await fetchData(url, method, payload);
      if (result?.success) {
        Swal.fire({
          title: isEditMode ? "Defaulter Updated" : "Defaulter Created",
          text: result.message || (isEditMode ? "Defaulter updated successfully" : "Defaulter created successfully"),
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/client-defaulters");
      } else {
        Swal.fire({
          title: isEditMode ? "Update Failed" : "Create Failed",
          text: result?.message || "Request failed",
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
    <ClientPortalLayout
      activeKey="createDefaulter"
      title={isEditMode ? "Edit Defaulter" : "Create Defaulter"}
      subtitle="Create and update defaulter records for notice and recovery workflows."
      actions={<><Link className="btn btn-light" to="/client-defaulters">Defaulters Display</Link><Link className="btn btn-light" to="/client-dashboard">Dashboard</Link></>}
    >
      <article className="form-panel">
        <h3>{isEditMode ? "Defaulter Edit Form" : "Defaulter Create Form"}</h3>
        <form className="crud-form" onSubmit={handleSubmit}>
          <label>Defaulter ID</label>
          <input type="text" value={formData.defaulterId || "Will be generated automatically"} disabled />

          <label>Name</label>
          <input type="text" placeholder="Enter defaulter name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />

          <label>Email</label>
          <input type="email" placeholder="Enter email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />

          <label>Phone</label>
          <input type="text" placeholder="Enter phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />

          <label>Company Name</label>
          <input type="text" placeholder="Enter company name" value={formData.companyName} onChange={(e) => handleChange("companyName", e.target.value)} />

          <label>Address</label>
          <input type="text" placeholder="Enter address" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} />

          <label>Total Due Amount</label>
          <input type="number" placeholder="Enter total due amount" value={formData.totalDueAmount} onChange={(e) => handleChange("totalDueAmount", e.target.value)} />

          <label>Last Invoice Date</label>
          <input type="date" value={formData.lastInvoiceDate} onChange={(e) => handleChange("lastInvoiceDate", e.target.value)} />

          <div className="crud-actions">
            <button type="submit" className="btn btn-primary" disabled={loading || submitting}>
              {loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Defaulter" : "Create Defaulter")}
            </button>
          </div>
        </form>
      </article>
    </ClientPortalLayout>
  );
};

export default ClientDefaultersCreatePage;
