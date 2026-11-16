import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const detectUploadedBy = (userData) => {
  if (!userData) return "admin";
  if (userData.advocate_id || userData.enrollmentNo || userData.barId) return "advocate";
  if (userData.client_id || userData.phone || userData.authorityLetter) return "client";
  return "admin";
};

const AdminDocumentsCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notices, setNotices] = useState([]);
  const [formData, setFormData] = useState({
    document_id: "",
    noticeId: "",
    type: "authority letter",
    uploadedBy: detectUploadedBy(userData),
    accessLevel: "restricted",
    status: "active",
  });

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, uploadedBy: detectUploadedBy(userData) }));
  }, [userData]);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        const result = await fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET);
        if (result?.success) {
          const list = result.data || [];
          setNotices(list);
          setFormData((prev) => ({
            ...prev,
            noticeId: prev.noticeId || list?.[0]?.noticeId || "",
          }));
        } else {
          setNotices([]);
        }
      } catch (error) {
        setNotices([]);
      }
    };

    loadNotices();
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.GetAdminDocumentById}${editId}`, METHODS.GET);
        if (result?.success && result?.data) {
          const data = result.data;
          setFormData((prev) => ({
            ...prev,
            document_id: data.document_id || "",
            noticeId: data.noticeId || "",
            type: String(data.type || "authority letter").toLowerCase(),
            uploadedBy: String(data.uploadedBy || detectUploadedBy(userData)).toLowerCase(),
            accessLevel: String(data.accessLevel || "restricted").toLowerCase(),
            status: String(data.status || "active").toLowerCase(),
          }));
        }
      } catch (error) {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isEditMode, editId, userData]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.type) {
      Swal.fire({
        title: "Missing Information",
        text: "Document type is required",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        noticeId: formData.noticeId.trim(),
        type: formData.type,
        uploadedBy: formData.uploadedBy,
        accessLevel: formData.accessLevel,
        status: formData.status,
      };

      const result = isEditMode
        ? await fetchData(`${END_POINT.UpdateAdminDocument}${editId}`, METHODS.POST, payload)
        : await fetchData(END_POINT.CreateAdminDocument, METHODS.POST, payload);

      if (result?.success) {
        Swal.fire({
          title: isEditMode ? "Document Updated" : "Document Created",
          text: isEditMode ? "Document updated successfully" : "Document created successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/admin-documents");
      } else {
        Swal.fire({
          title: isEditMode ? "Update Failed" : "Create Failed",
          text: result?.message || "Could not save document",
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
    <AdminPortalLayout activeKey="documents" title={isEditMode ? "Edit Document" : "Create Document"} subtitle="Create secure document records for notices." actions={<><Link className="btn btn-light" to="/admin-documents">Documents Display</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="form-panel"><h3>{isEditMode ? "Document Edit Form" : "Document Create Form"}</h3><form className="crud-form" onSubmit={handleSubmit}><label>Document ID</label><input type="text" value={formData.document_id || "Will be generated automatically"} disabled /><label>Notice ID</label><select value={formData.noticeId} onChange={(e) => handleChange("noticeId", e.target.value)}><option value="">Select Notice ID</option>{notices.map((notice) => (<option key={notice._id} value={notice.noticeId}>{notice.noticeId} - {notice.subject || "Notice"}</option>))}</select><label>Document Type</label><select value={formData.type} onChange={(e) => handleChange("type", e.target.value)}><option value="authority letter">Authority Letter</option><option value="signed notice">Signed Notice</option><option value="invoice">Invoice</option><option value="receipt">Receipt</option></select><label>Uploaded By (Auto)</label><input type="text" value={formData.uploadedBy} disabled /><label>Access Level</label><select value={formData.accessLevel} onChange={(e) => handleChange("accessLevel", e.target.value)}><option value="restricted">Restricted</option><option value="client + advocate">Client + Advocate</option><option value="admin only">Admin Only</option></select><label>Status</label><select value={formData.status} onChange={(e) => handleChange("status", e.target.value)}><option value="active">Active</option><option value="archived">Archived</option></select><div className="crud-actions"><button type="submit" className="btn btn-primary" disabled={loading || submitting}>{loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Document" : "Create Document")}</button></div></form></article>
    </AdminPortalLayout>
  );
};

export default AdminDocumentsCreatePage;
