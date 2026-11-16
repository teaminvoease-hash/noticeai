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

const FileButton = ({ fileName, label = "View" }) => {
  if (!fileName) return <span>-</span>;
  return (
    <a className="tiny-btn" href={fileUrl(fileName)} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
};

const AdminUsersPage = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const [clientResult, documentResult, noticeResult] = await Promise.all([
        fetchData(END_POINT.GetClient, METHODS.GET),
        fetchData(END_POINT.ClientPortalGetDocuments, METHODS.GET),
        fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET),
      ]);

      const list = clientResult?.success ? clientResult.data || [] : [];
      setUsers(list);
      setDocuments(documentResult?.success ? documentResult.data || [] : []);
      setNotices(noticeResult?.success ? noticeResult.data || [] : []);

      const draft = {};
      list.forEach((item) => {
        draft[item._id] = String(item.status || "onboard").toLowerCase();
      });
      setStatusDrafts(draft);
    } catch (error) {
      setUsers([]);
      setDocuments([]);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const documentsByClient = useMemo(() => {
    const map = new Map();
    documents.forEach((documentItem) => {
      const key = String(documentItem.clientId || "");
      if (!key) return;
      const list = map.get(key) || [];
      list.push({
        ...documentItem,
        responseFiles: Array.isArray(documentItem.responseFiles) ? documentItem.responseFiles : [],
      });
      map.set(key, list);
    });
    return map;
  }, [documents]);

  const noticesByClient = useMemo(() => {
    const map = new Map();
    notices.forEach((notice) => {
      const key = String(notice.clientId || "");
      if (!key) return;
      const list = map.get(key) || [];
      list.push(notice);
      map.set(key, list);
    });
    return map;
  }, [notices]);

  const getClientDocuments = (clientId) => documentsByClient.get(String(clientId || "")) || [];
  const getClientNotices = (clientId) => noticesByClient.get(String(clientId || "")) || [];

  const getAllDocumentRows = (client) => {
    const rows = [];
    const clientDocs = getClientDocuments(client?._id);
    const clientNotices = getClientNotices(client?._id);

    if (client?.authorityLetter) {
      rows.push({
        id: `authority-${client._id}`,
        source: "Client Profile",
        noticeId: "-",
        type: "Authority Letter",
        files: [client.authorityLetter],
        status: "Uploaded",
        createdAt: client.updatedAt || client.createdAt,
      });
    }

    if (client?.profile_pic) {
      rows.push({
        id: `profile-${client._id}`,
        source: "Client Profile",
        noticeId: "-",
        type: "Profile Picture",
        files: [client.profile_pic],
        status: "Uploaded",
        createdAt: client.updatedAt || client.createdAt,
      });
    }

    clientDocs.forEach((doc) => {
      const files = [doc.fileName, ...doc.responseFiles].filter(Boolean);
      rows.push({
        id: doc._id,
        source: doc.requestedByRole ? `Client Document (${doc.requestedByRole})` : "Client Document",
        noticeId: doc.noticeId || "-",
        type: doc.type || "-",
        files,
        status: doc.status || "-",
        createdAt: doc.createdAt,
        message: doc.requestMessage || "",
      });
    });

    clientNotices.forEach((notice) => {
      if (notice.authorityLetter) {
        rows.push({
          id: `notice-authority-${notice._id}`,
          source: "Notice",
          noticeId: notice.noticeId || "-",
          type: "Notice Authority Letter",
          files: [notice.authorityLetter],
          status: notice.status || "-",
          createdAt: notice.createdAt,
        });
      }
      if (notice.supportingDocument) {
        rows.push({
          id: `notice-support-${notice._id}`,
          source: "Notice",
          noticeId: notice.noticeId || "-",
          type: "Supporting Document",
          files: [notice.supportingDocument],
          status: notice.status || "-",
          createdAt: notice.createdAt,
        });
      }
    });

    return rows;
  };

  const getClientFieldRows = (client) => {
    const primaryRows = [
      ["Database ID", client?._id],
      ["Client ID", client?.client_id],
      ["Name", client?.name],
      ["Owner Name", client?.ownerName],
      ["Company", client?.company],
      ["Contact Person", client?.contact_person],
      ["Email", client?.email],
      ["Phone", client?.phone],
      ["Address", client?.address],
      ["City", client?.city],
      ["State", client?.state],
      ["Pincode", client?.pincode],
      ["Status", client?.status || "onboard"],
      ["Authority Letter", client?.authorityLetter],
      ["Profile Picture", client?.profile_pic],
      ["Created At", formatDate(client?.createdAt)],
      ["Updated At", formatDate(client?.updatedAt)],
    ];

    const knownKeys = new Set([
      "_id",
      "__v",
      "password",
      "client_id",
      "name",
      "ownerName",
      "company",
      "contact_person",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
      "status",
      "authorityLetter",
      "profile_pic",
      "createdAt",
      "updatedAt",
    ]);

    Object.entries(client || {}).forEach(([key, value]) => {
      if (knownKeys.has(key)) return;
      primaryRows.push([key, typeof value === "object" ? JSON.stringify(value) : value]);
    });

    return primaryRows;
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchText.trim().toLowerCase();
      const status = String(user.status || "onboard").toLowerCase();
      const searchable = [
        user.client_id,
        user.name,
        user.email,
        user.phone,
        user.company,
        user.ownerName,
        user.address,
        user.city,
        user.state,
        user.pincode,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;
      return searchable.includes(query);
    });
  }, [users, searchText, statusFilter]);

  const saveStatus = async (userId, nextStatus) => {
    if (!nextStatus) return;
    setStatusDrafts((prev) => ({ ...prev, [userId]: nextStatus }));
    setUpdatingStatusId(userId);

    try {
      const result = await fetchData(`${END_POINT.ClientUpdateStatus}${userId}`, METHODS.POST, {
        status: nextStatus,
      });

      if (result?.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status: nextStatus } : u)));
        Swal.fire({
          title: "Updated",
          text: "Client status updated",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Update Failed",
          text: result?.message || "Could not update status",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not update status",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setUpdatingStatusId("");
    }
  };

  const selectedDocuments = selectedClient ? getAllDocumentRows(selectedClient) : [];
  const selectedNotices = selectedClient ? getClientNotices(selectedClient._id) : [];

  return (
    <AdminPortalLayout activeKey="users" title="Client Display" subtitle="Display all clients, authority letters, and related documents." actions={<><Link className="btn btn-light" to="/admin-users-create">Create Client</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="table-panel admin-users-panel">
        <div className="search-row">
          <input type="text" placeholder="Search by client id, name, email, phone, company" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="onboard">Onboard</option>
            <option value="verified">Verified</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="table-scroll">
          <table className="crud-table admin-users-table">
            <thead>
              <tr>
                <th>Client ID</th>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Authority Letter</th>
                <th>Documents</th>
                <th>Status</th>
                <th>Details</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="10">Loading clients...</td></tr> : null}
              {!loading && filteredUsers.length === 0 ? <tr><td colSpan="10">No clients found</td></tr> : null}
              {!loading && filteredUsers.map((user) => {
                const documentCount = getAllDocumentRows(user).length;

                return (
                  <tr key={user._id}>
                    <td>{user.client_id || "-"}</td>
                    <td>{user.name || "-"}</td>
                    <td>{user.company || "-"}</td>
                    <td>{user.email || "-"}</td>
                    <td>{user.phone || "-"}</td>
                    <td><FileButton fileName={user.authorityLetter} /></td>
                    <td>{documentCount}</td>
                    <td>
                      <select value={statusDrafts[user._id] || "onboard"} onChange={(e) => saveStatus(user._id, e.target.value)} disabled={updatingStatusId === user._id}>
                        <option value="onboard">Onboard</option>
                        <option value="verified">Verified</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td><button className="tiny-btn" type="button" onClick={() => setSelectedClient(user)}>View Details</button></td>
                    <td><Link className="tiny-btn" to={`/admin-users-create?edit=${user._id}`}>&#9998;</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
      <div className="pagination-wrap"><p className="pagination-meta">Showing {filteredUsers.length} of {users.length}</p><div className="pagination"><span className="page-btn active">1</span></div></div>

      {selectedClient ? (
        <div className="detail-modal-backdrop">
          <div className="detail-modal-card">
            <div className="detail-modal-head">
              <div>
                <h3>{selectedClient.name || "Client Details"}</h3>
                <p>{selectedClient.client_id || "-"} | {selectedClient.email || "-"}</p>
              </div>
              <button className="mandatory-modal-close" type="button" onClick={() => setSelectedClient(null)}>x</button>
            </div>

            <div className="detail-section">
              <h4>Client Details</h4>
              <div className="detail-grid">
                {getClientFieldRows(selectedClient).map(([label, value]) => (
                  <div className="detail-item" key={label}>
                    <span>{label}</span>
                    {["Authority Letter", "Profile Picture"].includes(label) && value ? (
                      <FileButton fileName={value} label={value} />
                    ) : (
                      <strong>{value || "-"}</strong>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h4>All Documents</h4>
              <div className="table-scroll">
                <table className="crud-table admin-user-detail-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Notice ID</th>
                      <th>Type</th>
                      <th>Files</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDocuments.length === 0 ? <tr><td colSpan="7">No documents found for this client.</td></tr> : null}
                    {selectedDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.source || "-"}</td>
                        <td>{doc.noticeId || "-"}</td>
                        <td>{doc.type || "-"}</td>
                        <td>
                          {doc.files.length > 0 ? doc.files.map((file, index) => (
                            <span className="detail-file-link" key={`${doc.id}-${file}`}>
                              <FileButton fileName={file} label={`File ${index + 1}`} />
                            </span>
                          )) : "-"}
                        </td>
                        <td>{doc.status || "-"}</td>
                        <td>{formatDate(doc.createdAt)}</td>
                        <td>{doc.message || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="detail-section">
              <h4>Client Notices</h4>
              <div className="table-scroll">
                <table className="crud-table admin-user-detail-table">
                  <thead>
                    <tr>
                      <th>Notice ID</th>
                      <th>Subject</th>
                      <th>Defaulter</th>
                      <th>Category</th>
                      <th>Payment</th>
                      <th>Draft</th>
                      <th>Signed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNotices.length === 0 ? <tr><td colSpan="8">No notices found for this client.</td></tr> : null}
                    {selectedNotices.map((notice) => (
                      <tr key={notice._id}>
                        <td>{notice.noticeId || "-"}</td>
                        <td>{notice.subject || "-"}</td>
                        <td>{notice.defaulterName || "-"}</td>
                        <td>{notice.category || "-"}</td>
                        <td>{notice.paymentStatus || "-"}</td>
                        <td>{notice.draftStatus || "-"}</td>
                        <td>{notice.signedNoticeStatus || "-"}</td>
                        <td>{notice.status || "-"}</td>
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

export default AdminUsersPage;
