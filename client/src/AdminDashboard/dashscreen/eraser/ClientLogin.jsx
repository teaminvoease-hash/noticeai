import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { END_POINT, METHODS } from "../../../helper/helper";
import { fetchData } from "../../../helper/ApiCall";
import { useDispatch } from "react-redux";
import { userdataUpdate } from "../../../redux/reducers/userReducer";
import Swal from "sweetalert2";

const ClientLogin = () => {
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
        END_POINT.ClientAuthLogin,
        METHODS.POST,
        JSON.stringify({ email, password })
      );

      if (result.success === true) {
        dispatch(userdataUpdate(result.data));
        navigate("/client-dashboard");
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
          <p className="auth-tag">Client Portal</p>
          <h1 className="auth-title">Client Login</h1>
          <p className="auth-subtitle">Login to submit legal notices, upload documents, and track progress.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="client-email">Email Address</label>
            <input
              id="client-email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="client-password">Password</label>
            <input
              id="client-password"
              autoComplete="current-password" type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <p className="switch-text">Sessions expire after 24 hours. Contact your administrator for account recovery.</p>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Signing In..." : "Sign In as Client"}
            </button>
            <p className="switch-text">New client? <Link to="/client-signup" className="text-link">Create Account</Link></p>
            <p className="switch-text">Admin access? <Link to="/admin-login" className="text-link">Go to Admin Login</Link></p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default ClientLogin;
