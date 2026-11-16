import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import ClientPortalLayout from "./ClientPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const ClientDefaultersPage = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [defaulters, setDefaulters] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState("");

  const clientId = useMemo(
    () => userData?._id || userData?.id || userData?.clientId || "",
    [userData]
  );

  useEffect(() => {
    const loadDefaulters = async () => {
      if (!clientId) return;
      setLoading(true);
      try {
        const url = `${END_POINT.ClientPortalGetDefaulters}?clientId=${encodeURIComponent(clientId)}`;
        const result = await fetchData(url, METHODS.GET);
        if (result?.success) {
          setDefaulters(result.data || []);
        } else {
          setDefaulters([]);
        }
      } catch (error) {
        setDefaulters([]);
      } finally {
        setLoading(false);
      }
    };

    loadDefaulters();
  }, [clientId]);

  const companies = useMemo(() => {
    const values = new Set(defaulters.map((item) => item.companyName).filter(Boolean));
    return ["all", ...Array.from(values)];
  }, [defaulters]);

  const filteredDefaulters = useMemo(() => {
    return defaulters.filter((item) => {
      const query = searchText.trim().toLowerCase();
      const name = String(item.name || "").toLowerCase();
      const email = String(item.email || "").toLowerCase();
      const phone = String(item.phone || "").toLowerCase();
      const company = String(item.companyName || "").toLowerCase();
      const defaulterId = String(item.defaulterId || "").toLowerCase();
      const lastInvoiceDate = String(item.lastInvoiceDate || "");

      if (companyFilter !== "all" && company !== companyFilter) return false;
      if (invoiceDateFilter && lastInvoiceDate !== invoiceDateFilter) return false;
      if (!query) return true;

      return (
        defaulterId.includes(query) ||
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        company.includes(query)
      );
    });
  }, [defaulters, searchText, companyFilter, invoiceDateFilter]);

  return (
    <ClientPortalLayout
      activeKey="defaulters"
      title="Recipients"
      subtitle="Display and manage defaulter records created by your client account."
      actions={<><Link className="btn btn-light" to="/client-defaulters-create">Add Recipient</Link><Link className="btn btn-light" to="/client-dashboard">Dashboard</Link></>}
    >
      <article className="table-panel">
        <div className="search-row">
          <input
            type="text"
            placeholder="Search by id, name, email, phone, company"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="all">All Companies</option>
            {companies.filter((item) => item !== "all").map((company) => (
              <option key={company} value={String(company).toLowerCase()}>{company}</option>
            ))}
          </select>
          <input type="date" value={invoiceDateFilter} onChange={(e) => setInvoiceDateFilter(e.target.value)} />
        </div>
        <div className="table-scroll">
          <table className="crud-table">
            <thead>
              <tr><th>Defaulter ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Total Due Amount</th><th>Last Invoice Date</th><th>Edit</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="8">Loading defaulters...</td></tr> : null}
              {!loading && filteredDefaulters.length === 0 ? <tr><td colSpan="8">No defaulters found</td></tr> : null}
              {!loading && filteredDefaulters.map((item) => (
                <tr key={item._id}>
                  <td>{item.defaulterId || "-"}</td>
                  <td>{item.name || "-"}</td>
                  <td>{item.email || "-"}</td>
                  <td>{item.phone || "-"}</td>
                  <td>{item.companyName || "-"}</td>
                  <td>{item.totalDueAmount || 0}</td>
                  <td>{item.lastInvoiceDate || "-"}</td>
                  <td><Link className="tiny-btn" to={`/client-defaulters-create?edit=${item._id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className="pagination-wrap">
        <p className="pagination-meta">Showing {filteredDefaulters.length} of {defaulters.length}</p>
        <div className="pagination"><span className="page-btn active">1</span></div>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientDefaultersPage;
