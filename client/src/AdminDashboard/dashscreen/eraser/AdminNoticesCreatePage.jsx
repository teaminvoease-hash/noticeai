import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const AdminNoticesCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    notice_id: "",
    clientName: "",
    assignedLawyer: "",
    authorityLetter: "uploaded",
    status: "draft pending",
    trackingNo: "",
  });

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  useEffect(() => {
    if (!isEditMode) return;

    const loadNotice = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.GetAdminNoticeById}${editId}`, METHODS.GET);
        if (result?.success && result?.data) {
          const data = result.data;
          setFormData({
            notice_id: data.notice_id || "",
            clientName: data.clientName || "",
            assignedLawyer: data.assignedLawyer || "",
            authorityLetter: String(data.authorityLetter || "uploaded").toLowerCase(),
            status: String(data.status || "draft pending").toLowerCase(),
            trackingNo: data.trackingNo || "",
          });
        }
      } catch (error) {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    loadNotice();
  }, [editId, isEditMode]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      Swal.fire({
        title: "Missing Client Name",
        text: "Please enter client name",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        clientName: formData.clientName,
        assignedLawyer: formData.assignedLawyer,
        authorityLetter: formData.authorityLetter,
        status: formData.status,
        trackingNo: formData.trackingNo,
      };

      const result = isEditMode
        ? await fetchData(`${END_POINT.UpdateAdminNotice}${editId}`, METHODS.POST, payload)
        : await fetchData(END_POINT.CreateAdminNotice, METHODS.POST, payload);

      if (result?.success) {
        Swal.fire({
          title: isEditMode ? "Notice Updated" : "Notice Created",
          text: isEditMode ? "Notice updated successfully" : "Notice created successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/admin-notices");
      } else {
        Swal.fire({
          title: isEditMode ? "Update Failed" : "Create Failed",
          text: result?.message || "Could not save notice",
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
    <AdminPortalLayout activeKey="notices" title={isEditMode ? "Edit Notice Workflow Record" : "Create Notice Workflow Record"} subtitle="Create notice workflow and assignment records." actions={<><Link className="btn btn-light" to="/admin-notices">Notice Display</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="form-panel"><h3>{isEditMode ? "Notice Edit Form" : "Notice Create Form"}</h3><form className="crud-form" onSubmit={handleSubmit}><label>Notice ID</label><input type="text" value={formData.notice_id || "Will be generated automatically"} disabled /><label>Client Name</label><input type="text" placeholder="Client name" value={formData.clientName} onChange={(e) => handleChange("clientName", e.target.value)} /><label>Assigned Lawyer</label><input type="text" placeholder="Lawyer name" value={formData.assignedLawyer} onChange={(e) => handleChange("assignedLawyer", e.target.value)} /><label>Authority Letter</label><select value={formData.authorityLetter} onChange={(e) => handleChange("authorityLetter", e.target.value)}><option value="uploaded">Uploaded</option><option value="missing">Missing</option></select><label>Status</label><select value={formData.status} onChange={(e) => handleChange("status", e.target.value)}><option value="draft pending">Draft Pending</option><option value="in advocate review">In Advocate Review</option><option value="signed">Signed</option><option value="delivered">Delivered</option></select><label>Tracking No.</label><input type="text" placeholder="TRK-778899" value={formData.trackingNo} onChange={(e) => handleChange("trackingNo", e.target.value)} /><div className="crud-actions"><button type="submit" className="btn btn-primary" disabled={loading || submitting}>{loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Notice" : "Create Notice")}</button></div></form></article>
    </AdminPortalLayout>
  );
};

export default AdminNoticesCreatePage;
