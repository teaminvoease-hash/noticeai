import {signOut} from '../../../session';
import React, { useEffect, useState } from "react";
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

  useEffect(()=>{if(sidebarOpen)document.querySelector('#client-navigation a')?.focus();const close=e=>{if(sidebarOpen&&e.key==='Escape'){setSidebarOpen(false);document.getElementById('menuToggle')?.focus()}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[sidebarOpen]);
  return (
    <div className="dashboard-body"><a className="skip-link" href="#workspace-content">Skip to workspace content</a>
      <main className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`} id="appShell">
        <aside className="app-sidebar" id="client-navigation">
          <div className="brand-wrap">
            <h2>ResolveX</h2>
            <p>Client workspace</p>
          </div>
          <nav className="side-nav" aria-label="Client workspace" onClick={()=>setSidebarOpen(false)}>
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.to} aria-current={activeKey===item.key?"page":undefined}
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

        <button type="button" className="mobile-overlay" id="mobileOverlay" hidden={!sidebarOpen} aria-label="Close navigation" onClick={() => {setSidebarOpen(false);document.getElementById("menuToggle")?.focus()}} />

        <section className="app-main">
          <header className="top-header">
            <div className="header-left">
              <button className="menu-toggle" id="menuToggle" type="button" aria-expanded={sidebarOpen} aria-controls="client-navigation" onClick={() => setSidebarOpen((p) => !p)}>
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

          <div className="app-content admin-module-wrap" id="workspace-content" tabIndex={-1}>{children}</div>
        </section>
      </main>
    </div>
  );
};

export default ClientPortalLayout;
