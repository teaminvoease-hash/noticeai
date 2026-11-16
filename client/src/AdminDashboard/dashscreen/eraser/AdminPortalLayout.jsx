import {signOut} from '../../../session';
import React, { useState } from "react";
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

  return (
    <div className="dashboard-body">
      <main className={`app-shell admin-shell ${sidebarOpen ? "sidebar-open" : ""}`} id="appShell">
        <aside className="app-sidebar">
          <div className="brand-wrap">
            <h2>ResolveX</h2>
            <p>Admin Workspace</p>
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
              <button className="btn btn-light" onClick={() => signOut("admin")}>Logout</button>
              <div className="avatar-chip">AD</div>
            </div>
          </header>

          <div className="app-content admin-module-wrap">{children}</div>
        </section>
      </main>
    </div>
  );
};

export default AdminPortalLayout;
