import {signOut} from '../../../session';
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const navItems = [
  {key:'delivery',label:'Delivery Tracking',to:'/client-delivery-tracking'},
  {key:'downloads',label:'Downloads',to:'/client-downloads'},
  {key:'notifications',label:'Notifications',to:'/client-notifications'},
  { key: "dashboard", label: "Dashboard", to: "/client-dashboard" },
  { key: "defaulters", label: "Recipients", to: "/client-defaulters" },
  { key: "createDefaulter", label: "Add Recipient", to: "/client-defaulters-create" },
  { key: "submit", label: "Request a Notice", to: "/client-notice-submission" },
  { key: "notices", label: "My Notices", to: "/client-my-notices" },
  { key: "documents", label: "Documents", to: "/client-documents" },
  { key: "payments", label: "Payments", to: "/client-payments" },
  { key: "profile", label: "Profile", to: "/client-profile" },
];

const ClientPortalLayout = ({ activeKey, title, subtitle, actions, children, showFooter = false }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-body">
      <main className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`} id="appShell">
        <aside className="app-sidebar">
          <div className="brand-wrap">
            <h2>ResolveX</h2>
            <p>Client workspace</p>
          </div>
          <nav className="side-nav">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`side-link ${activeKey === item.key ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {showFooter && (
            <div className="side-footer">
              Authority Letter is mandatory at the beginning. Payment and draft generation remain blocked without it.
            </div>
          )}
        </aside>

        <div className="mobile-overlay" id="mobileOverlay" onClick={() => setSidebarOpen(false)} />

        <section className="app-main">
          <header className="top-header">
            <div className="header-left">
              <button className="menu-toggle" id="menuToggle" type="button" onClick={() => setSidebarOpen((p) => !p)}>
                Menu
              </button>
              <div className="header-title">
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
            </div>
            <div className="header-actions">
              {actions}
              <button className="btn btn-light" onClick={() => signOut("client")}>Logout</button>
              <div className="avatar-chip">CL</div>
            </div>
          </header>

          <div className="app-content admin-module-wrap">{children}</div>
        </section>
      </main>
    </div>
  );
};

export default ClientPortalLayout;
