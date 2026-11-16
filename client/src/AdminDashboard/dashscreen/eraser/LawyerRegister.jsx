import {FileUpload} from '../../../helper/ApiCall';
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { END_POINT, METHODS } from "../../../helper/helper";
import { fetchData } from "../../../helper/ApiCall";
import Swal from "sweetalert2";

const LawyerRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    enrollmentNo: "",
    barId: "",
    city: "",
    email: "",
    password: "",
    confirmPassword: "",
    aadhaarFile: null,
    panFile: null,
    barIdFile: null,
  });
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    if (
      !form.name.trim() ||
      !form.address.trim() ||
      !form.phone.trim() ||
      !form.enrollmentNo.trim() ||
      !form.barId.trim() ||
      !form.city.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.confirmPassword.trim()
    ) {
      Swal.fire({
        title: "Missing Information",
        text: "Please fill all required fields",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (!form.aadhaarFile || !form.panFile || !form.barIdFile) {
      Swal.fire({
        title: "Missing Documents",
        text: "Please upload Aadhaar, PAN, and Bar ID",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      Swal.fire({
        title: "Password Mismatch",
        text: "Password and confirm password must match",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setLoading(true);
    try {
      const uploaded = {};
      for(const k of ['aadhaarFile','panFile','barIdFile']){const result=await FileUpload(form[k]);if(!result.success)throw new Error(result.message);uploaded[k]=result.fileName;}
      const payload = JSON.stringify({
        name: form.name,
        address: form.address,
        phone: form.phone,
        enrollmentNo: form.enrollmentNo,
        barId: form.barId,
        city: form.city,
        email: form.email,
        password: form.password,
        aadhaarFile: uploaded.aadhaarFile,
        panFile: uploaded.panFile,
        barIdFile: uploaded.barIdFile,
        status: "Active",
      });

      const result = await fetchData(END_POINT.LawyerAuthSignup, METHODS.POST, payload);

      if (result.success) {
        Swal.fire({
          title: "Account Created",
          text: result.message || "Lawyer account created successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
          confirmButtonText: "Go to Login",
        }).then((r) => {
          if (r.isConfirmed) {
            navigate("/lawyer-login");
          }
        });
      } else {
        Swal.fire({
          title: "Registration Failed",
          text: result.message || "Unable to create lawyer account",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (err) {
      Swal.fire({
        title: "Error",
        text: "Something went wrong. Please try again.",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleRegister();
  };

  return (
    <div className="auth-body">
      <main className="auth-layout">
        <section className="auth-panel">
          <Link className="back-link" to="/lawyer-login">Back</Link>
          <p className="auth-tag">Lawyer Portal</p>
          <h1 className="auth-title">Lawyer Sign Up</h1>
          <p className="auth-subtitle">Create a lawyer account to review drafts and upload signed notices.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="lawyer-name">Full Name</label>
            <input id="lawyer-name" type="text" placeholder="Enter your full name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />

            <label htmlFor="lawyer-address">Address</label>
            <input id="lawyer-address" type="text" placeholder="Enter full address" value={form.address} onChange={(e) => updateField("address", e.target.value)} required />

            <label htmlFor="lawyer-phone">Phone Number</label>
            <input id="lawyer-phone" type="tel" placeholder="+91 98XXXXXXXX" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />

            <label htmlFor="lawyer-enrollment">Bar Council Enrollment No.</label>
            <input id="lawyer-enrollment" type="text" placeholder="Enrollment number" value={form.enrollmentNo} onChange={(e) => updateField("enrollmentNo", e.target.value)} required />

            <label htmlFor="lawyer-bar-id">Bar ID</label>
            <input id="lawyer-bar-id" type="text" placeholder="Enter Bar ID" value={form.barId} onChange={(e) => updateField("barId", e.target.value)} required />

            <label htmlFor="lawyer-city">City</label>
            <input id="lawyer-city" type="text" placeholder="Enter city" value={form.city} onChange={(e) => updateField("city", e.target.value)} required />

            <label htmlFor="lawyer-signup-email">Email Address</label>
            <input id="lawyer-signup-email" type="email" placeholder="lawyer@platform.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />

            <label htmlFor="lawyer-aadhar-file">Upload Aadhaar</label>
            <input id="lawyer-aadhar-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateField("aadhaarFile", e.target.files?.[0] || null)} required />

            <label htmlFor="lawyer-pan-file">Upload PAN</label>
            <input id="lawyer-pan-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateField("panFile", e.target.files?.[0] || null)} required />

            <label htmlFor="lawyer-bar-id-file">Upload Bar ID</label>
            <input id="lawyer-bar-id-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateField("barIdFile", e.target.files?.[0] || null)} required />

            <label htmlFor="lawyer-signup-password">Password</label>
            <input id="lawyer-signup-password" type="password" placeholder="Create password" value={form.password} onChange={(e) => updateField("password", e.target.value)} required />

            <label htmlFor="lawyer-confirm-password">Confirm Password</label>
            <input id="lawyer-confirm-password" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} required />

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Lawyer Account"}
            </button>
            <p className="switch-text">Already have an account? <Link to="/lawyer-login" className="text-link">Go to Lawyer Login</Link></p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default LawyerRegister;
