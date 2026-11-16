import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import LawyerPortalLayout from "./LawyerPortalLayout";
import { fetchData, ImageUpload } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const LawyerProfilePage = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const lawyerId = userData?._id || userData?.id || "";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    enrollmentNo: "",
    barId: "",
    firmName: "",
    designation: "Advocate",
    signatureImage: "",
  });

  useEffect(() => {
    if (!lawyerId) return;
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchData(END_POINT.GetLawyerById + lawyerId, METHODS.GET);
        if (result?.success && result?.data) {
          const d = result.data;
          setForm({
            name: d.name || "",
            email: d.email || "",
            phone: d.phone || "",
            address: d.address || "",
            city: d.city || "",
            enrollmentNo: d.enrollmentNo || "",
            barId: d.barId || "",
            firmName: d.firmName || "",
            designation: d.designation || "Advocate",
            signatureImage: d.signatureImage || "",
          });
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lawyerId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSignature(true);
    try {
      const result = await ImageUpload(file);
      if (result?.success) {
        const fileName = result.fileName || result.image || "";
        setForm((prev) => ({ ...prev, signatureImage: fileName }));
        Swal.fire({ title: "Uploaded", text: "Signature uploaded successfully.", icon: "success", confirmButtonColor: "#175c8f" });
      } else {
        Swal.fire({ title: "Upload Failed", text: result?.message || "Could not upload signature image.", icon: "error", confirmButtonColor: "#175c8f" });
      }
    } catch {
      Swal.fire({ title: "Upload Failed", text: "Could not upload signature image.", icon: "error", confirmButtonColor: "#175c8f" });
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Swal.fire({ title: "Required", text: "Name is required.", icon: "warning", confirmButtonColor: "#175c8f" });
      return;
    }
    setSaving(true);
    try {
      const result = await fetchData(END_POINT.LawyerUpdateProfile + lawyerId, METHODS.POST, form);
      if (result?.success) {
        Swal.fire({ title: "Saved", text: "Profile updated successfully.", icon: "success", confirmButtonColor: "#175c8f" });
      } else {
        Swal.fire({ title: "Failed", text: result?.message || "Could not save profile.", icon: "error", confirmButtonColor: "#175c8f" });
      }
    } catch {
      Swal.fire({ title: "Error", text: "Something went wrong.", icon: "error", confirmButtonColor: "#175c8f" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LawyerPortalLayout activeKey="profile" title="My Profile" subtitle="Manage your personal and professional details.">
        <p className="pagination-meta">Loading profile...</p>
      </LawyerPortalLayout>
    );
  }

  return (
    <LawyerPortalLayout
      activeKey="profile"
      title="My Profile"
      subtitle="Update your personal details, firm info, and signature used on legal notices."
    >
      <article className="panel" style={{ maxWidth: "100%" }}>
        <h3 style={{ marginBottom: 20 }}>Personal Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 24 }}>
          <div>
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-control" value={form.email} disabled style={{ background: "#f4f7fa", color: "#6d8298" }} />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input className="form-control" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="Mobile number" />
          </div>
          <div>
            <label className="form-label">City</label>
            <input className="form-control" value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="City" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Office / Chamber address" />
          </div>
        </div>

        <h3 style={{ marginBottom: 20 }}>Professional Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 24 }}>
          <div>
            <label className="form-label">Firm / Chamber Name</label>
            <input className="form-control" value={form.firmName} onChange={(e) => handleChange("firmName", e.target.value)} placeholder="e.g. Saurav Deep & Associates" />
          </div>
          <div>
            <label className="form-label">Designation</label>
            <input className="form-control" value={form.designation} onChange={(e) => handleChange("designation", e.target.value)} placeholder="e.g. Advocate, Senior Advocate" />
          </div>
          <div>
            <label className="form-label">Enrollment No.</label>
            <input className="form-control" value={form.enrollmentNo} onChange={(e) => handleChange("enrollmentNo", e.target.value)} placeholder="Bar Council enrollment number" />
          </div>
          <div>
            <label className="form-label">Bar Council ID</label>
            <input className="form-control" value={form.barId} onChange={(e) => handleChange("barId", e.target.value)} placeholder="Bar Council ID" />
          </div>
        </div>

        <h3 style={{ marginBottom: 12 }}>Signature Image</h3>
        <p style={{ fontSize: 13, color: "#5b7088", marginBottom: 12 }}>
          This signature appears on the footer of every legal notice assigned to you.
        </p>
        <div style={{ marginBottom: 24 }}>
          {form.signatureImage && (
            <div style={{ marginBottom: 12 }}>
              <img
                src={`${BASE_URL_IMAGE}${form.signatureImage}`}
                alt="Signature"
                style={{ height: 70, border: "1px solid #d9e4ef", borderRadius: 8, padding: 4, background: "#fff" }}
              />
            </div>
          )}
          <label className="form-label">Upload Signature</label>
          <input type="file" accept="image/*" onChange={handleSignatureUpload} disabled={uploadingSignature} style={{ display: "block" }} />
          {uploadingSignature && <p style={{ fontSize: 13, color: "#175c8f", marginTop: 6 }}>Uploading...</p>}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </article>
    </LawyerPortalLayout>
  );
};

export default LawyerProfilePage;
