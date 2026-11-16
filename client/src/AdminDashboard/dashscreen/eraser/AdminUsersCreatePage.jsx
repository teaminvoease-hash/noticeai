import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const AdminUsersCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    name: "",
    ownerName: "",
    company: "",
    address: "",
    email: "",
    phone: "",
    password: "",
    status: "onboard",
  });

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  useEffect(() => {
    if (!isEditMode) return;

    const loadClient = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.GetClientById}${editId}`, METHODS.GET);
        if (result?.success && result?.data) {
          const data = result.data;
          setFormData({
            client_id: data.client_id || "",
            name: data.name || "",
            ownerName: data.ownerName || "",
            company: data.company || "",
            address: data.address || "",
            email: data.email || "",
            phone: data.phone || "",
            password: "",
            status: String(data.status || "onboard").toLowerCase(),
          });
        }
      } catch (error) {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [isEditMode, editId]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.ownerName.trim() ||
      !formData.company.trim() ||
      !formData.address.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      (!isEditMode && !formData.password.trim())
    ) {
      Swal.fire({
        title: "Missing Information",
        text: isEditMode
          ? "Name, owner name, company, address, phone and email are required"
          : "Name, owner name, company, address, phone, email and password are required",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        ownerName: formData.ownerName.trim(),
        company: formData.company.trim(),
        address: formData.address.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        status: formData.status,
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const result = isEditMode
        ? await fetchData(`${END_POINT.UpdateClientBasic}${editId}`, METHODS.POST, payload)
          : await fetchData(END_POINT.ClientAuthSignup, METHODS.POST, {
            name: payload.name,
            ownerName: payload.ownerName,
            company: payload.company,
            address: payload.address,
            email: payload.email,
            phone: payload.phone,
            password: payload.password,
          });

      if (result?.success) {
        Swal.fire({
          title: isEditMode ? "Client Updated" : "Client Created",
          text: isEditMode ? "Client updated successfully" : "Client registered with onboard status",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/admin-users");
      } else {
        Swal.fire({
          title: isEditMode ? "Update Failed" : "Create Failed",
          text: result?.message || (isEditMode ? "Could not update client" : "Could not create client"),
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
    <AdminPortalLayout activeKey="users" title={isEditMode ? "Edit Client" : "Create Client"} subtitle={isEditMode ? "Edit client record from this page." : "Create new client records from this page."} actions={<><Link className="btn btn-light" to="/admin-users">Clients Display</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="form-panel">
        <h3>{isEditMode ? "Client Edit Form" : "Client Create Form"}</h3>
        <form className="crud-form" onSubmit={handleSubmit}>
          <label>Client ID</label>
          <input type="text" value={formData.client_id || "Will be generated automatically"} disabled />

          <label>Full Name</label>
          <input type="text" placeholder="Enter full name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />

          <label>Owner Name</label>
          <input type="text" placeholder="Enter owner name" value={formData.ownerName} onChange={(e) => handleChange("ownerName", e.target.value)} />

          <label>Company</label>
          <input type="text" placeholder="Enter company name" value={formData.company} onChange={(e) => handleChange("company", e.target.value)} />

          <label>Address</label>
          <input type="text" placeholder="Enter address" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} />

          <label>Phone</label>
          <input type="text" placeholder="Enter phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />

          <label>Email Id</label>
          <input type="email" placeholder="Enter email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />

          <label>Password</label>
          <input type="password" placeholder={isEditMode ? "Leave blank to keep same password" : "Enter password"} value={formData.password} onChange={(e) => handleChange("password", e.target.value)} />

          <label>Status</label>
          <select value={formData.status} onChange={(e) => handleChange("status", e.target.value)} disabled={!isEditMode}>
            <option value="onboard">Onboard</option>
            <option value="verified">Verified</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="crud-actions"><button type="submit" className="btn btn-primary" disabled={submitting || loading}>{loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Client" : "Create Client")}</button></div>
        </form>
      </article>
    </AdminPortalLayout>
  );
};

export default AdminUsersCreatePage;
