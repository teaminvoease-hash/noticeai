import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const AdminNoticesPage = () => {
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [assigningNotice, setAssigningNotice] = useState(null);
  const [selectedLawyerId, setSelectedLawyerId] = useState("");
  const [assigningLawyer, setAssigningLawyer] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const noticeStatuses = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "verified", label: "Verified" },
  ];

  const normalizeNoticeStatus = (value) => {
    const status = String(value || "pending").toLowerCase();
    return status === "uploaded" ? "approved" : status;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [noticeResult, clientResult, lawyerResult, paymentResult] = await Promise.all([
        fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET),
        fetchData(END_POINT.GetClient, METHODS.GET),
        fetchData(END_POINT.GetLawyer, METHODS.GET),
        fetchData(END_POINT.ClientPortalGetPayments, METHODS.GET),
      ]);

      const noticeList = noticeResult?.success ? noticeResult.data || [] : [];
      setNotices(noticeList);
      setClients(clientResult?.success ? clientResult.data || [] : []);
      setLawyers(lawyerResult?.success ? lawyerResult.data || [] : []);
      setClientPayments(paymentResult?.success ? paymentResult.data || [] : []);
      const draft = {};
      noticeList.forEach((item) => {
        draft[item._id] = normalizeNoticeStatus(item.status);
      });
      setStatusDrafts(draft);
    } catch (error) {
      setNotices([]);
      setClientPayments([]);
      setClients([]);
      setLawyers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clientMap = useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      map.set(String(client._id), client);
    });
    return map;
  }, [clients]);

  const lawyerMap = useMemo(() => {
    const map = new Map();
    lawyers.forEach((l) => map.set(String(l._id), l));
    return map;
  }, [lawyers]);

  const paymentMap = useMemo(() => {
    const map = new Map();
    clientPayments.forEach((payment) => {
      const key = String(payment.noticeId || "");
      if (key && !map.has(key)) {
        map.set(key, payment);
      }
    });
    return map;
  }, [clientPayments]);

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "-";
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) return "-";
    return `Rs. ${numericAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const enrichedNotices = useMemo(() => {
    return notices.map((item) => {
      const client = clientMap.get(String(item.clientId));
      const payment = paymentMap.get(String(item.noticeId || ""));
      const isPaid = Boolean(payment) || String(item.paymentStatus || "").toLowerCase() === "paid";
      return {
        ...item,
        clientName: client?.name || "-",
        clientCode: client?.client_id || "-",
        payment,
        paymentLabel: isPaid ? "Paid" : "Not Paid",
        paymentAmount: payment?.amount,
      };
    });
  }, [notices, clientMap, paymentMap]);

  const categories = useMemo(() => {
    const values = new Set(enrichedNotices.map((item) => item.category).filter(Boolean));
    return ["all", ...Array.from(values)];
  }, [enrichedNotices]);

  const counts = useMemo(() => {
    const c = { all: enrichedNotices.length, pending: 0, approved: 0, rejected: 0, verified: 0 };
    enrichedNotices.forEach((item) => {
      const status = String(item.status || "").toLowerCase();
      const normalizedStatus = normalizeNoticeStatus(status);
      if (normalizedStatus === "pending") c.pending += 1;
      if (normalizedStatus === "approved") c.approved += 1;
      if (normalizedStatus === "rejected") c.rejected += 1;
      if (normalizedStatus === "verified") c.verified += 1;
    });
    return c;
  }, [enrichedNotices]);

  const filteredNotices = useMemo(() => {
    return enrichedNotices.filter((item) => {
      const status = normalizeNoticeStatus(item.status);
      const category = String(item.category || "").toLowerCase();
      const paymentLabel = String(item.paymentLabel || "").toLowerCase();
      const paymentAmount = String(item.paymentAmount || "").toLowerCase();
      const query = searchText.trim().toLowerCase();

      if (activeTab !== "all" && status !== activeTab) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (categoryFilter !== "all" && category !== categoryFilter) return false;
      if (paymentFilter !== "all" && paymentFilter !== paymentLabel.replace(/\s+/g, "_")) return false;
      if (!query) return true;

      return (
        String(item.noticeId || "").toLowerCase().includes(query) ||
        String(item.subject || "").toLowerCase().includes(query) ||
        String(item.defaulterName || "").toLowerCase().includes(query) ||
        String(item.clientName || "").toLowerCase().includes(query) ||
        String(item.clientCode || "").toLowerCase().includes(query) ||
        paymentLabel.includes(query) ||
        paymentAmount.includes(query) ||
        category.includes(query) ||
        status.includes(query)
      );
    });
  }, [enrichedNotices, activeTab, statusFilter, categoryFilter, paymentFilter, searchText]);

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatNoticeForDisplay = (value) => {
    const text = String(value || "").trim();
    if (!text) return "No generated notice found.";
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text;
    }

    const normalized = text
      .replace(/\s+(?=(Date:|From:|To:|Subject:|Category:|Sir\/Madam,))/g, "\n")
      .replace(/\s+(?=\d+\.\s)/g, "\n\n")
      .replace(/\s+(?=(Name:|Company:|Address:|Phone:|Email:))/g, "\n")
      .replace(/\s+(?=(Kind Attention:))/g, "\n");

    const blocks = normalized
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
      .join("");
  };

  const buildNoticeOverview = (item) => `
    <div style="background:linear-gradient(180deg, #f8fbff 0%, #ffffff 100%); border:1px solid #d9e4ef; border-radius:16px; padding:18px 18px 10px 18px; margin-bottom:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #d9e4ef;">
        <div>
          <div style="font-size:18px; font-weight:700; color:#12385b;">Notice Overview</div>
          <div style="font-size:13px; color:#5b7088; margin-top:4px;">Client submission details and review context.</div>
        </div>
        <div style="display:inline-flex; align-items:center; justify-content:center; min-width:96px; padding:8px 14px; border-radius:999px; background:#eaf3fb; color:#175c8f; font-size:13px; font-weight:700; text-transform:capitalize;">
          ${escapeHtml(item.status || "Pending")}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1fr); gap:14px 18px;">
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Client Name</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(item.clientName || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Client ID</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(item.clientCode || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Subject</div>
          <div style="font-size:15px; line-height:1.7; color:#102a43;">${escapeHtml(item.subject || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Defaulter</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(item.defaulterName || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Category</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(item.category || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Assigned Lawyer</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(item.lawyerName ? `${item.lawyerName}${item.lawyerCode ? ` (${item.lawyerCode})` : ""}` : "-")}</div>
        </div>
      </div>

      <div style="margin-top:14px; background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:14px 16px;">
        <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:8px;">Recipient Details</div>
        <div style="font-size:15px; line-height:1.8; color:#102a43; white-space:pre-line;">${escapeHtml(item.recipientDetails || "-")}</div>
      </div>

      <div style="margin-top:14px; background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:14px 16px;">
        <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:8px;">Case Summary</div>
        <div style="font-size:15px; line-height:1.85; color:#102a43; text-align:justify;">${escapeHtml(item.caseSummary || "-")}</div>
      </div>
    </div>
  `;

  const buildStyledNoticePreview = (item) => {
    const lawyer = item.lawyerId ? lawyerMap.get(String(item.lawyerId)) : null;
    const isAssigned = Boolean(lawyer);

    // --- HEADER ---
    const headerHtml = isAssigned
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
          <tr>
          <td width="18%" valign="top" style="padding-right:10px;">
              <img src="/assets/logo.svg" alt="Logo" style="max-width:100px; height:auto;" />
            </td>
            
            <td valign="top" style="text-align:left;">
              <h1 style="font-size:20px; margin:0; font-weight:bold; text-transform:uppercase; color:#000;">
                ${escapeHtml(lawyer.firmName || lawyer.name)}
              </h1>
              <p style="margin:3px 0; font-size:15px;"><strong>${escapeHtml(lawyer.designation || "Advocate")}</strong></p>
              ${lawyer.address ? `<p style="margin:3px 0; font-size:15px;">${escapeHtml(lawyer.address)}${lawyer.city ? `, ${escapeHtml(lawyer.city)}` : ""}</p>` : ""}
              ${lawyer.phone ? `<p style="margin:3px 0; font-size:15px;">Phone: ${escapeHtml(lawyer.phone)}</p>` : ""}
              ${lawyer.email ? `<p style="margin:3px 0; font-size:15px;">Email: ${escapeHtml(lawyer.email)}</p>` : ""}
              ${lawyer.enrollmentNo ? `<p style="margin:3px 0; font-size:15px;">Enrollment No: ${escapeHtml(lawyer.enrollmentNo)}</p>` : ""}
              ${lawyer.barId ? `<p style="margin:3px 0; font-size:15px;">Bar Council ID: ${escapeHtml(lawyer.barId)}</p>` : ""}
            </td>
          </tr>
        </table>`
      : `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
          <tr>
            <td width="18%" valign="top" style="padding-right:10px;">
              <img src="/assets/logo.svg" alt="Logo" style="max-width:100px; height:auto;" />
            </td>
            <td width="82%" valign="top" style="text-align:left;">
              <h1 style="font-size:20px; margin:0; font-weight:bold; text-transform:uppercase; color:#000;">Saurav Deep &amp; Associates</h1>
              <p style="margin:3px 0; font-size:15px;"><strong>Advocates &amp; Legal Consultants</strong></p>
              <p style="margin:3px 0; font-size:15px;">Delhi High Court | Tribunals | District Courts</p>
              <p style="margin:3px 0; font-size:15px;">Office: 458/459, 2nd Floor, Aggarwal Chamber-3,<br/>Building No. 26, Veer Savarkar Block, Shakarpur,<br/>New Delhi - 110092</p>
              <p style="margin:3px 0; font-size:15px;">Phone: +91-7042148991 | +91-9990670288</p>
            </td>
          </tr>
        </table>`;

    // --- FOOTER ---
    const footerHtml = isAssigned
      ? `<div style="border-top:1px solid #cbd5e1; margin-top:28px; padding-top:18px;">
          ${lawyer.signatureImage ? `<img src="${BASE_URL_IMAGE}${escapeHtml(lawyer.signatureImage)}" alt="Signature" style="height:70px; margin-bottom:10px;" />` : ""}
          <p style="margin:0; font-size:15px;">Best Regards,</p>
          <p style="margin:4px 0 0 0; font-size:15px;"><strong>${escapeHtml(lawyer.firmName)}</strong></p>
          <p style="margin:2px 0; font-size:15px;">${escapeHtml(lawyer.designation || "Advocate")}</p>
         
  
        </div>`
      : `<div style="border-top:1px solid #cbd5e1; margin-top:28px; padding-top:18px;">
          <img src="" alt="Signature" style="height:70px; margin-bottom:10px;" />
          <p style="margin:0; font-size:15px;">Best Regards,</p>
          <p style="margin:0; font-size:15px;"><strong>Saurav Deep &amp; Associates</strong></p>
          <p style="margin:0; font-size:15px;">Advocates &amp; Legal Consultants</p>
        </div>`;

    return `
      <div style="font-family:'Times New Roman', serif; color:#000; background:#fff; border:1px solid #d7e0ea; border-radius:14px; padding:24px;">
        ${headerHtml}
        <hr style="border:0; border-top:1px solid #000; margin:16px 0;" />
        <div style="text-align:center; font-weight:bold; font-size:16px; margin:18px 0 12px 0; text-transform:uppercase; letter-spacing:0.5px;">
          Legal Notice
        </div>
        <div style="display:flex; justify-content:space-between; gap:16px; font-size:14px; margin-bottom:18px;">
          <div>
            <div><strong>Client:</strong> ${escapeHtml(item.clientName || "-")}</div>
            <div><strong>Defaulter:</strong> ${escapeHtml(item.defaulterName || "-")}</div>
            <div><strong>Subject:</strong> ${escapeHtml(item.subject || "-")}</div>
          </div>
          <div style="text-align:right;">
            <div><strong>Category:</strong> ${escapeHtml(item.category || "-")}</div>
            <div><strong>Status:</strong> ${escapeHtml(item.status || "-")}</div>
            <div><strong>Assigned Lawyer:</strong> ${escapeHtml(item.lawyerName || (isAssigned ? lawyer.name : "-"))}</div>
          </div>
        </div>
        <div style="line-height:1.8; font-size:15px; text-align:justify;">
          ${formatNoticeForDisplay(item.generatedNotice)}
        </div>
        ${footerHtml}
      </div>
    `;
  };

  const handleView = (item) => {
    Swal.fire({
      title: item.noticeId || "Notice Details",
      html: `
        <div style="text-align:left">
          ${buildNoticeOverview(item)}
          <div style="font-size:18px; font-weight:700; color:#12385b; margin:2px 0 12px 0;">Generated Notice</div>
          <div style="max-height:560px; overflow:auto;">${buildStyledNoticePreview(item)}</div>
        </div>
      `,
      confirmButtonColor: "#175c8f",
      width: 960,
    });
  };

  const handleStatusChange = async (noticeId, nextStatus) => {
    if (!nextStatus) return;
    setStatusDrafts((prev) => ({ ...prev, [noticeId]: nextStatus }));
    setUpdatingStatusId(noticeId);

    try {
      const result = await fetchData(
        `${END_POINT.ClientPortalUpdateNoticeStatus}${noticeId}/status`,
        METHODS.POST,
        { status: nextStatus }
      );

      if (result?.success) {
        setNotices((prev) => prev.map((item) => (
          item._id === noticeId ? { ...item, status: nextStatus } : item
        )));
        Swal.fire({
          title: "Updated",
          text: "Notice status updated",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Update Failed",
          text: result?.message || "Could not update notice status",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not update notice status",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setUpdatingStatusId("");
    }
  };

  const openAssignModal = (notice) => {
    setAssigningNotice(notice);
    const alreadyAssigned = lawyers.find((item) => String(item._id) === String(notice.lawyerId));
    setSelectedLawyerId(alreadyAssigned?._id || "");
  };

  const closeAssignModal = () => {
    setAssigningNotice(null);
    setSelectedLawyerId("");
    setAssigningLawyer(false);
  };

  const handleAssignLawyer = async () => {
    if (!assigningNotice?._id || !selectedLawyerId) {
      Swal.fire({
        title: "Lawyer Required",
        text: "Please select a lawyer",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setAssigningLawyer(true);
    try {
      const result = await fetchData(
        `${END_POINT.ClientPortalAssignNoticeLawyer}${assigningNotice._id}/assign-lawyer`,
        METHODS.POST,
        { lawyerId: selectedLawyerId }
      );

      if (result?.success && result?.data) {
        setNotices((prev) => prev.map((item) => (
          item._id === assigningNotice._id ? { ...item, ...result.data } : item
        )));
        Swal.fire({
          title: "Assigned",
          text: "Notice assigned to lawyer",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        closeAssignModal();
      } else {
        Swal.fire({
          title: "Assignment Failed",
          text: result?.message || "Could not assign lawyer",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not assign lawyer",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setAssigningLawyer(false);
    }
  };

  return (
    <AdminPortalLayout activeKey="notices" title="Client Notices" subtitle="Display all notices submitted by clients." actions={<><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="table-panel">
        <div className="status-tabs" id="adminNoticeTabs"><button className={`status-tab ${activeTab === "all" ? "active" : ""}`} type="button" onClick={() => setActiveTab("all")}>All <span className="count">{counts.all}</span></button>{noticeStatuses.map((status) => (<button key={status.value} className={`status-tab ${activeTab === status.value ? "active" : ""}`} type="button" onClick={() => setActiveTab(status.value)}>{status.label} <span className="count">{counts[status.value]}</span></button>))}</div>
        <div className="search-row"><input type="text" placeholder="Search by notice, client, defaulter, subject" value={searchText} onChange={(e) => setSearchText(e.target.value)} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Status</option>{noticeStatuses.map((status) => (<option key={status.value} value={status.value}>{status.label}</option>))}</select><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All Categories</option>{categories.filter((item) => item !== "all").map((item) => (<option key={item} value={String(item).toLowerCase()}>{item}</option>))}</select><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}><option value="all">All Payments</option><option value="paid">Paid</option><option value="not_paid">Not Paid</option></select></div>
        <div className="table-scroll"><table className="crud-table"><thead><tr><th>Notice ID</th><th>Client Name</th><th>Client ID</th><th>Subject</th><th>Defaulter</th><th>Assigned Lawyer</th><th>Category</th><th>Document</th><th>Status</th><th>Payment</th><th>Amount</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan="12">Loading notices...</td></tr> : null}{!loading && filteredNotices.length === 0 ? <tr><td colSpan="12">No notices found</td></tr> : null}{!loading && filteredNotices.map((item) => (<tr key={item._id}><td>{item.noticeId || "-"}</td><td>{item.clientName || "-"}</td><td>{item.clientCode || "-"}</td><td>{item.subject || "-"}</td><td>{item.defaulterName || "-"}</td><td>{item.lawyerName ? `${item.lawyerName}${item.lawyerCode ? ` (${item.lawyerCode})` : ""}` : "-"}</td><td>{item.category || "-"}</td><td>{item.supportingDocument ? <a className="tiny-btn" href={`${BASE_URL_IMAGE}${item.supportingDocument}`} target="_blank" rel="noreferrer">View</a> : "-"}</td><td><select value={statusDrafts[item._id] || normalizeNoticeStatus(item.status)} onChange={(e) => handleStatusChange(item._id, e.target.value)} disabled={updatingStatusId === item._id}>{noticeStatuses.map((status) => (<option key={status.value} value={status.value}>{status.label}</option>))}</select></td><td><span className={`status-pill ${item.paymentLabel === "Paid" ? "ok" : "warn"}`}>{item.paymentLabel}</span></td><td className="amount-cell">{formatAmount(item.paymentAmount)}</td><td><button className="tiny-btn" type="button" onClick={() => handleView(item)}>View</button><button className="tiny-btn" type="button" onClick={() => openAssignModal(item)}>Assign</button></td></tr>))}</tbody></table></div>
      </article>
      <div className="pagination-wrap"><p className="pagination-meta">Showing {filteredNotices.length} of {enrichedNotices.length}</p><div className="pagination"><span className="page-btn active">1</span></div></div>
      {assigningNotice ? (
        <div className="mandatory-modal">
          <div className="mandatory-modal-card" style={{ maxWidth: "560px", width: "92%" }}>
            <button className="mandatory-modal-close" type="button" onClick={closeAssignModal}>x</button>
            <div className="mandatory-modal-alert">Assign Notice</div>
            <h3 style={{ marginBottom: "12px" }}>{assigningNotice.noticeId || "Notice"}</h3>
            <p style={{ marginBottom: "18px" }}>Select a lawyer to assign this notice.</p>
            <div style={{ display: "grid", gap: "16px" }}>
              <select
                value={selectedLawyerId}
                onChange={(e) => setSelectedLawyerId(e.target.value)}
                style={{ width: "100%", minHeight: "52px", padding: "0 16px", borderRadius: "14px" }}
              >
                <option value="">Select Lawyer</option>
                {lawyers.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} {item.advocate_id ? `(${item.advocate_id})` : ""}
                  </option>
                ))}
              </select>
              <div style={{ display: "grid", gap: "12px" }}>
                <button className="btn btn-primary" type="button" onClick={handleAssignLawyer} disabled={assigningLawyer} style={{ width: "100%", minHeight: "54px" }}>
                  {assigningLawyer ? "Assigning..." : "Assign Lawyer"}
                </button>
                <button className="btn btn-light" type="button" onClick={closeAssignModal} style={{ width: "100%", minHeight: "54px" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPortalLayout>
  );
};

export default AdminNoticesPage;
