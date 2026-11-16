import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";

const AdminTemplatesPage = () => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await fetchData(END_POINT.GetTemplate, METHODS.GET);
      if (result?.success) {
        setTemplates(result.data || []);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      const query = searchText.trim().toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const status = String(item.status || "").toLowerCase();
      const version = String(item.version || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (categoryFilter.trim() && !category.includes(categoryFilter.trim().toLowerCase())) return false;
      if (!query) return true;
      return name.includes(query) || category.includes(query) || version.includes(query);
    });
  }, [templates, searchText, categoryFilter, statusFilter]);

  return (
    <AdminPortalLayout activeKey="templates" title="Templates Display" subtitle="Display legal notice templates used for AI-based draft generation." actions={<><Link className="btn btn-light" to="/admin-templates-create">Create Template</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="table-panel">
        <div className="search-row">
          <input type="text" placeholder="Search by template, category, version" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <input type="text" placeholder="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="table-scroll">
          <table className="crud-table">
            <thead><tr><th>Template ID</th><th>Name</th><th>Category</th><th>Version</th><th>Status</th><th>Last Updated</th><th>Edit</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7">Loading templates...</td></tr> : null}
              {!loading && filteredTemplates.length === 0 ? <tr><td colSpan="7">No templates found</td></tr> : null}
              {!loading && filteredTemplates.map((item) => (
                <tr key={item._id}>
                  <td>{item.template_id || "-"}</td>
                  <td>{item.name || "-"}</td>
                  <td>{item.category || "-"}</td>
                  <td>{item.version || "v1.0"}</td>
                  <td>{String(item.status || "").toLowerCase() === "active" ? "Active" : "Inactive"}</td>
                  <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-"}</td>
                  <td><Link className="tiny-btn" to={`/admin-templates-create?edit=${item._id}`}>&#9998;</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className="pagination-wrap"><p className="pagination-meta">Showing {filteredTemplates.length} of {templates.length}</p><div className="pagination"><span className="page-btn active">1</span></div></div>
    </AdminPortalLayout>
  );
};

export default AdminTemplatesPage;
