import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ReactQuill from "react-quill";
import AdminPortalLayout from "./AdminPortalLayout";
import { fetchData } from "../../../helper/ApiCall";
import { END_POINT, METHODS } from "../../../helper/helper";
import "react-quill/dist/quill.snow.css";

const AdminTemplatesCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const quillRef = useRef(null);
  const [formData, setFormData] = useState({
    template_id: "",
    name: "",
    category: "",
    version: "v1.0",
    status: "active",
    body: "",
  });

  const editId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("edit") || "";
  }, [location.search]);
  const isEditMode = Boolean(editId);

  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ["bold", "italic", "underline", "strike", "blockquote"],
          [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
          [{ align: [] }, { color: [] }, { background: [] }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: () => {
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", "image/*");
            input.click();
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const quill = quillRef.current?.getEditor();
                if (!quill) return;
                const range = quill.getSelection(true);
                quill.insertEmbed(range ? range.index : 0, "image", reader.result);
              };
              reader.readAsDataURL(file);
            };
          },
        },
      },
    }),
    []
  );

  useEffect(() => {
    if (!isEditMode) return;

    const loadTemplate = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.GetTemplateById}${editId}`, METHODS.GET);
        if (result?.success && result?.data) {
          const data = result.data;
          setFormData({
            template_id: data.template_id || "",
            name: data.name || "",
            category: data.category || "",
            version: data.version || "v1.0",
            status: String(data.status || "active").toLowerCase(),
            body: data.body || "",
          });
        }
      } catch (error) {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [isEditMode, editId]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category.trim()) {
      Swal.fire({
        title: "Missing Information",
        text: "Template name and category are required",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        version: formData.version.trim() || "v1.0",
        status: formData.status,
        body: formData.body,
      };

      const result = isEditMode
        ? await fetchData(`${END_POINT.UpdateTemplate}${editId}`, METHODS.POST, payload)
        : await fetchData(END_POINT.CreateTemplate, METHODS.POST, payload);

      if (result?.success) {
        Swal.fire({
          title: isEditMode ? "Template Updated" : "Template Created",
          text: isEditMode ? "Template updated successfully" : "Template created successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        navigate("/admin-templates");
      } else {
        Swal.fire({
          title: isEditMode ? "Update Failed" : "Create Failed",
          text: result?.message || "Could not save template",
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
    <AdminPortalLayout activeKey="templates" title={isEditMode ? "Edit Template" : "Create Template"} subtitle="Create legal notice templates for AI draft module." actions={<><Link className="btn btn-light" to="/admin-templates">Templates Display</Link><Link className="btn btn-light" to="/admin-dashboard">Dashboard</Link></>}>
      <article className="form-panel">
        <h3>{isEditMode ? "Template Edit Form" : "Template Create Form"}</h3>
        <form className="crud-form" onSubmit={handleSubmit}>
          {/* <label>Template ID</label>
          <input type="text" value={formData.template_id || "Will be generated automatically"} disabled /> */}

          <label>Template Name</label>
          <input type="text" placeholder="Employment Recovery Notice" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />

          <label>Category</label>
          <input type="text" placeholder="Employment" value={formData.category} onChange={(e) => handleChange("category", e.target.value)} />

          <label>Version</label>
          <input type="text" placeholder="v1.0" value={formData.version} onChange={(e) => handleChange("version", e.target.value)} />

          <label>Status</label>
          <select value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <label>Template Body</label>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={formData.body}
            onChange={(value) => handleChange("body", value)}
            modules={quillModules}
            placeholder="Write template content"
          />

          <br /> <br />

          <div className="crud-actions"><button type="submit" className="btn btn-primary" disabled={loading || submitting}>{loading ? "Loading..." : submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Template" : "Create Template")}</button></div>
        </form>
      </article>
    </AdminPortalLayout>
  );
};

export default AdminTemplatesCreatePage;
