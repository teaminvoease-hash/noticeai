import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import LawyerPortalLayout from "./LawyerPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const DOCUMENT_TYPE_OPTIONS = [
  "authority letter",
  "contract copy",
  "id proof",
  "supporting document",
];

const LawyerDocumentRequestsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [assignedNotices, setAssignedNotices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    noticeId: "",
    clientId: "",
    clientEmail: "",
    requestedDocumentType: "authority letter",
    requestMessage: "",
  });

  const lawyerId = useMemo(() => userData?._id || userData?.id || "", [userData]);

  const clientMap = useMemo(() => {
    const map = new Map();
    clients.forEach((client) => map.set(String(client._id), client));
    return map;
  }, [clients]);

  const noticeOptions = useMemo(
    () =>
      assignedNotices.map((notice) => {
        const client = clientMap.get(String(notice.clientId));
        return {
          ...notice,
          clientEmail: client?.email || "",
        };
      }),
    [assignedNotices, clientMap]
  );

  const syncNoticeSelection = (noticeId) => {
    const selectedNotice = noticeOptions.find((notice) => String(notice.noticeId) === String(noticeId));
    setFormData((prev) => ({
      ...prev,
      noticeId,
      clientId: selectedNotice?.clientId || "",
      clientEmail: selectedNotice?.clientEmail || "",
    }));
  };

  const resetForm = () => {
    const firstNotice = noticeOptions[0];
    setEditingRequest(null);
    setFormData({
      noticeId: firstNotice?.noticeId || "",
      clientId: firstNotice?.clientId || "",
      clientEmail: firstNotice?.clientEmail || "",
      requestedDocumentType: "authority letter",
      requestMessage: "",
    });
  };

  const loadData = async () => {
    if (!lawyerId) return;
    setLoading(true);
    try {
      const [noticeResult, clientResult, requestResult] = await Promise.all([
        fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET),
        fetchData(END_POINT.GetClient, METHODS.GET),
        fetchData(
          `${END_POINT.ClientPortalGetDocuments}?requestedByRole=lawyer&requestedById=${encodeURIComponent(lawyerId)}`,
          METHODS.GET
        ),
      ]);

      const allNotices = noticeResult?.success ? noticeResult.data || [] : [];
      const lawyerNotices = allNotices.filter((item) => String(item.lawyerId || "") === String(lawyerId));
      const allClients = clientResult?.success ? clientResult.data || [] : [];
      const lawyerRequests = requestResult?.success ? requestResult.data || [] : [];

      setAssignedNotices(lawyerNotices);
      setClients(allClients);
      setRequests(lawyerRequests);

      const params = new URLSearchParams(location.search);
      const editId = params.get("edit");

      if (editId) {
        const requestItem = lawyerRequests.find((item) => String(item._id) === String(editId));
        if (requestItem) {
          setEditingRequest(requestItem);
          setFormData({
            noticeId: requestItem.noticeId || "",
            clientId: requestItem.clientId || "",
            clientEmail: requestItem.clientEmail || "",
            requestedDocumentType: String(requestItem.type || "authority letter").toLowerCase(),
            requestMessage: requestItem.requestMessage || "",
          });
          return;
        }
      }

      const firstNotice = lawyerNotices[0];
      const firstClient = allClients.find((client) => String(client._id) === String(firstNotice?.clientId || ""));
      setFormData((prev) => ({
        ...prev,
        noticeId: prev.noticeId || firstNotice?.noticeId || "",
        clientId: prev.clientId || firstNotice?.clientId || "",
        clientEmail: prev.clientEmail || firstClient?.email || "",
      }));
    } catch (error) {
      setAssignedNotices([]);
      setClients([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lawyerId, location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.noticeId || !formData.clientId || !formData.clientEmail || !formData.requestedDocumentType.trim()) {
      Swal.fire({
        title: "Missing Information",
        text: "Notice, client email, and requested document type are required",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        clientId: formData.clientId,
        noticeId: formData.noticeId,
        type: formData.requestedDocumentType.trim(),
        fileName: editingRequest?.fileName || "",
        clientEmail: formData.clientEmail.trim(),
        requestMessage: formData.requestMessage.trim(),
        requestedByRole: "lawyer",
        requestedById: lawyerId,
      };

      const isEdit = Boolean(editingRequest?._id);
      const url = isEdit
        ? `${END_POINT.ClientPortalUpdateDocument}${editingRequest._id}`
        : END_POINT.ClientPortalUploadDocument;
      const method = isEdit ? METHODS.PUT : METHODS.POST;

      const result = await fetchData(url, method, payload);
      if (result?.success) {
        Swal.fire({
          title: isEdit ? "Request Updated" : "Request Created",
          text: result?.message || (isEdit ? "Document request updated successfully" : "Document request created successfully"),
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        resetForm();
        navigate("/lawyer-document-requests-display");
      } else {
        Swal.fire({
          title: isEdit ? "Update Failed" : "Create Failed",
          text: result?.message || "Could not save document request",
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
      activeKey="requests"
      title={editingRequest ? "Edit Document Request" : "Create Document Request"}
      subtitle="Create a client document request from a notice assigned to your login."
      actions={
        <>
          <Link className="btn btn-light" to="/lawyer-document-requests-display">Requests Display</Link>
          <Link className="btn btn-light" to="/lawyer-dashboard">Dashboard</Link>
        </>
      }
    >
      <article className="form-panel">
        <h3>{editingRequest ? "Edit Document Request" : "Create Document Request"}</h3>
        <form className="crud-form" onSubmit={handleSubmit}>
          <label>Notice</label>
          <select value={formData.noticeId} onChange={(e) => syncNoticeSelection(e.target.value)}>
            <option value="">Select Notice</option>
            {noticeOptions.map((notice) => (
              <option key={notice._id} value={notice.noticeId}>
                {notice.noticeId} - {notice.subject || "No Subject"}
              </option>
            ))}
          </select>

          <label>Client Email</label>
          <input type="email" value={formData.clientEmail} readOnly placeholder="Autofilled from selected notice" />

          <label>Requested Document Type</label>
          <select
            value={formData.requestedDocumentType}
            onChange={(e) => setFormData((prev) => ({ ...prev, requestedDocumentType: e.target.value }))}
          >
            {DOCUMENT_TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <label>Request Message</label>
          <textarea
            placeholder="Document request text for email notification"
            value={formData.requestMessage}
            onChange={(e) => setFormData((prev) => ({ ...prev, requestMessage: e.target.value }))}
          />
          <div className="crud-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting ? "Saving..." : editingRequest ? "Update Request" : "Create Document Request"}
            </button>
            {editingRequest ? (
              <Link className="btn btn-light" to="/lawyer-document-requests">
                Cancel Edit
              </Link>
            ) : null}
          </div>
        </form>
      </article>
    </LawyerPortalLayout>
  );
};

export default LawyerDocumentRequestsPage;
