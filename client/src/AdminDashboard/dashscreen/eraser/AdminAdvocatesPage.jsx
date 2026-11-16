import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const fileUrl = (fileName) => `${BASE_URL_IMAGE}${fileName}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const FileButton = ({ fileName, label = "View" }) => {
  if (!fileName) return <span>-</span>;
  return (
    <a className="tiny-btn" href={fileUrl(fileName)} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
};

const AdminAdvocatesPage = () => {
  const [loading, setLoading] = useState(false);
  const [advocates, setAdvocates] = useState([]);
  const [notices, setNotices] = useState([]);
  const [documentRequests, setDocumentRequests] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);

  const loadAdvocates = async () => {
    setLoading(true);
    try {
      const [lawyerResult, noticeResult, documentResult, withdrawalResult] = await Promise.all([
        fetchData(END_POINT.GetLawyer, METHODS.GET),
        fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET),
        fetchData(END_POINT.ClientPortalGetDocuments, METHODS.GET),
        fetchData(END_POINT.GetAdminWithdrawal, METHODS.GET),
      ]);

      const list = lawyerResult?.success ? lawyerResult.data || [] : [];
      setAdvocates(list);
      setNotices(noticeResult?.success ? noticeResult.data || [] : []);
      setDocumentRequests(documentResult?.success ? documentResult.data || [] : []);
      setWithdrawals(withdrawalResult?.success ? withdrawalResult.data || [] : []);

      const draft = {};
      list.forEach((item) => {
        draft[item._id] = String(item.status || "pending").toLowerCase();
      });
      setStatusDrafts(draft);
    } catch (error) {
      setAdvocates([]);
      setNotices([]);
      setDocumentRequests([]);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvocates();
  }, []);

  const noticesByLawyer = useMemo(() => {
    const map = new Map();
    notices.forEach((notice) => {
      const keys = [notice.lawyerId, notice.lawyerCode].filter(Boolean).map(String);
      keys.forEach((key) => {
        const list = map.get(key) || [];
        list.push(notice);
        map.set(key, list);
      });
    });
    return map;
  }, [notices]);

  const requestsByLawyer = useMemo(() => {
    const map = new Map();
    documentRequests.forEach((request) => {
      const key = String(request.requestedById || "");
      if (!key) return;
      const list = map.get(key) || [];
      list.push({
        ...request,
        responseFiles: Array.isArray(request.responseFiles) ? request.responseFiles : [],
      });
      map.set(key, list);
    });
    return map;
  }, [documentRequests]);

  const withdrawalsByLawyer = useMemo(() => {
    const map = new Map();
    withdrawals.forEach((withdrawal) => {
      const key = String(withdrawal.advocateId || "");
      if (!key) return;
      const list = map.get(key) || [];
      list.push(withdrawal);
      map.set(key, list);
    });
    return map;
  }, [withdrawals]);

  const getAssignedNotices = (advocate) => {
    const byId = noticesByLawyer.get(String(advocate?._id || "")) || [];
    const byCode = noticesByLawyer.get(String(advocate?.advocate_id || "")) || [];
    const seen = new Set();
    return [...byId, ...byCode].filter((notice) => {
      const key = notice._id || notice.noticeId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getDocumentRequests = (advocate) => requestsByLawyer.get(String(advocate?._id || "")) || [];

  const getWithdrawals = (advocate) => {
    const byId = withdrawalsByLawyer.get(String(advocate?._id || "")) || [];
    const byCode = withdrawalsByLawyer.get(String(advocate?.advocate_id || "")) || [];
    const seen = new Set();
    return [...byId, ...byCode].filter((item) => {
      const key = item._id || item.request_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getAdvocateDocuments = (advocate) => {
    const docs = [
      { id: "aadhaarFile", type: "Aadhaar", fileName: advocate?.aadhaarFile },
      { id: "panFile", type: "PAN", fileName: advocate?.panFile },
      { id: "barIdFile", type: "Bar ID", fileName: advocate?.barIdFile },
      { id: "signatureImage", type: "Signature Image", fileName: advocate?.signatureImage },
    ];
    return docs.filter((doc) => doc.fileName);
  };

  const getAdvocateFieldRows = (advocate) => {
    const rows = [
      ["Database ID", advocate?._id],
      ["Advocate ID", advocate?.advocate_id],
      ["Name", advocate?.name],
      ["Firm Name", advocate?.firmName],
      ["Designation", advocate?.designation],
      ["Email", advocate?.email],
      ["Phone", advocate?.phone],
      ["Address", advocate?.address],
      ["City", advocate?.city],
      ["Enrollment No.", advocate?.enrollmentNo],
      ["Bar ID", advocate?.barId],
      ["Aadhaar File", advocate?.aadhaarFile],
      ["PAN File", advocate?.panFile],
      ["Bar ID File", advocate?.barIdFile],
      ["Signature Image", advocate?.signatureImage],
      ["Status", advocate?.status || "pending"],
      ["Created At", formatDate(advocate?.createdAt)],
      ["Updated At", formatDate(advocate?.updatedAt)],
    ];

    const knownKeys = new Set([
      "_id",
      "__v",
      "password",
      "advocate_id",
      "name",
      "firmName",
      "designation",
      "email",
      "phone",
      "address",
      "city",
      "enrollmentNo",
      "barId",
      "aadhaarFile",
      "panFile",
      "barIdFile",
      "signatureImage",
      "status",
      "createdAt",
      "updatedAt",
    ]);

    Object.entries(advocate || {}).forEach(([key, value]) => {
      if (knownKeys.has(key)) return;
      rows.push([key, typeof value === "object" ? JSON.stringify(value) : value]);
    });

    return rows;
  };

  const filteredAdvocates = useMemo(() => {
    return advocates.filter((item) => {
      const query = searchText.trim().toLowerCase();
      const status = String(item.status || "pending").toLowerCase();
      const city = String(item.city || "").toLowerCase();
      const searchable = [
        item.advocate_id,
        item.name,
        item.firmName,
        item.designation,
        item.email,
        item.phone,
        item.enrollmentNo,
        item.barId,
        item.city,
        item.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (cityFilter.trim() && !city.includes(cityFilter.trim().toLowerCase())) return false;
      if (!query) return true;
      return searchable.includes(query);
    });
  }, [advocates, searchText, statusFilter, cityFilter]);

  const updateStatus = async (id, nextStatus) => {
    if (!nextStatus) return;
    setStatusDrafts((prev) => ({ ...prev, [id]: nextStatus }));
    setUpdatingStatusId(id);
    try {
      const result = await fetchData(`${END_POINT.UpdateLawyerStatus}${id}`, METHODS.POST, {
        status: nextStatus,
      });
      if (result?.success) {
        setAdvocates((prev) => prev.map((item) => (item._id === id ? { ...item, status: nextStatus } : item)));
        Swal.fire({
          title: "Updated",
          text: "Advocate status updated",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Update Failed",
          text: result?.message || "Could not update advocate status",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not update advocate status",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setUpdatingStatusId("");
    }
  };

  const selectedDocuments = selectedAdvocate ? getAdvocateDocuments(selectedAdvocate) : [];
  const selectedNotices = selectedAdvocate ? getAssignedNotices(selectedAdvocate) : [];
  const selectedRequests = selectedAdvocate ? getDocumentRequests(selectedAdvocate) : [];
  const selectedWithdrawals = selectedAdvocate ? getWithdrawals(selectedAdvocate) : [];

  return (
    <AdminPortalLayout activeKey="advocates" title="Advocates Display" subtitle="Display advocates, documents, assignments, and withdrawal details." actions={<><Link className="btn btn-light" to="/admin-advocates-create">Create Advocate</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="table-panel admin-users-panel">
        <div className="search-row">
          <input type="text" placeholder="Search by id, name, email, enrollment, city" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Approval</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
          </select>
          <input type="text" placeholder="Filter by city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
        </div>
        <div className="table-scroll">
          <table className="crud-table admin-users-table">
            <thead>
              <tr>
                <th>Advocate ID</th>
                <th>Name</th>
                <th>Enrollment</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Documents</th>
                <th>Approval</th>
                <th>Details</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="10">Loading advocates...</td></tr> : null}
              {!loading && filteredAdvocates.length === 0 ? <tr><td colSpan="10">No advocates found</td></tr> : null}
              {!loading && filteredAdvocates.map((item) => (
                <tr key={item._id}>
                  <td>{item.advocate_id || "-"}</td>
                  <td>{item.name || "-"}</td>
                  <td>{item.enrollmentNo || "-"}</td>
                  <td>{item.email || "-"}</td>
                  <td>{item.phone || "-"}</td>
                  <td>{item.city || "-"}</td>
                  <td>{getAdvocateDocuments(item).length}</td>
                  <td>
                    <select value={statusDrafts[item._id] || "pending"} onChange={(e) => updateStatus(item._id, e.target.value)} disabled={updatingStatusId === item._id}>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                    </select>
                  </td>
                  <td><button className="tiny-btn" type="button" onClick={() => setSelectedAdvocate(item)}>View Details</button></td>
                  <td><Link className="tiny-btn" to={`/admin-advocates-create?edit=${item._id}`}>&#9998;</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className="pagination-wrap"><p className="pagination-meta">Showing {filteredAdvocates.length} of {advocates.length}</p><div className="pagination"><span className="page-btn active">1</span></div></div>

      {selectedAdvocate ? (
        <div className="detail-modal-backdrop">
          <div className="detail-modal-card">
            <div className="detail-modal-head">
              <div>
                <h3>{selectedAdvocate.name || "Advocate Details"}</h3>
                <p>{selectedAdvocate.advocate_id || "-"} | {selectedAdvocate.email || "-"}</p>
              </div>
              <button className="mandatory-modal-close" type="button" onClick={() => setSelectedAdvocate(null)}>x</button>
            </div>

            <div className="detail-section">
              <h4>Advocate Details</h4>
              <div className="detail-grid">
                {getAdvocateFieldRows(selectedAdvocate).map(([label, value]) => (
                  <div className="detail-item" key={label}>
                    <span>{label}</span>
                    {["Aadhaar File", "PAN File", "Bar ID File", "Signature Image"].includes(label) && value ? (
                      <FileButton fileName={value} label={value} />
                    ) : (
                      <strong>{value || "-"}</strong>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h4>All Advocate Documents</h4>
              <div className="table-scroll">
                <table className="crud-table admin-user-detail-table">
                  <thead><tr><th>Document Type</th><th>File</th><th>Status</th><th>Updated</th></tr></thead>
                  <tbody>
                    {selectedDocuments.length === 0 ? <tr><td colSpan="4">No advocate documents found.</td></tr> : null}
                    {selectedDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.type}</td>
                        <td><FileButton fileName={doc.fileName} label={doc.fileName} /></td>
                        <td>{selectedAdvocate.status || "-"}</td>
                        <td>{formatDate(selectedAdvocate.updatedAt || selectedAdvocate.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="detail-section">
              <h4>Assigned Notices</h4>
              <div className="table-scroll">
                <table className="crud-table admin-user-detail-table">
                  <thead><tr><th>Notice ID</th><th>Client ID</th><th>Subject</th><th>Defaulter</th><th>Category</th><th>Payment</th><th>Status</th><th>Created</th></tr></thead>
                  <tbody>
                    {selectedNotices.length === 0 ? <tr><td colSpan="8">No assigned notices found.</td></tr> : null}
                    {selectedNotices.map((notice) => (
                      <tr key={notice._id}>
                        <td>{notice.noticeId || "-"}</td>
                        <td>{notice.clientId || "-"}</td>
                        <td>{notice.subject || "-"}</td>
                        <td>{notice.defaulterName || "-"}</td>
                        <td>{notice.category || "-"}</td>
                        <td>{notice.paymentStatus || "-"}</td>
                        <td>{notice.status || "-"}</td>
                        <td>{formatDate(notice.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="detail-section">
              <h4>Document Requests Created</h4>
              <div className="table-scroll">
                <table className="crud-table admin-user-detail-table">
                  <thead><tr><th>Request ID</th><th>Client ID</th><th>Notice ID</th><th>Type</th><th>Message</th><th>Uploaded Files</th><th>Status</th><th>Created</th></tr></thead>
                  <tbody>
                    {selectedRequests.length === 0 ? <tr><td colSpan="8">No document requests found.</td></tr> : null}
                    {selectedRequests.map((request) => (
                      <tr key={request._id}>
                        <td>{request.docId || "-"}</td>
                        <td>{request.clientId || "-"}</td>
                        <td>{request.noticeId || "-"}</td>
                        <td>{request.type || "-"}</td>
                        <td>{request.requestMessage || "-"}</td>
                        <td>
                          {request.responseFiles.length > 0 ? request.responseFiles.map((file, index) => (
                            <span className="detail-file-link" key={`${request._id}-${file}`}>
                              <FileButton fileName={file} label={`File ${index + 1}`} />
                            </span>
                          )) : "-"}
                        </td>
                        <td>{request.status || "-"}</td>
                        <td>{formatDate(request.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="detail-section">
              <h4>Withdrawal Requests</h4>
              <div className="table-scroll">
                <table className="crud-table admin-user-detail-table">
                  <thead><tr><th>Request ID</th><th>Amount</th><th>Bank</th><th>Branch</th><th>Account</th><th>IFSC</th><th>Status</th><th>Admin Remark</th></tr></thead>
                  <tbody>
                    {selectedWithdrawals.length === 0 ? <tr><td colSpan="8">No withdrawal requests found.</td></tr> : null}
                    {selectedWithdrawals.map((withdrawal) => (
                      <tr key={withdrawal._id}>
                        <td>{withdrawal.request_id || "-"}</td>
                        <td>{formatAmount(withdrawal.amount)}</td>
                        <td>{withdrawal.bankName || "-"}</td>
                        <td>{withdrawal.bankBranch || "-"}</td>
                        <td>{withdrawal.bankAccount || "-"}</td>
                        <td>{withdrawal.ifsc || "-"}</td>
                        <td>{withdrawal.status || "-"}</td>
                        <td>{withdrawal.adminRemarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPortalLayout>
  );
};

export default AdminAdvocatesPage;
