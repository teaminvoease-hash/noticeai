import {signOut} from '../../../session';
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const navItems = [
{key:'signed',label:'Signed uploads',to:'/lawyer-signed-uploads'},
  { key: "dashboard", label: "Dashboard", to: "/lawyer-dashboard" },
  { key: "assigned", label: "Assigned Notices", to: "/lawyer-assigned-notices" },
  { key: "requests", label: "Document Requests", to: "/lawyer-document-requests" },
  { key: "requests-display", label: "Requests Display", to: "/lawyer-document-requests-display" },
  { key: "wallet", label: "Wallet", to: "/lawyer-wallet" },
  { key: "withdrawals", label: "Withdrawal Requests", to: "/lawyer-withdrawal-requests" },
  { key: "profile", label: "My Profile", to: "/lawyer-profile" },
];

const LawyerPortalLayout = ({ activeKey, title, subtitle, actions, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="dashboard-body">
      <main className={`app-shell lawyer-shell ${sidebarOpen ? "sidebar-open" : ""}`} id="appShell">
        <aside className="app-sidebar">
          <div className="brand-wrap">
            <h2>Legal Notice Platform</h2>
            <p>Lawyer Workspace</p>
          </div>
          <nav className="side-nav">
            {navItems.map((item) => (
              <Link key={item.key} to={item.to} className={`side-link ${activeKey === item.key ? "active" : ""}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="mobile-overlay" id="mobileOverlay" onClick={() => setSidebarOpen(false)} />

        <section className="app-main">
          <header className="top-header">
            <div className="header-left">
              <button className="menu-toggle" id="menuToggle" type="button" onClick={() => setSidebarOpen((p) => !p)}>Menu</button>
              <div className="header-title">
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
            </div>
            <div className="header-actions">
              {actions}
              <button className="btn btn-light" onClick={() => signOut("lawyer")}>Logout</button>
              <div className="avatar-chip">LW</div>
            </div>
          </header>

          <div className="app-content admin-module-wrap">{children}</div>
        </section>
      </main>
    </div>
  );
};

export default LawyerPortalLayout;
