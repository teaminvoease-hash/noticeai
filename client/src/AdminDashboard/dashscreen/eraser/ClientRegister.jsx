import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { END_POINT, METHODS } from "../../../helper/helper";
import { fetchData } from "../../../helper/ApiCall";
import Swal from "sweetalert2";

const RegisterClient = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !name.trim() ||
      !ownerName.trim() ||
      !company.trim() ||
      !address.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Swal.fire({
        title: "Missing Information",
        text: "Please fill all fields",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    if (password !== confirmPassword) {
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
      const raw = JSON.stringify({
        name,
        ownerName,
        company,
        address,
        phone,
        email,
        password,
      });
      const result = await fetchData(END_POINT.ClientAuthSignup, METHODS.POST, raw);

      if (result.success) {
        Swal.fire({
          title: "Account Created",
          text: result.message || "Your account has been created successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
          confirmButtonText: "Go to Login",
        }).then((r) => {
          if (r.isConfirmed) {
            navigate("/client-login");
          }
        });
      } else {
        Swal.fire({
          title: "Registration Failed",
          text: result.message || "Unable to create account",
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
      <main className="auth-layout"><aside className="auth-story"><Link className="rx-brand" to="/">Resolve<span>X</span><small>BY CREDEND</small></Link><div><p className="eyebrow">YOUR BUSINESS NOTICE WORKSPACE</p><h2>Every matter.<br/>One clear next step.</h2><p>Keep requests, professional review and supporting documents connected.</p><img src="/assets/reference/dashboard-preview.webp" alt="Notice workspace overview"/><ul><li>Structured notice requests</li><li>Role-based access to your work</li><li>Documents and progress in one place</li></ul></div><nav aria-label="Choose your login"><Link to="/client-login">Client</Link><Link to="/lawyer-login">Lawyer</Link><Link to="/admin-login">Admin</Link></nav></aside>
        <section className="auth-panel">
          <Link className="back-link" to="/client-login">Back</Link>
          <p className="auth-tag">Client Portal</p>
          <h1 className="auth-title">Client Sign Up</h1>
          <p className="auth-subtitle">Create your account to submit legal notices and track workflows.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="client-name">Full Name</label>
            <input
              id="client-name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label htmlFor="client-owner-name">Owner Name</label>
            <input
              id="client-owner-name"
              type="text"
              placeholder="Enter owner name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />

            <label htmlFor="client-company">Company</label>
            <input
              id="client-company"
              type="text"
              placeholder="Enter company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />

            <label htmlFor="client-address">Address</label>
            <input
              id="client-address"
              type="text"
              placeholder="Enter address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <label htmlFor="client-phone">Phone Number</label>
            <input
              id="client-phone"
              type="tel"
              placeholder="+91 98XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <label htmlFor="client-signup-email">Email Id</label>
            <input
              id="client-signup-email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="client-signup-password">Password</label>
            <input
              id="client-signup-password"
              autoComplete="new-password" type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label htmlFor="client-confirm-password">Confirm Password</label>
            <input
              id="client-confirm-password"
              autoComplete="new-password" type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Client Account"}
            </button>
            <p className="switch-text">Already have an account? <Link to="/client-login" className="text-link">Go to Client Login</Link></p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default RegisterClient;
