import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";
import ClientPortalLayout from "./ClientPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const DRAFT_WATERMARK = "DRAFT";

const ClientMyNotices = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const clientId = useMemo(
    () => userData?._id || userData?.id || userData?.clientId || "",
    [userData]
  );

  const loadNotices = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const url = `${END_POINT.ClientPortalGetNotices}?clientId=${encodeURIComponent(clientId)}`;
      const result = await fetchData(url, METHODS.GET);
      if (result?.success) {
        setNotices((result.data || []).filter((item) => String(item.clientId) === String(clientId)));
      } else {
        setNotices([]);
      }
    } catch (error) {
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClientPayments = async () => {
    if (!clientId) return;
    try {
      const url = `${END_POINT.ClientPortalGetPayments}?clientId=${encodeURIComponent(clientId)}`;
      const result = await fetchData(url, METHODS.GET);
      if (result?.success) {
        setClientPayments(result.data || []);
      }
    } catch (error) {
      // no-op
    }
  };

  useEffect(() => {
    loadNotices();
    loadClientPayments();
    fetchData(END_POINT.GetLawyer, METHODS.GET).then((r) => {
      if (r?.success) setLawyers(r.data || []);
    }).catch(() => {});
  }, [clientId]);

  const lawyerMap = useMemo(() => {
    const map = new Map();
    lawyers.forEach((l) => map.set(String(l._id), l));
    return map;
  }, [lawyers]);

  const getPaymentForNotice = (noticeId) =>
    clientPayments.find((p) => String(p.noticeId) === String(noticeId));

  const normalizeNoticeStatus = (value) => {
    const status = String(value || "pending").toLowerCase();
    return status === "uploaded" ? "approved" : status;
  };

  const isNoticeApproved = (notice) => {
    const status = normalizeNoticeStatus(notice?.status);
    return status === "approved" || status === "verified";
  };

  const buildDraftWatermarkHtml = (notice) => {
    if (isNoticeApproved(notice)) return "";
    const marks = Array.from({ length: 24 }, (_, index) => (
      `<span style="display:inline-flex; align-items:center; justify-content:center; width:33.333%; height:120px; color:rgba(23, 92, 143, 0.11); font-size:42px; font-weight:800; letter-spacing:8px; transform:rotate(-32deg);">${DRAFT_WATERMARK}</span>`
    ));

    return `
      <div style="position:absolute; inset:0; display:flex; flex-wrap:wrap; align-content:flex-start; pointer-events:none; user-select:none; z-index:0; overflow:hidden;">
        ${marks.join("")}
      </div>
    `;
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "-";
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) return "-";
    return `₹ ${numericAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handlePayLawyer = async (notice) => {
    const result = await Swal.fire({
      title: "Pay to Lawyer",
      text: `Proceed with payment for notice ${notice.noticeId}?`,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#175c8f",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Proceed to Pay",
    });

    if (!result.isConfirmed) return;

    try {
      const payload = {
        noticeId: notice.noticeId,
        clientId: clientId,
        firstname: userData?.name || userData?.ownerName || "Client",
        email: userData?.email || "",
        phone: userData?.phone || "",
      };

      const response = await fetchData(END_POINT.PayuInitiate, METHODS.POST, payload);

      if (!response?.success) {
        Swal.fire({
          title: "Error",
          text: response?.message || "Could not initiate payment. Please try again.",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
        return;
      }

      const { payuUrl, ...formFields } = response.data;

      // Auto-submit hidden form to PayU
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payuUrl;
      Object.entries(formFields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Something went wrong. Please try again.",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    }
  };

  const categories = useMemo(() => {
    const values = new Set(notices.map((n) => n.category).filter(Boolean));
    return ["all", ...Array.from(values)];
  }, [notices]);

  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      const status = String(notice.status || "").toLowerCase();
      const category = String(notice.category || "").toLowerCase();
      const query = searchText.trim().toLowerCase();

      if (activeTab !== "all" && status !== activeTab) return false;
      if (selectedStatus !== "all" && status !== selectedStatus) return false;
      if (selectedCategory !== "all" && category !== selectedCategory) return false;
      if (selectedPaymentStatus !== "all") {
        const paid = clientPayments.some((p) => String(p.noticeId) === String(notice.noticeId));
        if (selectedPaymentStatus === "paid" && !paid) return false;
        if (selectedPaymentStatus === "not_paid" && paid) return false;
      }
      if (!query) return true;

      return (
        String(notice.noticeId || "").toLowerCase().includes(query) ||
        String(notice.subject || "").toLowerCase().includes(query) ||
        String(notice.defaulterName || "").toLowerCase().includes(query) ||
        String(notice.category || "").toLowerCase().includes(query) ||
        status.includes(query)
      );
    });
  }, [notices, activeTab, selectedStatus, selectedCategory, selectedPaymentStatus, searchText, clientPayments]);

  const statusCounts = useMemo(() => {
    const counts = { all: notices.length, pending: 0, uploaded: 0, verified: 0 };
    notices.forEach((notice) => {
      const status = String(notice.status || "").toLowerCase();
      if (status === "pending") counts.pending += 1;
      if (status === "uploaded") counts.uploaded += 1;
      if (status === "verified") counts.verified += 1;
    });
    return counts;
  }, [notices]);

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

  const buildNoticeOverview = (notice) => `
    <div style="background:linear-gradient(180deg, #f8fbff 0%, #ffffff 100%); border:1px solid #d9e4ef; border-radius:16px; padding:18px 18px 10px 18px; margin-bottom:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #d9e4ef;">
        <div>
          <div style="font-size:18px; font-weight:700; color:#12385b;">Notice Overview</div>
          <div style="font-size:13px; color:#5b7088; margin-top:4px;">Your submitted notice details and draft summary.</div>
        </div>
        <div style="display:inline-flex; align-items:center; justify-content:center; min-width:96px; padding:8px 14px; border-radius:999px; background:#eaf3fb; color:#175c8f; font-size:13px; font-weight:700; text-transform:capitalize;">
          ${escapeHtml(notice.status || "Pending")}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1fr); gap:14px 18px;">
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Notice ID</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(notice.noticeId || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Category</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(notice.category || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Subject</div>
          <div style="font-size:15px; line-height:1.7; color:#102a43;">${escapeHtml(notice.subject || "-")}</div>
        </div>
        <div style="background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Defaulter</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(notice.defaulterName || "-")}</div>
        </div>
      </div>

      <div style="margin-top:14px; background:#fff; border:1px solid #e3ebf3; border-radius:12px; padding:14px 16px;">
        <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:8px;">Supporting Document</div>
        <div style="font-size:15px; line-height:1.7; color:#102a43;">${notice.supportingDocument ? "Available" : "-"}</div>
      </div>
    </div>
  `;

  const buildStyledNoticePreview = (notice) => {
    const lawyer = notice.lawyerId ? lawyerMap.get(String(notice.lawyerId)) : null;
    const isAssigned = Boolean(lawyer);
    const firmName = isAssigned ? (lawyer.firmName || lawyer.name) : "Preliminary draft — unassigned";
    const designation = isAssigned ? (lawyer.designation || "Advocate") : "Independent review required";
    const signatureSrc = isAssigned && lawyer.signatureImage
      ? `${BASE_URL_IMAGE}${lawyer.signatureImage}`
      : "";

    const headerDetails = isAssigned ? `
      <p style="margin:3px 0; font-size:15px;"><strong>${escapeHtml(designation)}</strong></p>
      ${lawyer.address ? `<p style="margin:3px 0; font-size:15px;">${escapeHtml(lawyer.address)}${lawyer.city ? `, ${escapeHtml(lawyer.city)}` : ""}</p>` : ""}
      ${lawyer.phone ? `<p style="margin:3px 0; font-size:15px;">Phone: ${escapeHtml(lawyer.phone)}</p>` : ""}
      ${lawyer.email ? `<p style="margin:3px 0; font-size:15px;">Email: ${escapeHtml(lawyer.email)}</p>` : ""}
      ${lawyer.enrollmentNo ? `<p style="margin:3px 0; font-size:15px;">Enrollment No: ${escapeHtml(lawyer.enrollmentNo)}</p>` : ""}
    ` : `
      <p style="margin:3px 0; font-size:15px;"><strong>Advocates &amp; Legal Consultants</strong></p>
      <p style="margin:3px 0; font-size:15px;">Delhi High Court | Tribunals | District Courts</p>
      <p style="margin:3px 0; font-size:15px;">Office: 458/459, 2nd Floor, Aggarwal Chamber-3,<br/>Building No. 26, Veer Savarkar Block, Shakarpur,<br/>New Delhi - 110092</p>
      <p style="margin:3px 0; font-size:15px;">Phone: +91-7042148991 | +91-9990670288</p>
    `;

    return `
    <div style="position:relative; overflow:hidden; font-family:'Times New Roman', serif; color:#000; background:#fff; border:1px solid #d7e0ea; border-radius:14px; padding:24px;">
      ${buildDraftWatermarkHtml(notice)}
      <div style="position:relative; z-index:1;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
          <tr>
            <td width="18%" valign="top" style="padding-right:10px;">
              <img src="/assets/logo.svg" alt="Logo" style="max-width:100px; height:auto;" />
            </td>
            <td width="82%" valign="top" style="text-align:left;">
              <h1 style="font-size:20px; margin:0; font-weight:bold; text-transform:uppercase; color:#000;">${escapeHtml(firmName)}</h1>
              ${headerDetails}
            </td>
          </tr>
        </table>

        <hr style="border:0; border-top:1px solid #000; margin:16px 0;" />

        <div style="text-align:center; font-weight:bold; font-size:16px; margin:18px 0 12px 0; text-transform:uppercase; letter-spacing:0.5px;">
          Legal Notice
        </div>

        <div style="display:flex; justify-content:space-between; gap:16px; font-size:14px; margin-bottom:18px;">
          <div>
            <div><strong>Subject:</strong> ${escapeHtml(notice.subject || "-")}</div>
            <div><strong>Defaulter:</strong> ${escapeHtml(notice.defaulterName || "-")}</div>
          </div>
          <div style="text-align:right;">
            <div><strong>Category:</strong> ${escapeHtml(notice.category || "-")}</div>
            <div><strong>Status:</strong> ${escapeHtml(notice.status || "-")}</div>
          </div>
        </div>

        <div style="line-height:1.8; font-size:15px; text-align:justify;">
          ${formatNoticeForDisplay(notice.generatedNotice)}
        </div>

        <div style="border-top:1px solid #cbd5e1; margin-top:28px; padding-top:18px;">
          <img src="${signatureSrc}" alt="Signature" style="height:70px; margin-bottom:10px;" />
          <p style="margin:0; font-size:15px;">Best Regards,</p>
          <p style="margin:0; font-size:15px;"><strong>${escapeHtml(firmName)}</strong></p>
          <p style="margin:0; font-size:15px;">${escapeHtml(designation)}</p>
        </div>
      </div>
    </div>
  `};

  const getNoticePdfText = (value) => {
    const html = String(value || "").trim();
    if (!html) return "";
    if (!/<[a-z][\s\S]*>/i.test(html)) return html;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html
      .replace(/<\/p>/gi, "</p>\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n");

    return wrapper.textContent.replace(/\n{3,}/g, "\n\n").trim();
  };

  const handleView = (notice) => {
    Swal.fire({
      title: notice.noticeId || "Notice Details",
      html: `
        <div style="text-align:left">
          ${buildNoticeOverview(notice)}
          <div style="font-size:18px; font-weight:700; color:#12385b; margin:2px 0 12px 0;">Generated Notice</div>
          <div style="max-height:560px; overflow:auto;">${buildStyledNoticePreview(notice)}</div>
        </div>
      `,
      width: 960,
      confirmButtonColor: "#175c8f",
    });
  };

  const handleDownloadPdf = (notice) => {
    if (!String(notice.generatedNotice || "").trim()) {
      Swal.fire({
        title: "No Notice Draft",
        text: "Generated notice content is not available for this record.",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;
    const shouldShowDraftWatermark = !isNoticeApproved(notice);

    const drawDraftWatermark = () => {
      if (!shouldShowDraftWatermark) return;

      doc.saveGraphicsState();
      doc.setTextColor(23, 92, 143);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(44);

      const gState = new doc.GState({ opacity: 0.11 });
      doc.setGState(gState);

      for (let rowY = 115; rowY < pageHeight; rowY += 150) {
        for (let colX = 70; colX < pageWidth + 80; colX += 210) {
          doc.text(DRAFT_WATERMARK, colX, rowY, { angle: -32 });
        }
      }

      doc.restoreGraphicsState();
      doc.setTextColor(0, 0, 0);
    };

    drawDraftWatermark();

    const writeLine = (text, options = {}) => {
      const fontSize = options.fontSize || 11;
      const gap = options.gap || 18;
      doc.setFont("helvetica", options.fontStyle || "normal");
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(String(text || ""), pageWidth - margin * 2);

      lines.forEach((line) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          drawDraftWatermark();
          y = margin;
        }
        doc.text(line, margin, y);
        y += gap;
      });
    };

    writeLine(notice.noticeId || "Legal Notice", { fontSize: 16, fontStyle: "bold", gap: 22 });
    writeLine(`Subject: ${notice.subject || "-"}`, { fontStyle: "bold" });
    writeLine(`Category: ${notice.category || "-"}`);
    writeLine(`Defaulter: ${notice.defaulterName || "-"}`);
    writeLine("");
    writeLine(getNoticePdfText(notice.generatedNotice || ""));

    doc.save(`${notice.noticeId || "legal-notice"}.pdf`);
  };

  return (
    <ClientPortalLayout
      activeKey="notices"
      title="My Notices"
      subtitle="Track notice status from submission to signed delivery."
      actions={<><Link className="btn btn-light" to="/client-notice-submission">Request a Notice</Link><Link className="btn btn-light" to="/client-dashboard">Dashboard</Link></>}
    >
      <article className="table-panel client-notices-panel">
        <div className="status-tabs" id="clientNoticeTabs">
          <button className={`status-tab ${activeTab === "all" ? "active" : ""}`} type="button" data-status="all" onClick={() => setActiveTab("all")}>All<span className="count" data-count-for="all">{statusCounts.all}</span></button>
          <button className={`status-tab ${activeTab === "pending" ? "active" : ""}`} type="button" data-status="pending" onClick={() => setActiveTab("pending")}>Pending<span className="count" data-count-for="pending">{statusCounts.pending}</span></button>
          <button className={`status-tab ${activeTab === "uploaded" ? "active" : ""}`} type="button" data-status="uploaded" onClick={() => setActiveTab("uploaded")}>Uploaded<span className="count" data-count-for="uploaded">{statusCounts.uploaded}</span></button>
          <button className={`status-tab ${activeTab === "verified" ? "active" : ""}`} type="button" data-status="verified" onClick={() => setActiveTab("verified")}>Verified<span className="count" data-count-for="verified">{statusCounts.verified}</span></button>
        </div>
        <div className="search-row client-notices-filter-row">
          <input
            type="text"
            placeholder="Search by notice id, subject, defaulter, category"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.filter((c) => c !== "all").map((category) => (
              <option key={category} value={String(category).toLowerCase()}>{category}</option>
            ))}
          </select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="uploaded">Uploaded</option>
            <option value="verified">Verified</option>
          </select>
          <select value={selectedPaymentStatus} onChange={(e) => setSelectedPaymentStatus(e.target.value)}>
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="not_paid">Not Paid</option>
          </select>
        </div>
        <div className="table-scroll client-notices-table-scroll">
          <table className="crud-table client-notices-table">
            <thead>
              <tr><th>Notice ID</th><th>Subject</th><th>Defaulter</th><th>Category</th><th>Document</th><th>Status</th><th>Payment</th><th>Amount</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9">Loading notices...</td></tr>
              ) : null}
              {!loading && filteredNotices.length === 0 ? (
                <tr><td colSpan="9">No notices found</td></tr>
              ) : null}
              {!loading && filteredNotices.map((notice) => {
                const noticePayment = getPaymentForNotice(notice.noticeId);

                return (
                  <tr key={notice._id}>
                    <td>{notice.noticeId}</td>
                    <td>{notice.subject || "-"}</td>
                    <td>{notice.defaulterName || "-"}</td>
                    <td>{notice.category || "-"}</td>
                    <td className="notice-action-cell">
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
                    <td>
                      {noticePayment ? (
                        <button type="button" className="tiny-btn" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>Paid</button>
                      ) : (
                        <button type="button" className="tiny-btn" onClick={() => handlePayLawyer(notice)}>Pay Now</button>
                      )}
                    </td>
                    <td className="amount-cell">{formatAmount(noticePayment?.amount)}</td>
                    <td>
                      <button
                        type="button"
                        className="tiny-btn"
                        onClick={() => handleView(notice)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="tiny-btn"
                        onClick={() => handleDownloadPdf(notice)}
                      >
                        Download
                      </button>
                      <Link
                        className="tiny-btn"
                        to={`/matters/${notice._id}#facts`}
                        state={{ editNotice: notice }}
                      >
                        Open matter
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
      <div className="pagination-wrap">
        <p className="pagination-meta">Showing {filteredNotices.length} of {notices.length}</p>
        <div className="pagination"><span className="page-btn active">1</span><span className="page-btn">2</span><span className="page-btn">3</span><span className="page-btn">...</span><span className="page-btn">16</span></div>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientMyNotices;
