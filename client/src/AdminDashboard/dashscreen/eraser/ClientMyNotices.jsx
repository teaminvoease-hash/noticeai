import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import Swal from "sweetalert2";
import ClientPortalLayout from "./ClientPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";



const ClientMyNotices = () => {
 const navigate=useNavigate();
 const handleView=notice=>navigate('/matters/'+notice._id);
 const handleDownloadPdf=notice=>{if(notice.signedFile){window.location.assign('/uploads/'+encodeURIComponent(notice.signedFile));return}if(!String(notice.generatedNotice||'').trim()){Swal.fire({title:'No saved draft',text:'Open the matter to prepare a draft.',icon:'info'});return}window.location.assign('/api/matters/'+notice._id+'/export/pdf')};
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





  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "-";
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) return "-";
    return `₹ ${numericAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handlePayLawyer=notice=>navigate('/matters/'+notice._id+'#payment');

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
