import {signOut} from '../../../session';
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const navItems = [
{key:'templates',label:'Templates',to:'/admin-templates'},
{key:'integrations',label:'Service configuration',to:'/admin-integrations'},
{key:'operations',label:'Workflow operations',to:'/admin-operations'},
  { key: "dashboard", label: "Dashboard", to: "/admin-dashboard" },
  { key: "users", label: "Clients", to: "/admin-users" },
  { key: "advocates", label: "Advocates", to: "/admin-advocates" },
  { key: "notices", label: "Notice Workflow", to: "/admin-notices" },
  { key: "payments", label: "Payments and Fee Split", to: "/admin-payments" },
  { key: "withdrawals", label: "Withdrawals", to: "/admin-withdrawals" },
  { key: "documents", label: "Documents", to: "/admin-documents" },
];

const AdminPortalLayout = ({ activeKey, title, subtitle, actions, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(()=>{if(sidebarOpen)document.querySelector('#admin-navigation a')?.focus();const close=e=>{if(sidebarOpen&&e.key==='Escape'){setSidebarOpen(false);document.getElementById('menuToggle')?.focus()}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[sidebarOpen]);
  return (
    <div className="dashboard-body"><a className="skip-link" href="#workspace-content">Skip to workspace content</a>
      <main className={`app-shell admin-shell ${sidebarOpen ? "sidebar-open" : ""}`} id="appShell">
        <aside className="app-sidebar" id="admin-navigation">
          <div className="brand-wrap">
            <h2>ResolveX</h2>
            <p>Admin Workspace</p>
          </div>
          <nav className="side-nav" aria-label="Admin workspace" onClick={()=>setSidebarOpen(false)}>
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
        </aside>

        <button type="button" className="mobile-overlay" id="mobileOverlay" hidden={!sidebarOpen} aria-label="Close navigation" onClick={() => {setSidebarOpen(false);document.getElementById("menuToggle")?.focus()}} />

        <section className="app-main">
          <header className="top-header">
            <div className="header-left">
              <button className="menu-toggle" id="menuToggle" type="button" aria-expanded={sidebarOpen} aria-controls="admin-navigation" onClick={() => setSidebarOpen((p) => !p)}>Menu</button>
              <div className="header-title">
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
            </div>
            <div className="header-actions">
              {actions}
              <button className="btn btn-light" onClick={() => signOut("admin")}>Logout</button>
              <div className="avatar-chip">AD</div>
            </div>
          </header>

          <div className="app-content admin-module-wrap" id="workspace-content" tabIndex={-1}>{children}</div>
        </section>
      </main>
    </div>
  );
};

export default AdminPortalLayout;
