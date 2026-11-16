import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { END_POINT, METHODS } from "../../../helper/helper";
import { fetchData } from "../../../helper/ApiCall";
import { useDispatch } from "react-redux";
import { userdataUpdate } from "../../../redux/reducers/userReducer";
import Swal from "sweetalert2";

const AdminLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const raw = JSON.stringify({ email, password });
      const result = await fetchData(END_POINT.AdminAuthLogin, METHODS.POST, raw);

      if (result.success === true) {
        dispatch(userdataUpdate(result.data));
        navigate("/admin-dashboard");
      } else {
        Swal.fire({
          title: "Wrong",
          text: result.message,
          icon: "error",
          showCancelButton: false,
          confirmButtonColor: "#6366f1",
          confirmButtonText: "Cancel",
        });
      }
    } catch (err) {
      Swal.fire({
        title: "Error",
        text: "Unable to sign in right now. Please try again.",
        icon: "error",
        showCancelButton: false,
        confirmButtonColor: "#6366f1",
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
    <div className="auth-body admin-theme">
      <main className="auth-layout"><aside className="auth-story"><Link className="rx-brand" to="/">Resolve<span>X</span><small>BY CREDEND</small></Link><div><p className="eyebrow">YOUR BUSINESS NOTICE WORKSPACE</p><h2>Every matter.<br/>One clear next step.</h2><p>Keep requests, professional review and supporting documents connected.</p><img src="/assets/reference/dashboard-preview.webp" alt="Notice workspace overview"/><ul><li>Structured notice requests</li><li>Role-based access to your work</li><li>Documents and progress in one place</li></ul></div><nav aria-label="Choose your login"><Link to="/client-login">Client</Link><Link to="/lawyer-login">Lawyer</Link><Link to="/admin-login">Admin</Link></nav></aside>
        <section className="auth-panel">
          <Link className="back-link" to="/">Back</Link>
          <p className="auth-tag">Admin Control Portal</p>
          <h1 className="auth-title">Admin Login</h1>
          <p className="auth-subtitle">Login to manage advocates, pricing, commissions, and platform configuration.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="admin-email">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              placeholder="admin@platform.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              autoComplete="current-password" type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <p className="switch-text">Sessions expire after 24 hours. Contact your administrator for account recovery.</p>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Signing In..." : "Sign In as Admin"}
            </button>
            <p className="switch-text">Client access? <Link to="/client-login" className="text-link">Go to Client Login</Link></p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default AdminLogin;
