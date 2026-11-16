import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Swal from "sweetalert2";
import LawyerPortalLayout from "./LawyerPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const LawyerAssignedNoticesPage = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [clients, setClients] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [editingNotice, setEditingNotice] = useState(null);
  const [editorValue, setEditorValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingNotice, setSendingNotice] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const lawyerId = useMemo(
    () => userData?._id || userData?.id || "",
    [userData]
  );

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

  useEffect(() => {
    const loadData = async () => {
      if (!lawyerId) return;
      setLoading(true);
      try {
        const [noticeResult, clientResult, documentResult, defaulterResult] = await Promise.all([
          fetchData(END_POINT.ClientPortalGetNotices, METHODS.GET),
          fetchData(END_POINT.GetClient, METHODS.GET),
          fetchData(END_POINT.ClientPortalGetDocuments, METHODS.GET),
          fetchData(END_POINT.ClientPortalGetDefaulters, METHODS.GET),
        ]);

        const allNotices = noticeResult?.success ? noticeResult.data || [] : [];
        const assigned = allNotices.filter((item) => String(item.lawyerId || "") === String(lawyerId));
        setNotices(assigned);
        const draft = {};
        assigned.forEach((item) => {
          draft[item._id] = normalizeNoticeStatus(item.status);
        });
        setStatusDrafts(draft);
        setClients(clientResult?.success ? clientResult.data || [] : []);
        setDocuments(documentResult?.success ? documentResult.data || [] : []);
        setDefaulters(defaulterResult?.success ? defaulterResult.data || [] : []);
      } catch (error) {
        setNotices([]);
        setStatusDrafts({});
        setClients([]);
        setDefaulters([]);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [lawyerId]);

  const clientMap = useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      map.set(String(client._id), client);
    });
    return map;
  }, [clients]);

  const categories = useMemo(() => {
    const values = new Set(notices.map((item) => item.category).filter(Boolean));
    return ["all", ...Array.from(values)];
  }, [notices]);

  const defaulterMap = useMemo(() => {
    const map = new Map();
    defaulters.forEach((defaulter) => {
      map.set(String(defaulter._id), defaulter);
    });
    return map;
  }, [defaulters]);

  const filteredNotices = useMemo(() => {
    return notices
      .map((item) => ({
        ...item,
        clientName: clientMap.get(String(item.clientId))?.name || "-",
        clientCode: clientMap.get(String(item.clientId))?.client_id || "-",
      }))
      .filter((item) => {
        const query = searchText.trim().toLowerCase();
        const category = String(item.category || "").toLowerCase();
        const status = normalizeNoticeStatus(item.status);

        if (categoryFilter !== "all" && category !== categoryFilter) return false;
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (!query) return true;

        return (
          String(item.noticeId || "").toLowerCase().includes(query) ||
          String(item.subject || "").toLowerCase().includes(query) ||
          String(item.clientName || "").toLowerCase().includes(query) ||
          String(item.defaulterName || "").toLowerCase().includes(query) ||
          status.includes(query)
        );
      });
  }, [notices, clientMap, searchText, categoryFilter, statusFilter]);

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

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

  const normalizeNoticeBodyForPdf = (value) => {
    const text = getNoticePdfText(value);
    return text
      .replace(/^LEGAL NOTICE\s*/i, "")
      .replace(/^Date:\s*[^\n]+\n*/i, "")
      .trim();
  };

  const loadImageAsDataUrl = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = reject;
      image.src = src;
    });

  const formatNoticeForEditor = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";

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

    const spacer = "<p><br/></p>";

    return blocks
      .map((block) => {
        if (/^LEGAL NOTICE$/i.test(block)) {
          return `<h1>${escapeHtml(block)}</h1>${spacer}`;
        }

        if (/^(Date:|Subject:|Category:)/i.test(block)) {
          return `<p><strong>${escapeHtml(block)}</strong></p>${spacer}`;
        }

        if (/^(From:|To:)/i.test(block)) {
          return `<p><strong>${escapeHtml(block.split("\n")[0])}</strong><br/>${block
            .split("\n")
            .slice(1)
            .map((line) => escapeHtml(line))
            .join("<br/>")}</p>${spacer}`;
        }

        if (/^\d+\.\s/.test(block)) {
          return `${spacer}<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>${spacer}`;
        }

        return `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>${spacer}`;
      })
      .join("");
  };

  // Strip trailing closing/signature block from the notice body so our dynamic footer is the only one shown
  const stripNoticeClosing = (text) => {
    // Match common closing patterns (case-insensitive) and remove from that point onwards
    const closingPattern = /(\n|^)\s*(yours\s+(faithfully|sincerely|truly)|best\s+regards|thanking\s+you|for\s+and\s+on\s+behalf|with\s+regards).*/is;
    return text.replace(closingPattern, "").trim();
  };

  const formatNoticeForPreview = (value) => {
    const text = String(value || "").trim();
    if (!text) return "No generated notice found.";
    if (/<[a-z][\s\S]*>/i.test(text)) {
      // HTML content — strip closing from plain text equivalent not feasible; render as-is
      return text;
    }

    return formatNoticeForEditor(stripNoticeClosing(text));
  };

  const buildStyledNoticePreview = (item) => {
    const body = formatNoticeForPreview(item.generatedNotice);
    const firmName = userData?.firmName || userData?.name || "Saurav Deep & Associates";
    const designation = userData?.designation || "Advocate";
    const signatureImage = userData?.signatureImage ? `${BASE_URL_IMAGE}${userData.signatureImage}` : "";
    return `
      <div style="font-family:'Times New Roman', serif; color:#000; background:#fff; border:1px solid #d7e0ea; border-radius:14px; padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
          <tr>
            <td width="18%" valign="top" style="padding-right:10px;">
              <img src="/assets/logo.svg" alt="Logo" style="max-width:100px; height:auto;" />
            </td>
            <td width="82%" valign="top" style="text-align:left;">
              <h1 style="font-size:20px; margin:0; font-weight:bold; text-transform:uppercase; color:#000;">${escapeHtml(firmName)}</h1>
              <p style="margin:3px 0; font-size:15px;"><strong>${escapeHtml(designation)}</strong></p>
              ${userData?.address ? `<p style="margin:3px 0; font-size:15px;">${escapeHtml(userData.address)}${userData.city ? `, ${escapeHtml(userData.city)}` : ""}</p>` : ""}
              ${userData?.phone ? `<p style="margin:3px 0; font-size:15px;">Phone: ${escapeHtml(userData.phone)}</p>` : ""}
              ${userData?.email ? `<p style="margin:3px 0; font-size:15px;">Email: ${escapeHtml(userData.email)}</p>` : ""}
              ${userData?.enrollmentNo ? `<p style="margin:3px 0; font-size:15px;">Enrollment No: ${escapeHtml(userData.enrollmentNo)}</p>` : ""}
            </td>
          </tr>
        </table>

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
            <div><strong>Assigned Lawyer:</strong> ${escapeHtml(item.lawyerName || "-")}</div>
          </div>
        </div>

        <div style="line-height:1.8; font-size:15px; text-align:justify;">
          ${body}
        </div>

        <div style="border-top:1px solid #cbd5e1; margin-top:28px; padding-top:18px;">
          <img src="${signatureImage}" alt="Signature" style="height:70px; margin-bottom:10px;" />
          <p style="margin:0; font-size:15px;">Best Regards,</p>
          <p style="margin:0; font-size:15px;"><strong>${escapeHtml(firmName)}</strong></p>
          <p style="margin:0; font-size:15px;">${escapeHtml(designation)}</p>
        </div>
      </div>
    `;
  };

  const buildNoticeOverview = (item) => `
    <div style="background:linear-gradient(180deg, #f8fbff 0%, #ffffff 100%); border:1px solid #d9e4ef; border-radius:14px; padding:18px 18px 10px 18px; margin-bottom:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #d9e4ef;">
        <div>
          <div style="font-size:18px; font-weight:700; color:#12385b;">Notice Overview</div>
          <div style="font-size:13px; color:#5b7088; margin-top:4px;">Client case details linked to this assigned notice.</div>
        </div>
        <div style="display:inline-flex; align-items:center; justify-content:center; min-width:96px; padding:8px 14px; border-radius:999px; background:#eaf3fb; color:#175c8f; font-size:13px; font-weight:700; text-transform:capitalize;">
          ${escapeHtml(item.status || "-")}
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
          <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:#6d8298; margin-bottom:6px;">Notice ID</div>
          <div style="font-size:15px; line-height:1.55; color:#102a43;">${escapeHtml(item.noticeId || "-")}</div>
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

  const buildEditNoticeHeader = (item) => {
    const firmName = userData?.firmName || userData?.name || "Saurav Deep & Associates";
    const designation = userData?.designation || "Advocate";
    return `
    <div style="font-family:'Times New Roman', serif; color:#000; background:#fff; padding:20px 24px 12px 24px; border:1px solid #d7e0ea; border-bottom:none; border-radius:14px 14px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
        <tr>
          <td width="18%" valign="top" style="padding-right:10px;">
            <img src="/assets/logo.svg" alt="Logo" style="max-width:100px; height:auto;" />
          </td>
          <td width="82%" valign="top" style="text-align:left;">
            <h1 style="font-size:20px; margin:0; font-weight:bold; text-transform:uppercase; color:#000;">${escapeHtml(firmName)}</h1>
            <p style="margin:3px 0; font-size:15px;"><strong>${escapeHtml(designation)}</strong></p>
            ${userData?.address ? `<p style="margin:3px 0; font-size:15px;">${escapeHtml(userData.address)}${userData.city ? `, ${escapeHtml(userData.city)}` : ""}</p>` : ""}
            ${userData?.phone ? `<p style="margin:3px 0; font-size:15px;">Phone: ${escapeHtml(userData.phone)}</p>` : ""}
            ${userData?.email ? `<p style="margin:3px 0; font-size:15px;">Email: ${escapeHtml(userData.email)}</p>` : ""}
            ${userData?.enrollmentNo ? `<p style="margin:3px 0; font-size:15px;">Enrollment No: ${escapeHtml(userData.enrollmentNo)}</p>` : ""}
          </td>
        </tr>
      </table>

      <hr style="border:0; border-top:1px solid #000; margin:16px 0;" />

      <div style="text-align:center; font-weight:bold; font-size:16px; margin:18px 0 10px 0; text-transform:uppercase; letter-spacing:0.5px;">
        Legal Notice
      </div>

      <div style="display:flex; justify-content:space-between; gap:16px; font-size:14px; margin-bottom:14px;">
        <div>
          <div><strong>Notice ID:</strong> ${escapeHtml(item.noticeId || "-")}</div>
          <div><strong>Client:</strong> ${escapeHtml(item.clientName || "-")}</div>
          <div><strong>Defaulter:</strong> ${escapeHtml(item.defaulterName || "-")}</div>
        </div>
        <div style="text-align:right;">
          <div><strong>Subject:</strong> ${escapeHtml(item.subject || "-")}</div>
          <div><strong>Category:</strong> ${escapeHtml(item.category || "-")}</div>
          <div><strong>Status:</strong> ${escapeHtml(item.status || "-")}</div>
        </div>
      </div>
    </div>
  `};

  const buildEditNoticeFooter = () => {
    const firmName = userData?.firmName || userData?.name || "Saurav Deep & Associates";
    const designation = userData?.designation || "Advocate";
    const signatureImage = userData?.signatureImage ? `${BASE_URL_IMAGE}${userData.signatureImage}` : "";
    return `
    <div style="font-family:'Times New Roman', serif; color:#000; background:#fff; padding:18px 24px 24px 24px; border:1px solid #d7e0ea; border-top:none; border-radius:0 0 14px 14px;">
      <div style="margin-top:22px;">
        <img src="${signatureImage}" alt="Signature" style="height:70px; margin-bottom:10px;" />
        <p style="margin:0; font-size:15px;">Best Regards,</p>
        <p style="margin:0; font-size:15px;"><strong>${escapeHtml(firmName)}</strong></p>
        <p style="margin:0; font-size:15px;">${escapeHtml(designation)}</p>
      </div>
    </div>
  `};

  const handleView = (item) => {
    Swal.fire({
      title: item.noticeId || "Assigned Notice",
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
    if (!noticeId || !nextStatus) return;
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

  const handleViewDocuments = (item) => {
    const relatedDocs = documents.filter((doc) => String(doc.noticeId || "") === String(item.noticeId || ""));
    const rows = [];

    const pushDocumentCard = (label, filePath, tone = "#175c8f") => {
      rows.push(`
        <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:14px 16px; border:1px solid #d9e4ef; border-radius:14px; background:#ffffff; box-shadow:0 8px 22px rgba(15, 23, 42, 0.05); margin-bottom:12px;">
          <div style="min-width:0;">
            <div style="font-size:12px; font-weight:700; letter-spacing:0.7px; text-transform:uppercase; color:#71859b; margin-bottom:6px;">Document</div>
            <div style="font-size:18px; font-weight:700; line-height:1.4; color:#102a43; word-break:break-word;">${escapeHtml(label)}</div>
          </div>
          <a
            href="${BASE_URL_IMAGE}${filePath}"
            target="_blank"
            rel="noreferrer"
            style="display:inline-flex; align-items:center; justify-content:center; min-width:110px; padding:10px 16px; border-radius:999px; background:${tone}; color:#fff; font-size:14px; font-weight:700; text-decoration:none; white-space:nowrap;"
          >
            View File
          </a>
        </div>
      `);
    };

    if (item.authorityLetter) {
      pushDocumentCard("Notice Authority Letter", item.authorityLetter, "#175c8f");
    }

    if (item.supportingDocument) {
      pushDocumentCard("Notice Supporting Document", item.supportingDocument, "#1f7a5c");
    }

    relatedDocs.forEach((doc) => {
      if (String(doc.requestedByRole || "").toLowerCase() === "lawyer") {
        const responseFiles = Array.isArray(doc.responseFiles) ? doc.responseFiles : [];
        responseFiles.forEach((file, index) => {
          pushDocumentCard(`${doc.type || "Requested Document"} ${index + 1}`, file, "#7a4f01");
        });
      } else if (doc.fileName) {
        pushDocumentCard(doc.type || "Client Document", doc.fileName, "#5b4bb7");
      }
    });

    Swal.fire({
      title: `${item.noticeId || "Notice"} Documents`,
      html: `
        <div style="text-align:left;">
          <div style="background:linear-gradient(180deg, #f8fbff 0%, #ffffff 100%); border:1px solid #d9e4ef; border-radius:16px; padding:18px 18px 8px 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #d9e4ef;">
              <div>
                <div style="font-size:18px; font-weight:700; color:#12385b;">Notice Documents</div>
                <div style="font-size:13px; color:#5b7088; margin-top:4px;">All files linked to this notice, including uploaded request documents.</div>
              </div>
              <div style="display:inline-flex; align-items:center; justify-content:center; min-width:96px; padding:8px 14px; border-radius:999px; background:#eaf3fb; color:#175c8f; font-size:13px; font-weight:700;">
                ${rows.length} File${rows.length === 1 ? "" : "s"}
              </div>
            </div>
            <div style="max-height:420px; overflow:auto; padding-right:4px;">
              ${rows.length > 0 ? rows.join("") : `
                <div style="padding:28px 18px; border:1px dashed #c8d6e4; border-radius:14px; background:#fff; text-align:center; color:#60758c;">
                  No client documents available for this notice.
                </div>
              `}
            </div>
          </div>
        </div>
      `,
      width: 860,
      confirmButtonColor: "#175c8f",
    });
  };

  const handleDownloadPdf = async (item) => {
    if (!String(item.generatedNotice || "").trim()) {
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
    const bodyText = normalizeNoticeBodyForPdf(stripNoticeClosing(item.generatedNotice || ""));

    const pdfFirmName = (userData?.firmName || userData?.name || "Saurav Deep & Associates").toUpperCase();
    const pdfDesignation = userData?.designation || "Advocate";

    const drawHeader = (logoDataUrl) => {
      y = margin;

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", margin, y, 70, 70);
      }

      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.text(pdfFirmName, margin + 90, y + 12);

      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text(pdfDesignation, margin + 90, y + 30);

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      let pdfY = y + 46;
      if (userData?.address) { doc.text(userData.address + (userData.city ? `, ${userData.city}` : ""), margin + 90, pdfY); pdfY += 16; }
      if (userData?.phone) { doc.text(`Phone: ${userData.phone}`, margin + 90, pdfY); pdfY += 16; }
      if (userData?.email) { doc.text(`Email: ${userData.email}`, margin + 90, pdfY); pdfY += 16; }
      if (userData?.enrollmentNo) { doc.text(`Enrollment No: ${userData.enrollmentNo}`, margin + 90, pdfY); pdfY += 16; }

      y = Math.max(y + 120, pdfY + 10);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;

      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.text("LEGAL NOTICE", pageWidth / 2, y, { align: "center" });
      y += 22;

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin, y, { align: "right" });
      y += 26;
    };

    const FOOTER_HEIGHT = 110; // space needed for footer content

    const drawFooter = (signatureDataUrl) => {
      // If footer doesn't fit on current page, add a new page
      if (y + FOOTER_HEIGHT > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      let footerY = y + 20; // small gap after content
      doc.setLineWidth(0.6);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      footerY += 14;

      if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, "PNG", margin, footerY, 110, 42);
      }

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text("Best Regards,", margin, footerY + 54);
      doc.setFont("times", "bold");
      doc.text(pdfFirmName, margin, footerY + 70);
      doc.setFont("times", "normal");
      doc.text(pdfDesignation, margin, footerY + 84);
    };

    const writeLine = (text, options = {}) => {
      const fontSize = options.fontSize || 11;
      const gap = options.gap || 18;
      doc.setFont("helvetica", options.fontStyle || "normal");
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(String(text || ""), pageWidth - margin * 2);

      lines.forEach((line) => {
        if (y > pageHeight - margin - FOOTER_HEIGHT - 20) {
          doc.addPage();
          drawHeader(logoDataUrl);
        }
        doc.text(line, margin, y);
        y += gap;
      });
    };

    let logoDataUrl = "";
    let signatureDataUrl = "";
    try {
      [logoDataUrl, signatureDataUrl] = await Promise.all([
        loadImageAsDataUrl("/assets/logo.svg"),
        loadImageAsDataUrl(userData?.signatureImage ? `${BASE_URL_IMAGE}${userData.signatureImage}` : ""),
      ]);
    } catch (error) {
      logoDataUrl = "";
      signatureDataUrl = "";
    }

    drawHeader(logoDataUrl);
    writeLine(bodyText, { gap: 17 });
    drawFooter(signatureDataUrl);

    doc.save(`${item.noticeId || "legal-notice"}.pdf`);
  };

  const handleOpenEditModal = (item) => {
    setEditingNotice(item);
    setEditorValue(formatNoticeForEditor(item.generatedNotice || ""));
  };

  const handleOpenSendModal = (item) => {
    const defaulter = defaulterMap.get(String(item.defaulterId || ""));
    setSendingNotice({
      ...item,
      defaulterEmail: defaulter?.email || "",
    });
  };

  const handleSendNoticeEmail = async () => {
    if (!sendingNotice?._id) return;
    if (!String(sendingNotice.defaulterEmail || "").trim()) {
      Swal.fire({
        title: "Defaulter Email Missing",
        text: "This notice does not have a defaulter email available.",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const result = await fetchData(
        `${END_POINT.ClientPortalSendNoticeEmail}${sendingNotice._id}/send-email`,
        METHODS.POST,
        { lawyerId }
      );

      if (result?.success) {
        Swal.fire({
          title: "Email Sent",
          text: result?.message || "Notice email sent successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        setSendingNotice(null);
      } else {
        Swal.fire({
          title: "Send Failed",
          text: result?.message || "Could not send notice email",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Send Failed",
        text: "Could not send notice email",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSaveEditedNotice = async () => {
    if (!editingNotice?._id) return;
    if (!String(editorValue || "").trim()) {
      Swal.fire({
        title: "Notice Required",
        text: "Generated notice content cannot be empty",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSavingEdit(true);
    try {
      const result = await fetchData(
        `${END_POINT.ClientPortalUpdateGeneratedNotice}${editingNotice._id}/generated-notice`,
        METHODS.POST,
        {
          lawyerId,
          generatedNotice: editorValue,
        }
      );

      if (result?.success) {
        setNotices((prev) =>
          prev.map((notice) =>
            String(notice._id) === String(editingNotice._id)
              ? { ...notice, generatedNotice: editorValue }
              : notice
          )
        );
        Swal.fire({
          title: "Notice Updated",
          text: result?.message || "Generated notice updated successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        setEditingNotice(null);
        setEditorValue("");
      } else {
        Swal.fire({
          title: "Update Failed",
          text: result?.message || "Could not update generated notice",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Update Failed",
        text: "Could not update generated notice",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote"],
      ["link"],
      ["clean"],
    ],
  };

  return (
    <LawyerPortalLayout activeKey="assigned" title="Assigned Notices" subtitle="View notices assigned to your login account." actions={<><Link className="btn btn-light" to="/lawyer-drafts-display">Open Draft Review</Link><Link className="btn btn-light" to="/lawyer-dashboard">Dashboard</Link></>}>
      <article className="table-panel">
        <div className="search-row"><input type="text" placeholder="Search by notice id, client, defaulter, subject" value={searchText} onChange={(e) => setSearchText(e.target.value)} /><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All Categories</option>{categories.filter((item) => item !== "all").map((item) => (<option key={item} value={String(item).toLowerCase()}>{item}</option>))}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Status</option>{noticeStatuses.map((status) => (<option key={status.value} value={status.value}>{status.label}</option>))}</select></div>
        <div className="table-scroll"><table className="crud-table"><thead><tr><th>Notice ID</th><th>Client Name</th><th>Client ID</th><th>Subject</th><th>Defaulter</th><th>Category</th><th>Document</th><th>Status</th><th>Open</th><th>Edit Notice</th><th>Send Email</th></tr></thead><tbody>{loading ? <tr><td colSpan="11">Loading notices...</td></tr> : null}{!loading && filteredNotices.length === 0 ? <tr><td colSpan="11">No assigned notices found</td></tr> : null}{!loading && filteredNotices.map((item) => (<tr key={item._id}><td>{item.noticeId || "-"}</td><td>{item.clientName || "-"}</td><td>{item.clientCode || "-"}</td><td>{item.subject || "-"}</td><td>{item.defaulterName || "-"}</td><td>{item.category || "-"}</td><td><button className="tiny-btn" type="button" onClick={() => handleViewDocuments(item)}>View</button></td><td><select value={statusDrafts[item._id] || normalizeNoticeStatus(item.status)} onChange={(e) => handleStatusChange(item._id, e.target.value)} disabled={updatingStatusId === item._id}>{noticeStatuses.map((status) => (<option key={status.value} value={status.value}>{status.label}</option>))}</select></td><td><button className="tiny-btn" type="button" onClick={() => handleView(item)}>View</button><button className="tiny-btn" type="button" onClick={() => handleDownloadPdf(item)}>Download</button></td><td><button className="tiny-btn" type="button" onClick={() => handleOpenEditModal(item)}>Edit Notice</button></td><td><button className="tiny-btn" type="button" onClick={() => handleOpenSendModal(item)}>Send Email</button></td></tr>))}</tbody></table></div>
      </article>
      <div className="pagination-wrap"><p className="pagination-meta">Showing {filteredNotices.length} of {notices.length}</p><div className="pagination"><span className="page-btn active">1</span></div></div>

      {editingNotice ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div className="form-panel" style={{ width: "min(960px, 94vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3>Edit Generated Notice</h3>
            <p className="pagination-meta">{editingNotice.noticeId || "-"} - {editingNotice.subject || "Notice"}</p>
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(buildEditNoticeHeader(editingNotice)) }} />
            <div style={{ borderLeft: "1px solid #d7e0ea", borderRight: "1px solid #d7e0ea", background: "#fff" }}>
              <ReactQuill theme="snow" value={editorValue} onChange={setEditorValue} modules={quillModules} />
            </div>
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(buildEditNoticeFooter()) }} />
            <div className="crud-actions" style={{ marginTop: "16px" }}>
              <button type="button" className="btn btn-primary" onClick={handleSaveEditedNotice} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Notice"}
              </button>
              <button type="button" className="btn btn-light" onClick={() => { setEditingNotice(null); setEditorValue(""); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sendingNotice ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div className="form-panel" style={{ width: "min(1080px, 95vw)", maxHeight: "92vh", overflowY: "auto" }}>
            <h3>Send Notice Email</h3>
            <p className="pagination-meta">{sendingNotice.noticeId || "-"} - {sendingNotice.subject || "Notice"}</p>

            <div style={{ background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)", border: "1px solid #d9e4ef", borderRadius: "14px", padding: "18px", marginBottom: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "14px 18px" }}>
                <div style={{ background: "#fff", border: "1px solid #e3ebf3", borderRadius: "12px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "#6d8298", marginBottom: "6px" }}>Defaulter Email</div>
                  <div style={{ fontSize: "15px", lineHeight: 1.55, color: "#102a43", wordBreak: "break-word" }}>{sendingNotice.defaulterEmail || "-"}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e3ebf3", borderRadius: "12px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "#6d8298", marginBottom: "6px" }}>Send To</div>
                  <div style={{ fontSize: "15px", lineHeight: 1.55, color: "#102a43" }}>{sendingNotice.defaulterName || "-"}</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "18px", fontWeight: 700, color: "#12385b", margin: "2px 0 12px 0" }}>Notice Email Preview</div>
            <div style={{ maxHeight: "520px", overflow: "auto", marginBottom: "16px" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(buildStyledNoticePreview(sendingNotice)) }} />

            <div className="crud-actions" style={{ marginTop: "16px" }}>
              <button type="button" className="btn btn-primary" onClick={handleSendNoticeEmail} disabled={sendingEmail}>
                {sendingEmail ? "Sending..." : "Send Notice Email"}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setSendingNotice(null)} disabled={sendingEmail}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </LawyerPortalLayout>
  );
};

export default LawyerAssignedNoticesPage;
