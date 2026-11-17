import { useHashNavigation } from "@/hooks/useHashNavigation";
import StagingBanner from "./StagingBanner";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Command } from "cmdk";
import {
  House,
  Files,
  Users,
  Scales,
  CreditCard,
  FolderOpen,
  Gear,
  SignOut,
  MagnifyingGlass,
  List,
  ArrowRight,
  Plus,
  Clock,
  Wallet,
  UserCircle,
  PaperPlaneTilt,
  DownloadSimple,
  Bell,
  ShieldCheck,
  FileText,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Role, SessionUser, WorkflowMatter } from "@/types/platform";
import { signOut } from "../../session";
type NavItem = { key: string; label: string; to: string; icon: typeof House };
const nav: Record<Role, NavItem[]> = {
  client: [
    {
      key: "dashboard",
      label: "Overview",
      to: "/client-dashboard",
      icon: House,
    },
    {
      key: "submit",
      label: "Request a notice",
      to: "/client-notice-submission",
      icon: Plus,
    },
    {
      key: "notices",
      label: "My matters",
      to: "/client-my-notices",
      icon: Files,
    },
    {
      key: "documents",
      label: "Documents",
      to: "/client-documents",
      icon: FolderOpen,
    },
    {
      key: "payments",
      label: "Payments",
      to: "/client-payments",
      icon: CreditCard,
    },
    {
      key: "delivery",
      label: "Delivery tracking",
      to: "/client-delivery-tracking",
      icon: PaperPlaneTilt,
    },
    {
      key: "defaulters",
      label: "Recipients",
      to: "/client-defaulters",
      icon: Users,
    },
    {
      key: "createDefaulter",
      label: "Add recipient",
      to: "/client-defaulters-create",
      icon: Plus,
    },
    {
      key: "downloads",
      label: "Downloads",
      to: "/client-downloads",
      icon: DownloadSimple,
    },
    {
      key: "notifications",
      label: "Notifications",
      to: "/client-notifications",
      icon: Bell,
    },
    {
      key: "profile",
      label: "Business profile",
      to: "/client-profile",
      icon: UserCircle,
    },
  ],
  admin: [
    {key:"credentials",label:"Credential checks",to:"/admin-credential-checks",icon:ShieldCheck},
    {
      key: "enquiries",
      label: "Business enquiries",
      to: "/admin-enquiries",
      icon: Bell,
    },
    {
      key: "dashboard",
      label: "Overview",
      to: "/admin-dashboard",
      icon: House,
    },
    {
      key: "notices",
      label: "Matter management",
      to: "/admin-notices",
      icon: Files,
    },
    {
      key: "operations",
      label: "Workflow operations",
      to: "/admin-operations",
      icon: Clock,
    },
    { key: "users", label: "Clients", to: "/admin-users", icon: Users },
    {
      key: "advocates",
      label: "Advocates",
      to: "/admin-advocates",
      icon: Scales,
    },
    {
      key: "documents",
      label: "Documents",
      to: "/admin-documents",
      icon: FolderOpen,
    },
    {
      key: "payments",
      label: "Pricing & payments",
      to: "/admin-payments",
      icon: CreditCard,
    },
    {
      key: "withdrawals",
      label: "Withdrawals",
      to: "/admin-withdrawals",
      icon: Wallet,
    },
    {
      key: "templates",
      label: "Templates",
      to: "/admin-templates",
      icon: FileText,
    },
    {
      key: "integrations",
      label: "Service configuration",
      to: "/admin-integrations",
      icon: Gear,
    },
  ],
  lawyer: [
    {
      key: "dashboard",
      label: "Overview",
      to: "/lawyer-dashboard",
      icon: House,
    },
    {
      key: "assigned",
      label: "Assigned matters",
      to: "/lawyer-assigned-notices",
      icon: Files,
    },
    {
      key: "requests",
      label: "Request documents",
      to: "/lawyer-document-requests",
      icon: FolderOpen,
    },
    {
      key: "requests-display",
      label: "Document responses",
      to: "/lawyer-document-requests-display",
      icon: FileText,
    },
    {
      key: "signed",
      label: "Signed notices",
      to: "/lawyer-signed-uploads",
      icon: ShieldCheck,
    },
    { key: "wallet", label: "Wallet", to: "/lawyer-wallet", icon: Wallet },
    {
      key: "withdrawals",
      label: "Withdrawals",
      to: "/lawyer-withdrawal-requests",
      icon: CreditCard,
    },
    {
      key: "profile",
      label: "Professional profile",
      to: "/lawyer-profile",
      icon: UserCircle,
    },
  ],
};
const roleName: Record<Role, string> = {
  client: "Client workspace",
  admin: "Administration",
  lawyer: "Advocate workspace",
};
interface ShellProps {
  role: Role;
  activeKey?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  showFooter?: boolean;
}
export default function RoleShell({
  role,
  activeKey,
  title,
  subtitle,
  actions,
  children,
}: ShellProps) {
  const user = useSelector(
      (s: unknown) =>
        (s as { userReducer: { userData: SessionUser | "" } }).userReducer
          .userData,
    ),
    navigate = useNavigate();
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [matters, setMatters] = useState<WorkflowMatter[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!search) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    api<WorkflowMatter[]>(
      "/api/client-portal/workflow",
      "GET",
      undefined,
      ctrl.signal,
    )
      .then(setMatters)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [search]);
  const name = user
    ? user.name || user.email || roleName[role]
    : roleName[role];
  function navigation() {
    return (
      <>
        <Link to="/" className="shell-brand" aria-label="ResolveX home">
          <span className="shell-mark">
            <Scales size={23} weight="duotone" />
          </span>
          <span>
            ResolveX<small>NOTICE INTELLIGENCE</small>
          </span>
        </Link>
        <div className="shell-workspace">
          <span className="shell-avatar">{name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{roleName[role]}</strong>
            <small>Secure matter management</small>
          </div>
        </div>
        <p className="shell-label">WORKSPACE</p>
        <nav aria-label={roleName[role]}>
          {nav[role].map((item) => (
            <Link
              key={item.key}
              to={item.to}
              onClick={() => setMobile(false)}
              aria-current={activeKey === item.key ? "page" : undefined}
              className={
                "shell-nav-link " + (activeKey === item.key ? "is-active" : "")
              }
            >
              <item.icon
                size={19}
                weight={activeKey === item.key ? "duotone" : "regular"}
              />
              <span>{item.label}</span>
              {activeKey === item.key && <span className="shell-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="shell-sidebar-footer">
          <ShieldCheck size={18} />
          <span>
            Private records.
            <br />
            Professional review.
          </span>
        </div>
      </>
    );
  }
  useHashNavigation();
  return (
    <div className="workspace-shell">
      <a href="#workspace-content" className="skip-link">
        Skip to workspace content
      </a>
      <aside className="shell-sidebar">{navigation()}</aside>
      <Dialog open={mobile} onOpenChange={setMobile}>
        <DialogContent
          className="shell-mobile-dialog" placement="left"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            mobileTrigger.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Navigate your {roleName[role].toLowerCase()}.
          </DialogDescription>
          {navigation()}
        </DialogContent>
      </Dialog>
      <div className="shell-main">
        <header className="shell-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shell-mobile-toggle"
              ref={mobileTrigger}
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
              aria-label="Open workspace navigation"
            >
              <List size={22} />
            </Button>
            <span className="shell-breadcrumb">
              {roleName[role]}
              <span>/</span>
              <strong>{title || "Overview"}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="shell-search-button"
              onClick={() => setSearch(true)}
              aria-label="Search your matters"
            >
              <MagnifyingGlass />
              <span>Search matters</span>
              <kbd>⌘ K</kbd>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link
                to={
                  role === "client"
                    ? "/client-notifications"
                    : "/" + role + "-dashboard"
                }
                aria-label={
                  role === "client" ? "Open notifications" : "Open work queue"
                }
              >
                <Bell size={20} />
              </Link>
            </Button>
            <span className="shell-avatar" title={name}>
              {name
                .split(" ")
                .slice(0, 2)
                .map((x) => x[0])
                .join("")
                .toUpperCase()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut(role)}
              aria-label="Sign out"
            >
              <SignOut size={19} />
            </Button>
          </div>
        </header>
        <StagingBanner />
        <main id="workspace-content" tabIndex={-1} className="shell-content">
          <div className="shell-page-heading">
            <div>
              <div className="flex items-center gap-2">
                <p className="shell-kicker">RESOLVEX WORKSPACE</p>
                <Badge>
                  {role === "lawyer"
                    ? "Advocate"
                    : role === "admin"
                      ? "Admin"
                      : "Client"}
                </Badge>
              </div>
              <h1>{title || "Overview"}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {actions && <div className="shell-page-actions">{actions}</div>}
          </div>
          <div className="shell-module admin-module-wrap">{children}</div>
          <footer className="shell-content-footer">
            ResolveX by CredEnd{" "}
            <span>
              Technology-assisted preparation · Independent professional
              judgment
            </span>
          </footer>
        </main>
      </div>
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent className="p-0">
          <DialogTitle className="px-5 pt-5 text-lg font-semibold">
            Find a matter
          </DialogTitle>
          <DialogDescription className="px-5 text-sm text-muted-foreground">
            Search the matters available to your login.
          </DialogDescription>
          <Command shouldFilter={false}>
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Notice ID, subject or client name…"
              className="min-h-12 w-full border-y px-5 text-sm outline-none"
              aria-label="Search matters"
            />
            <Command.List className="max-h-80 overflow-y-auto p-2">
              {error && (
                <p role="alert" className="p-4 text-sm text-destructive">
                  {error}
                </p>
              )}
              {loading ? (
                <p role="status" className="p-4 text-sm text-muted-foreground">
                  Loading matters…
                </p>
              ) : (
                <>
                  {matters
                    .filter((n) =>
                      [n.noticeId, n.subject, n.clientName]
                        .join(" ")
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((n) => (
                      <Command.Item
                        key={n._id}
                        value={n._id}
                        onSelect={() => {
                          setSearch(false);
                          navigate("/matters/" + n._id);
                        }}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 text-sm data-[selected=true]:bg-accent"
                      >
                        <Files
                          size={20}
                          className="shrink-0 text-muted-foreground"
                        />
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate">
                            {n.subject}
                          </strong>
                          <span className="text-xs text-muted-foreground">
                            {n.noticeId} · {n.workflow.label}
                          </span>
                        </div>
                        <ArrowRight size={16} />
                      </Command.Item>
                    ))}
                  <Command.Empty className="p-5 text-sm text-muted-foreground">
                    No matching matters.
                  </Command.Empty>
                </>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
