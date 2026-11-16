import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import ClientPortalLayout from "./ClientPortalLayout";
import { fetchData, FileUpload } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const ClientNoticeSubmission = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [notices, setNotices] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [clientProfile, setClientProfile] = useState(null);
  const [noticePreview, setNoticePreview] = useState("");
  const [formData, setFormData] = useState({
    subject: "",
    category: "Property",
    defaulterId: "",
    recipientDetails: "",
    caseSummary: "",
    supportingDocument: "",
  });

  const clientId = useMemo(() => (
    userData?._id || userData?.id || userData?.clientId || ""
  ), [userData]);

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [noticeResult, defaulterResult, profileResult] = await Promise.all([
        fetchData(`${END_POINT.ClientPortalGetNotices}?clientId=${encodeURIComponent(clientId)}`, METHODS.GET),
        fetchData(`${END_POINT.ClientPortalGetDefaulters}?clientId=${encodeURIComponent(clientId)}`, METHODS.GET),
        fetchData(`${END_POINT.ClientPortalGetProfile}${clientId}`, METHODS.GET),
      ]);

      if (noticeResult?.success) {
        setNotices((noticeResult.data || []).filter((item) => String(item.clientId) === String(clientId)));
      } else {
        setNotices([]);
      }

      if (defaulterResult?.success) {
        const list = defaulterResult.data || [];
        setDefaulters(list);
        setFormData((prev) => ({ ...prev, defaulterId: prev.defaulterId || list?.[0]?._id || "" }));
      } else {
        setDefaulters([]);
      }

      if (profileResult?.success && profileResult?.data) {
        setClientProfile(profileResult.data);
      } else {
        setClientProfile(null);
      }
    } catch (error) {
      setNotices([]);
      setDefaulters([]);
      setClientProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const resetForm = () => {
    setEditingId("");
    setFormData({
      subject: "",
      category: "Property",
      defaulterId: defaulters?.[0]?._id || "",
      recipientDetails: "",
      caseSummary: "",
      supportingDocument: "",
    });
    setNoticePreview("");
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const formatNoticePreview = (value) => {
    const text = String(value || "").trim();
    if (!text) return "Generate preview to see the drafted notice here.";
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text;
    }

    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return escaped.replace(/\n/g, "<br/>");
  };

  const buildStyledNoticePreview = () => `
    <div style="font-family:'Times New Roman', serif; color:#000; background:#fff; border:1px solid #d7e0ea; border-radius:16px; padding:24px; box-shadow:0 10px 30px rgba(15, 23, 42, 0.06);">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
        <tr>
          <td width="18%" valign="top" style="padding-right:10px;">
            <img
              src="/assets/logo.svg"
              alt="Logo"
              style="max-width:100px; height:auto;"
            />
          </td>
          <td width="82%" valign="top" style="text-align:left;">
            <h1 style="font-size:20px; margin:0; font-weight:bold; text-transform:uppercase; color:#000;">
              Saurav Deep & Associates
            </h1>
            <p style="margin:3px 0; font-size:15px;"><strong>Advocates & Legal Consultants</strong></p>
            <p style="margin:3px 0; font-size:15px;">Delhi High Court | Tribunals | District Courts</p>
            <p style="margin:3px 0; font-size:15px;">
              Office: 458/459, 2nd Floor, Aggarwal Chamber-3,<br/>
              Building No. 26, Veer Savarkar Block, Shakarpur,<br/>
              New Delhi - 110092
            </p>
            <p style="margin:3px 0; font-size:15px;">
              Phone: +91-7042148991 | +91-9990670288
            </p>
          </td>
        </tr>
      </table>

      <hr style="border:0; border-top:1px solid #000; margin:16px 0;" />

      <div style="text-align:center; font-weight:bold; font-size:16px; margin:18px 0 12px 0; text-transform:uppercase; letter-spacing:0.5px;">
        Legal Notice
      </div>

      <div style="display:flex; justify-content:space-between; gap:16px; font-size:14px; margin-bottom:18px;">
        <div>
          <div><strong>Subject:</strong> ${formData.subject ? formData.subject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") : "-"}</div>
          <div><strong>Defaulter:</strong> ${defaulters.find((item) => String(item._id) === String(formData.defaulterId))?.name ? String(defaulters.find((item) => String(item._id) === String(formData.defaulterId))?.name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") : "-"}</div>
        </div>
        <div style="text-align:right;">
          <div><strong>Category:</strong> ${formData.category ? formData.category.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") : "-"}</div>
          <div><strong>Status:</strong> ${editingId ? "Draft Update" : "Preview Draft"}</div>
        </div>
      </div>

      <div style="line-height:1.8; font-size:15px; text-align:justify;">
        ${formatNoticePreview(noticePreview)}
      </div>

      <div style="border-top:1px solid #cbd5e1; margin-top:28px; padding-top:18px;">
        <img
          src=""
          alt="Signature"
          style="height:70px; margin-bottom:10px;"
        />
        <p style="margin:0; font-size:15px;">Best Regards,</p>
        <p style="margin:0; font-size:15px;"><strong>Saurav Deep & Associates</strong></p>
        <p style="margin:0; font-size:15px;">Advocates & Legal Consultants</p>
      </div>
    </div>
  `;

  const handleSupportingDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!String(file.name).toLowerCase().endsWith(".pdf")) {
      Swal.fire({
        title: "Invalid File",
        text: "Please upload PDF file only",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      event.target.value = "";
      return;
    }

    setUploadingDocument(true);
    try {
      const result = await FileUpload(file);
      if (result?.success) {
        const fileName = result.fileName || result.image || "";
        setFormData((prev) => ({ ...prev, supportingDocument: fileName }));
        Swal.fire({
          title: "Uploaded",
          text: "Supporting document uploaded successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Upload Failed",
          text: result?.message || "Could not upload supporting document",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Upload Failed",
        text: "Could not upload supporting document",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setUploadingDocument(false);
      event.target.value = "";
    }
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

    if (!String(clientProfile?.authorityLetter || "").trim()) {
      Swal.fire({
        title: "Authority Letter Required",
        text: "Please upload authority letter in client profile before creating notice",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!formData.subject.trim() || !formData.category.trim() || !formData.defaulterId.trim()) {
      Swal.fire({
        title: "Missing Information",
        text: "Subject, category and defaulter are mandatory",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const selectedDefaulter = defaulters.find((item) => String(item._id) === String(formData.defaulterId));
      const payload = {
        clientId,
        subject: formData.subject.trim(),
        category: formData.category.trim(),
        defaulterId: formData.defaulterId.trim(),
        defaulterName: selectedDefaulter?.name || "",
        recipientDetails: formData.recipientDetails.trim(),
        caseSummary: formData.caseSummary.trim(),
        supportingDocument: formData.supportingDocument.trim(),
      };

      const isEdit = Boolean(editingId);
      const url = isEdit
        ? `${END_POINT.ClientPortalUpdateNotice}${editingId}`
        : END_POINT.ClientPortalSubmitNotice;
      const method = isEdit ? METHODS.PUT : METHODS.POST;

      const result = await fetchData(url, method, payload);
      if (result?.success) {
        Swal.fire({
          title: isEdit ? "Notice Updated" : "Notice Submitted",
          text: result.message || (isEdit ? "Notice updated successfully" : "Notice submitted successfully"),
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        resetForm();
        navigate("/client-my-notices");
      } else {
        Swal.fire({
          title: isEdit ? "Update Failed" : "Submission Failed",
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

  const handleGeneratePreview = async () => {
    if (!clientId) {
      Swal.fire({
        title: "Session Missing",
        text: "Please login again as client",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!String(clientProfile?.authorityLetter || "").trim()) {
      Swal.fire({
        title: "Authority Letter Required",
        text: "Please upload authority letter in client profile before generating preview",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!formData.subject.trim() || !formData.category.trim() || !formData.defaulterId.trim()) {
      Swal.fire({
        title: "Missing Information",
        text: "Subject, category and defaulter are mandatory",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await fetchData(END_POINT.ClientPortalPreviewNotice, METHODS.POST, {
        clientId,
        subject: formData.subject.trim(),
        category: formData.category.trim(),
        defaulterId: formData.defaulterId.trim(),
        recipientDetails: formData.recipientDetails.trim(),
        caseSummary: formData.caseSummary.trim(),
      });

      if (result?.success) {
        setNoticePreview(result?.data?.generatedNotice || "");
        Swal.fire({
          title: "Preview Ready",
          text: result?.message || "Notice preview generated successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Preview Failed",
          text: result?.message || "Could not generate notice preview",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Preview Failed",
        text: "Could not generate notice preview",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleEdit = (notice) => {
    setEditingId(notice._id);
    setFormData({
      subject: notice.subject || "",
      category: notice.category || "Property",
      defaulterId: notice.defaulterId || "",
      recipientDetails: notice.recipientDetails || "",
      caseSummary: notice.caseSummary || "",
      supportingDocument: notice.supportingDocument || "",
    });
    setNoticePreview(notice.generatedNotice || "");
  };

  const handleView = (notice) => {
    Swal.fire({
      title: notice.noticeId || "Notice Details",
      html: `
        <div style="text-align:left">
          <p><strong>Subject:</strong> ${notice.subject || "-"}</p>
          <p><strong>Defaulter:</strong> ${notice.defaulterName || "-"}</p>
          <p><strong>Category:</strong> ${notice.category || "-"}</p>
          <p><strong>Supporting Document:</strong> ${notice.supportingDocument || "-"}</p>
          <p><strong>Status:</strong> ${notice.status || "Pending"}</p>
        </div>
      `,
      confirmButtonColor: "#175c8f",
    });
  };

  useEffect(() => {
    const stateNotice = location.state?.editNotice;
    if (stateNotice && stateNotice._id) {
      handleEdit(stateNotice);
      return;
    }

    const params = new URLSearchParams(location.search);
    const editId = params.get("edit");
    if (!editId || notices.length === 0) return;
    const selected = notices.find((n) => String(n._id) === String(editId));
    if (selected) {
      handleEdit(selected);
    }
  }, [location.state, location.search, notices]);

  return (
    <ClientPortalLayout
      activeKey="submit"
      title="Client Notice Submission"
      subtitle="Submit notice details with supporting documents and mandatory authority letter."
      actions={<><Link className="btn btn-light" to="/client-my-notices">My Notices</Link><Link className="btn btn-light" to="/client-dashboard">Dashboard</Link></>}
    >
      <article className="form-panel">
        <h3>{editingId ? "Edit Notice" : "Notice Submission Form"}</h3>
        <form className="crud-form" onSubmit={handleSubmit}>
          <label>Notice Subject</label>
          <input
            type="text"
            placeholder="Ex: Property dispute notice"
            value={formData.subject}
            onChange={(e) => handleChange("subject", e.target.value)}
          />

          <label>Notice Category</label>
          <select value={formData.category} onChange={(e) => handleChange("category", e.target.value)}>
            <option value="Property">Property</option>
            <option value="Employment">Employment</option>
            <option value="Financial">Financial</option>
            <option value="Contract">Contract</option>
            <option value="Tenant">Tenant</option>
          </select>

          <label>Defaulter</label>
          <select value={formData.defaulterId} onChange={(e) => handleChange("defaulterId", e.target.value)}>
            <option value="">Select Defaulter</option>
            {defaulters.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} - {item.companyName || "No Company"}
              </option>
            ))}
          </select>

          <label>Recipient Details</label>
          <textarea
            placeholder="Recipient name, address, and details"
            value={formData.recipientDetails}
            onChange={(e) => handleChange("recipientDetails", e.target.value)}
          />

          <label>Case Summary</label>
          <textarea
            placeholder="Describe the issue in detail"
            value={formData.caseSummary}
            onChange={(e) => handleChange("caseSummary", e.target.value)}
          />

          <label>Supporting Document File Name</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleSupportingDocumentUpload}
            disabled={uploadingDocument}
          />
          {formData.supportingDocument ? <p className="pagination-meta">Uploaded: {formData.supportingDocument}</p> : null}

          <div className="crud-actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={handleGeneratePreview}
              disabled={previewLoading || submitting || uploadingDocument}
            >
              {previewLoading ? "Generating Preview..." : noticePreview ? "Regenerate Notice" : "Generate Preview"}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || previewLoading || uploadingDocument}>
              {submitting ? "Saving..." : uploadingDocument ? "Uploading..." : editingId ? "Update Notice" : "Submit Notice Request"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-light" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="form-panel">
        <h3>Notice Preview</h3>
        <div
          style={{
            minHeight: "280px",
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(buildStyledNoticePreview()) }}
        >
        </div>
      </article>

      <article className="table-panel">
        <div className="table-scroll">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Notice ID</th>
                <th>Subject</th>
                <th>Defaulter</th>
                <th>Category</th>
                <th>Document</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && notices.length === 0 ? (
                <tr>
                  <td colSpan="8">No notices found</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan="8">Loading notices...</td>
                </tr>
              ) : null}
              {!loading && notices.map((notice) => (
                <tr key={notice._id}>
                  <td>{notice.noticeId}</td>
                  <td>{notice.subject}</td>
                  <td>{notice.defaulterName || "-"}</td>
                  <td>{notice.category}</td>
                  <td>
                    {notice.supportingDocument ? (
                      <a
                        className="tiny-btn"
                        href={`${BASE_URL_IMAGE}${notice.supportingDocument}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{notice.status || "Pending"}</td>
                  <td>{new Date(notice.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button type="button" className="tiny-btn" onClick={() => handleView(notice)}>
                      View
                    </button>
                    <button type="button" className="tiny-btn" onClick={() => handleEdit(notice)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </ClientPortalLayout>
  );
};

export default ClientNoticeSubmission;
