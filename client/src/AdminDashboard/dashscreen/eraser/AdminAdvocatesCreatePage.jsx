import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const AdminAdvocatesCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    advocate_id: "",
    name: "",
    address: "",
    phone: "",
    enrollmentNo: "",
    barId: "",
    city: "",
    email: "",
    password: "",
    confirmPassword: "",
    aadhaarFile: null,
    panFile: null,
    barIdFile: null,
    status: "pending",
  });

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  useEffect(() => {
    if (!isEditMode) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.GetLawyerById}${editId}`, METHODS.GET);
        if (result?.success && result?.data) {
          const data = result.data;
          setForm({
            advocate_id: data.advocate_id || "",
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            enrollmentNo: data.enrollmentNo || "",
            barId: data.barId || "",
            city: data.city || "",
            email: data.email || "",
            password: "",
            confirmPassword: "",
            aadhaarFile: data.aadhaarFile || null,
            panFile: data.panFile || null,
            barIdFile: data.barIdFile || null,
            status: String(data.status || "pending").toLowerCase(),
          });
        }
      } catch (error) {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isEditMode, editId]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getFileName = (fileValue) => {
    if (!fileValue) return "";
    if (typeof fileValue === "string") return fileValue;
    return fileValue.name || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.address.trim() ||
      !form.phone.trim() ||
      !form.enrollmentNo.trim() ||
      !form.barId.trim() ||
      !form.city.trim() ||
      !form.email.trim()
    ) {
      Swal.fire({
        title: "Missing Information",
        text: "Please fill all required fields",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!isEditMode && !form.password.trim()) {
      Swal.fire({
        title: "Missing Password",
        text: "Password is required for new advocate",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!isEditMode && (!form.aadhaarFile || !form.panFile || !form.barIdFile)) {
      Swal.fire({
        title: "Missing Documents",
        text: "Please upload Aadhaar, PAN, and Bar ID",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (form.password.trim() || form.confirmPassword.trim()) {
      if (form.password !== form.confirmPassword) {
        Swal.fire({
          title: "Password Mismatch",
          text: "Password and confirm password must match",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        enrollmentNo: form.enrollmentNo.trim(),
        barId: form.barId.trim(),
        city: form.city.trim(),
        email: form.email.trim(),
        aadhaarFile: getFileName(form.aadhaarFile),
        panFile: getFileName(form.panFile),
        barIdFile: getFileName(form.barIdFile),
        status: form.status || "pending",
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const result = isEditMode
        ? await fetchData(`${END_POINT.UpdateLawyer}${editId}`, METHODS.POST, payload)
        : await fetchData(END_POINT.CreateLawyer, METHODS.POST, payload);

      if (result?.success) {
        Swal.fire({
          title: isEditMode ? "Advocate Updated" : "Advocate Created",
          text: isEditMode ? "Advocate updated successfully" : "Advocate created successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/admin-advocates");
      } else {
        Swal.fire({
          title: isEditMode ? "Update Failed" : "Create Failed",
          text: result?.message || "Could not save advocate",
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
    <AdminPortalLayout activeKey="advocates" title={isEditMode ? "Edit Advocate" : "Create Advocate"} subtitle="Create/edit advocate records and manage status." actions={<><Link className="btn btn-light" to="/admin-advocates">Advocates Display</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="form-panel">
        <h3>{isEditMode ? "Advocate Edit Form" : "Advocate Create Form"}</h3>
        <form className="crud-form" onSubmit={handleSubmit}>
          <label>Advocate ID</label>
          <input type="text" value={form.advocate_id || "Will be generated automatically"} disabled />

          <label>Advocate Name</label>
          <input type="text" placeholder="Enter advocate name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />

          <label>Address</label>
          <input type="text" placeholder="Enter full address" value={form.address} onChange={(e) => updateField("address", e.target.value)} />

          <label>Phone</label>
          <input type="text" placeholder="Enter phone number" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />

          <label>Enrollment No.</label>
          <input type="text" placeholder="BAR-2020-1123" value={form.enrollmentNo} onChange={(e) => updateField("enrollmentNo", e.target.value)} />

          <label>Bar ID</label>
          <input type="text" placeholder="Enter Bar ID" value={form.barId} onChange={(e) => updateField("barId", e.target.value)} />

          <label>City</label>
          <input type="text" placeholder="Enter city" value={form.city} onChange={(e) => updateField("city", e.target.value)} />

          <label>Email</label>
          <input type="email" placeholder="advocate@mail.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} />

          <label>Upload Aadhaar</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateField("aadhaarFile", e.target.files?.[0] || null)} />
          {typeof form.aadhaarFile === "string" && form.aadhaarFile ? <p className="pagination-meta">Current: {form.aadhaarFile}</p> : null}

          <label>Upload PAN</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateField("panFile", e.target.files?.[0] || null)} />
          {typeof form.panFile === "string" && form.panFile ? <p className="pagination-meta">Current: {form.panFile}</p> : null}

          <label>Upload Bar ID</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateField("barIdFile", e.target.files?.[0] || null)} />
          {typeof form.barIdFile === "string" && form.barIdFile ? <p className="pagination-meta">Current: {form.barIdFile}</p> : null}

          <label>Password</label>
          <input type="password" placeholder={isEditMode ? "Leave blank to keep same password" : "Enter password"} value={form.password} onChange={(e) => updateField("password", e.target.value)} />

          <label>Confirm Password</label>
          <input type="password" placeholder={isEditMode ? "Leave blank to keep same password" : "Confirm password"} value={form.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} />

          <label>Status</label>
          <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
          </select>

          <div className="crud-actions"><button type="submit" className="btn btn-primary" disabled={loading || submitting}>{loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Advocate" : "Create Advocate")}</button></div>
        </form>
      </article>
    </AdminPortalLayout>
  );
};

export default AdminAdvocatesCreatePage;
