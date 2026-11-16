import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { END_POINT, METHODS } from "../../../helper/helper";
import { fetchData } from "../../../helper/ApiCall";
import { useDispatch } from "react-redux";
import { userdataUpdate } from "../../../redux/reducers/userReducer";
import Swal from "sweetalert2";

const LawyerLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Swal.fire({
        title: "Missing Information",
        text: "Please enter both email and password",
        icon: "warning",
        confirmButtonColor: "#175c8f",
        confirmButtonText: "OK",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await fetchData(
        END_POINT.LawyerAuthLogin,
        METHODS.POST,
        JSON.stringify({ email, password })
      );

      if (result.success === true) {
        dispatch(userdataUpdate(result.data));
        navigate("/lawyer-dashboard");
      } else {
        Swal.fire({
          title: "Login Failed",
          text: result.message || "Invalid credentials",
          icon: "error",
          confirmButtonColor: "#175c8f",
          confirmButtonText: "Try Again",
        });
      }
    } catch (err) {
      Swal.fire({
        title: "Error",
        text: "Something went wrong. Please try again.",
        icon: "error",
        confirmButtonColor: "#175c8f",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleLogin();
  };

  return (
    <div className="auth-body">
      <main className="auth-layout"><aside className="auth-story"><Link className="rx-brand" to="/">Resolve<span>X</span><small>BY CREDEND</small></Link><div><p className="eyebrow">YOUR BUSINESS NOTICE WORKSPACE</p><h2>Every matter.<br/>One clear next step.</h2><p>Keep requests, professional review and supporting documents connected.</p><img src="/assets/reference/dashboard-preview.webp" alt="Notice workspace overview"/><ul><li>Structured notice requests</li><li>Role-based access to your work</li><li>Documents and progress in one place</li></ul></div><nav aria-label="Choose your login"><Link to="/client-login">Client</Link><Link to="/lawyer-login">Lawyer</Link><Link to="/admin-login">Admin</Link></nav></aside>
        <section className="auth-panel">
          <Link className="back-link" to="/">Back</Link>
          <p className="auth-tag">Lawyer Portal</p>
          <h1 className="auth-title">Lawyer Login</h1>
          <p className="auth-subtitle">Login to review AI drafts, request documents, and upload signed notices.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="lawyer-email">Email Address</label>
            <input
              id="lawyer-email"
              type="email"
              placeholder="lawyer@platform.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="lawyer-password">Password</label>
            <input
              id="lawyer-password"
              autoComplete="current-password" type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <p className="switch-text">Sessions expire after 24 hours. Contact your administrator for account recovery.</p>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Signing In..." : "Sign In as Lawyer"}
            </button>
            <p className="switch-text">New lawyer? <Link to="/lawyer-signup" className="text-link">Create Account</Link></p>
            <p className="switch-text">Need another portal? <Link to="/client-login" className="text-link">Client</Link> | <Link to="/admin-login" className="text-link">Admin</Link></p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default LawyerLogin;
