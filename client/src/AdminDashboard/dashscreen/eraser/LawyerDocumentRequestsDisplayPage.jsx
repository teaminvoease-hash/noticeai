import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import LawyerPortalLayout from "./LawyerPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const PAGE_SIZE = 10;

const DOCUMENT_TYPE_OPTIONS = [
  "authority letter",
  "contract copy",
  "id proof",
  "supporting document",
];

const STATUS_OPTIONS = ["sent", "reminder sent", "received"];

const LawyerDocumentRequestsDisplayPage = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [notices, setNotices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const lawyerId = useMemo(() => userData?._id || userData?.id || "", [userData]);

  useEffect(() => {
    const loadData = async () => {
      if (!lawyerId) return;
      setLoading(true);
      try {
        const [requestResult, noticeResult, documentResult] = await Promise.all([
          fetchData(
            `${END_POINT.ClientPortalGetDocuments}?requestedByRole=lawyer&requestedById=${encodeURIComponent(lawyerId)}`,
            METHODS.GET
          ),
          fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET),
          fetchData(END_POINT.ClientPortalGetDocuments, METHODS.GET),
        ]);
        setRequests(requestResult?.success ? requestResult.data || [] : []);
        setNotices(noticeResult?.success ? noticeResult.data || [] : []);
        setDocuments(documentResult?.success ? documentResult.data || [] : []);
      } catch (error) {
        setRequests([]);
        setNotices([]);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [lawyerId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, documentFilter, statusFilter]);

  const filteredRequests = useMemo(() => {
    return requests
      .map((item) => ({
        ...item,
        clientUploadStatus: Array.isArray(item.responseFiles) && item.responseFiles.length > 0 ? "Uploaded" : "Pending",
      }))
      .filter((item) => {
        const query = searchText.trim().toLowerCase();
        const type = String(item.type || "").toLowerCase();
        const status = String(item.status || "").toLowerCase();

        if (documentFilter !== "all" && type !== documentFilter) return false;
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (!query) return true;

        return (
          String(item.docId || "").toLowerCase().includes(query) ||
          String(item.noticeId || "").toLowerCase().includes(query) ||
          String(item.clientEmail || "").toLowerCase().includes(query) ||
          type.includes(query) ||
          status.includes(query)
        );
      });
  }, [requests, searchText, documentFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const noticeMap = useMemo(() => {
    const map = new Map();
    notices.forEach((notice) => {
      map.set(String(notice.noticeId), notice);
    });
    return map;
  }, [notices]);

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handleViewDocuments = (requestItem) => {
    const notice = noticeMap.get(String(requestItem.noticeId));
    const relatedDocs = documents.filter((doc) => String(doc.noticeId || "") === String(requestItem.noticeId || ""));
    const rows = [];

    if (notice?.authorityLetter) {
      rows.push(`
        <div style="margin-bottom:8px;">
          <strong>Notice Authority Letter:</strong>
          <a href="${BASE_URL_IMAGE}${notice.authorityLetter}" target="_blank" rel="noreferrer">View</a>
        </div>
      `);
    }

    if (notice?.supportingDocument) {
      rows.push(`
        <div style="margin-bottom:8px;">
          <strong>Notice Supporting Document:</strong>
          <a href="${BASE_URL_IMAGE}${notice.supportingDocument}" target="_blank" rel="noreferrer">View</a>
        </div>
      `);
    }

    relatedDocs.forEach((doc) => {
      if (String(doc.requestedByRole || "").toLowerCase() === "lawyer") {
        const responseFiles = Array.isArray(doc.responseFiles) ? doc.responseFiles : [];
        responseFiles.forEach((file, index) => {
          rows.push(`
            <div style="margin-bottom:8px;">
              <strong>${escapeHtml(doc.type || "Requested Document")} ${index + 1}:</strong>
              <a href="${BASE_URL_IMAGE}${file}" target="_blank" rel="noreferrer">View</a>
            </div>
          `);
        });
      } else if (doc.fileName) {
        rows.push(`
          <div style="margin-bottom:8px;">
            <strong>${escapeHtml(doc.type || "Client Document")}:</strong>
            <a href="${BASE_URL_IMAGE}${doc.fileName}" target="_blank" rel="noreferrer">View</a>
          </div>
        `);
      }
    });

    Swal.fire({
      title: `${requestItem.noticeId || "Notice"} Documents`,
      html: `
        <div style="text-align:left; max-height:360px; overflow:auto;">
          ${rows.length > 0 ? rows.join("") : "<p>No client documents available for this notice.</p>"}
        </div>
      `,
      width: 700,
      confirmButtonColor: "#175c8f",
    });
  };

  return (
    <LawyerPortalLayout
      activeKey="requests-display"
      title="Requests Display"
      subtitle="Display, filter, and edit your client document requests."
      actions={
        <>
          <Link className="btn btn-light" to="/lawyer-document-requests">Create Request</Link>
          <Link className="btn btn-light" to="/lawyer-dashboard">Dashboard</Link>
        </>
      }
    >
      <article className="table-panel">
        <div className="search-row">
          <input
            type="text"
            placeholder="Search by request id, notice id, client email, status"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)}>
            <option value="all">All Document Types</option>
            {DOCUMENT_TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="table-scroll">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Notice ID</th>
                <th>Client Email</th>
                <th>Document Type</th>
                <th>Document</th>
                <th>Client Upload</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="8">Loading document requests...</td></tr> : null}
              {!loading && paginatedRequests.length === 0 ? <tr><td colSpan="8">No document requests found</td></tr> : null}
              {!loading && paginatedRequests.map((item) => (
                <tr key={item._id}>
                  <td>{item.docId || "-"}</td>
                  <td>{item.noticeId || "-"}</td>
                  <td>{item.clientEmail || "-"}</td>
                  <td>{item.type || "-"}</td>
                  <td>
                    <button className="tiny-btn" type="button" onClick={() => handleViewDocuments(item)}>
                      View
                    </button>
                  </td>
                  <td>{item.clientUploadStatus}</td>
                  <td>{item.status || "-"}</td>
                  <td>
                    <Link className="tiny-btn" to={`/lawyer-document-requests?edit=${item._id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="pagination-wrap">
        <p className="pagination-meta">Showing {paginatedRequests.length} of {filteredRequests.length}</p>
        <div className="pagination">
          <button
            type="button"
            className="page-btn"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((page) => (
            <button
              key={page}
              type="button"
              className={`page-btn ${currentPage === page ? "active" : ""}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            className="page-btn"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </LawyerPortalLayout>
  );
};

export default LawyerDocumentRequestsDisplayPage;
