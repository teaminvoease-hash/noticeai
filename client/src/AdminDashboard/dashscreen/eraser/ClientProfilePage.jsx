import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import ClientPortalLayout from "./ClientPortalLayout";
import { END_POINT, METHODS, BASE_URL_IMAGE } from "../../../helper/helper";
import { fetchData, FileUpload, ImageUpload } from "../../../helper/ApiCall";
import { userdataUpdate } from "../../../redux/reducers/userReducer";

const ClientProfilePage = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((store) => store.userReducer);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAuthority, setUploadingAuthority] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    authorityLetter: "",
    newPassword: "",
    confirmPassword: "",
  });

  const clientId = useMemo(
    () => userData?._id || userData?.id || userData?.clientId || "",
    [userData]
  );

  const applyProfile = (profile) => {
    setFormData((prev) => ({
      ...prev,
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
      authorityLetter: profile?.authorityLetter || "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  useEffect(() => {
    if (!clientId) return;

    applyProfile(userData || {});

    const loadProfile = async () => {
      setLoading(true);
      try {
        const result = await fetchData(`${END_POINT.ClientPortalGetProfile}${clientId}`, METHODS.GET);
        if (result?.success && result?.data) {
          applyProfile(result.data);
        }
      } catch (error) {
        // Ignore fetch errors and keep local data
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [clientId]);

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAuthorityUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAuthority(true);
    try {
      let uploadResult;
      if (String(file.type).startsWith("image/")) {
        uploadResult = await ImageUpload(file);
      } else {
        uploadResult = await FileUpload(file);
      }

      if (uploadResult?.success) {
        const fileName = uploadResult.fileName || uploadResult.image || "";
        setFormData((prev) => ({ ...prev, authorityLetter: fileName }));
        Swal.fire({
          title: "Uploaded",
          text: "Authority letter uploaded successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Upload Failed",
          text: uploadResult?.message || "Could not upload authority letter",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Upload Failed",
        text: "Could not upload authority letter",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setUploadingAuthority(false);
      event.target.value = "";
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!clientId) {
      Swal.fire({
        title: "Session Missing",
        text: "Please login again as client",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      Swal.fire({
        title: "Missing Information",
        text: "Name and email are required",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!formData.authorityLetter.trim()) {
      Swal.fire({
        title: "Authority Letter Required",
        text: "Please upload authority letter before saving profile",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (formData.newPassword || formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        Swal.fire({
          title: "Password Mismatch",
          text: "New password and confirm password must match",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        authorityLetter: formData.authorityLetter.trim(),
      };

      if (formData.newPassword.trim()) {
        payload.password = formData.newPassword.trim();
      }

      const result = await fetchData(
        `${END_POINT.ClientPortalUpdateProfile}${clientId}`,
        METHODS.POST,
        payload
      );

      if (result?.success) {
        if (result?.data) {
          dispatch(userdataUpdate(result.data));
          applyProfile(result.data);
        }
        Swal.fire({
          title: "Saved",
          text: result.message || "Profile updated successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
      } else {
        Swal.fire({
          title: "Save Failed",
          text: result?.message || "Could not update profile",
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
      setSaving(false);
    }
  };

  return (
    <ClientPortalLayout
      activeKey="profile"
      title="Client Profile"
      subtitle="Edit personal details and upload mandatory Authority Letter."
      actions={<Link className="btn btn-light" to="/client-dashboard">Dashboard</Link>}
      showFooter
    >
      <article className="form-panel">
        <h3>Basic Details</h3>
        <form className="crud-form" onSubmit={handleSave}>
          <label>Full Name</label>
          <input
            type="text"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => handleFieldChange("email", e.target.value)}
          />

          <label>Phone Number</label>
          <input
            type="text"
            placeholder="+91 98XXXXXXXX"
            value={formData.phone}
            onChange={(e) => handleFieldChange("phone", e.target.value)}
          />

          <label>Address</label>
          <textarea
            placeholder="Enter full address"
            value={formData.address}
            onChange={(e) => handleFieldChange("address", e.target.value)}
          />

          <label>City</label>
          <input
            type="text"
            placeholder="Enter city"
            value={formData.city}
            onChange={(e) => handleFieldChange("city", e.target.value)}
          />

          <label>State</label>
          <input
            type="text"
            placeholder="Enter state"
            value={formData.state}
            onChange={(e) => handleFieldChange("state", e.target.value)}
          />

          <label>Pincode</label>
          <input
            type="text"
            placeholder="Enter pincode"
            value={formData.pincode}
            onChange={(e) => handleFieldChange("pincode", e.target.value)}
          />

          <label>New Password</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={formData.newPassword}
            onChange={(e) => handleFieldChange("newPassword", e.target.value)}
          />

          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={(e) => handleFieldChange("confirmPassword", e.target.value)}
          />

          <label>Authority Letter (Mandatory)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleAuthorityUpload}
            disabled={uploadingAuthority}
          />
          {formData.authorityLetter ? (
            <p className="pagination-meta">
              Current file: <a href={`${BASE_URL_IMAGE}${formData.authorityLetter}`} target="_blank" rel="noreferrer">{formData.authorityLetter}</a>
            </p>
          ) : null}

          <div className="crud-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
              {loading ? "Loading..." : saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </article>
    </ClientPortalLayout>
  );
};

export default ClientProfilePage;
