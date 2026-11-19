import ProfessionalNotice from "./ProfessionalNotice";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Files,
  Clock,
  CheckCircle,
  Users,
  Scales,
  ArrowUpRight,
  Plus,
  ArrowRight,
  FolderOpen,
} from "@phosphor-icons/react";
import RoleShell from "./RoleShell";
import { AuthorityPanel, AuthorityQueue } from "../../Authority";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Role, SessionUser, WorkflowMatter } from "@/types/platform";
const labels = [
  "Authority",
  "Payment",
  "Assignment",
  "Review",
  "Signature",
  "Dispatch",
  "Delivery",
  "Delivered",
];
const sections = [
  "authority",
  "payment",
  "assignment",
  "documents",
  "signed",
  "delivery",
  "delivery",
  "timeline",
];
interface AccountSummary {
  _id: string;
  status: string;
}
interface SavedRequest {
  _id: string;
  fields: { subject?: string };
  step: number;
  updatedAt: string;
}
export default function Dashboard({ role }: { role: Role }) {
  const user = useSelector(
    (s: unknown) =>
      (s as { userReducer: { userData: SessionUser | "" } }).userReducer
        .userData,
  );
  const [rows, setRows] = useState<WorkflowMatter[] | null>(null),
    [clients, setClients] = useState<AccountSummary[] | null>(null),
    [advocates, setAdvocates] = useState<AccountSummary[] | null>(null),
    [drafts, setDrafts] = useState<SavedRequest[]>([]),
    [error, setError] = useState(""),
    [filter, setFilter] = useState<"all" | "mine" | "complete">("all");
  async function load() {
    try {
      const matters = await api<WorkflowMatter[]>(
        "/api/client-portal/workflow",
      );
      setRows(matters);
      if (role === "admin") {
        const [c, a] = await Promise.all([
          api<AccountSummary[]>("/api/get-client"),
          api<AccountSummary[]>("/api/get-lawyer"),
        ]);
        setClients(c);
        setAdvocates(a);
      }
      if (role === "client")
        setDrafts(await api<SavedRequest[]>("/api/intake-drafts"));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load the dashboard.",
      );
    }
  }
  useEffect(() => {
    load();
  }, [role]);
  const mine = rows?.filter((n) => n.workflow.owner === role) || [],
    done = rows?.filter((n) => n.workflow.step === 7) || [];
  const counts = useMemo(
    () =>
      labels.map(
        (_, i) => rows?.filter((n) => n.workflow.step === i).length || 0,
      ),
    [rows],
  );
  const shown =
    rows?.filter(
      (n) =>
        filter === "all" ||
        (filter === "mine" && n.workflow.owner === role) ||
        (filter === "complete" && n.workflow.step === 7),
    ) || [];
  const stats =
    role === "admin"
      ? [
          {
            label: "Client accounts",
            value: clients?.length,
            icon: Users,
            to: "/admin-users",
            note: "Registered client records",
          },
          {
            label: "Matters in progress",
            value: rows?.filter((n) => n.workflow.step < 7).length,
            icon: Files,
            to: "#matter-list",
            note: "Before recorded delivery",
          },
          {
            label: "Needs your action",
            value: mine.length,
            icon: Clock,
            to: "#action-queue",
            note: "Owned by administration",
          },
          {
            label: "Advocate applications",
            value: advocates?.filter((a) => a.status === "pending").length,
            icon: Scales,
            to: "/admin-advocates",
            note: "Awaiting account approval",
          },
        ]
      : [
          {
            label: role === "client" ? "Your matters" : "Assigned matters",
            value: rows?.length,
            icon: Files,
            to: "#matter-list",
            note:
              role === "client"
                ? "Requests submitted to the team"
                : "Available to your login",
          },
          {
            label: "Needs your action",
            value: mine.length,
            icon: Clock,
            to: "#action-queue",
            note: "Ready for your next step",
          },
          {
            label: "In professional review",
            value: rows?.filter((n) => n.workflow.step === 3).length,
            icon: Scales,
            to: "#matter-list",
            note: "Draft or document assessment",
          },
          {
            label: "Recorded as delivered",
            value: done.length,
            icon: CheckCircle,
            to: "#matter-list",
            note: "Administrator delivery records",
          },
        ];
  const name = user ? user.name?.split(" ")[0] || "there" : "there";
  return (
    <RoleShell
      role={role}
      activeKey="dashboard"
      title={
        role === "admin" ? "Workspace overview" : `Good to see you, ${name}`
      }
      subtitle={
        role === "admin"
          ? "A clear view of client onboarding, advocate assignments and notice progress."
          : role === "lawyer"
            ? "Your assigned matters, source documents and next review actions."
            : "Your notice requests, supporting records and next steps in one workspace."
      }
      actions={
        role === "client" ? (
          <Button asChild>
            <Link to="/client-notice-submission">
              <Plus />
              Request a notice
            </Link>
          </Button>
        ) : (
          <Button variant="outline" onClick={load}>
            Refresh records
          </Button>
        )
      }
    >
      <div className="modern-dashboard">
        <ProfessionalNotice />
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
        <section className="dashboard-stat-grid" aria-label="Workspace summary">
          {stats.map((stat) => (
            <Card key={stat.label} className="dashboard-stat">
              <div className="flex items-center justify-between gap-3">
                <p>{stat.label}</p>
                <stat.icon size={18} className="text-slate-400" />
              </div>
              <strong>{rows ? (stat.value ?? "—") : "—"}</strong>
              <div className="flex items-center justify-between gap-3">
                <span>{stat.note}</span>
                {stat.to.startsWith("#") ? (
                  <a
                    href={stat.to}
                    aria-label={"View " + stat.label.toLowerCase()}
                  >
                    <ArrowUpRight size={16} />
                  </a>
                ) : (
                  <Link
                    to={stat.to}
                    aria-label={"View " + stat.label.toLowerCase()}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </section>
        <div className="dashboard-main-grid">
          <Card id="action-queue">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Your action queue</CardTitle>
                <Badge>{mine.length} matters</Badge>
              </div>
              <CardDescription>
                The current step and the person responsible are derived from
                saved records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!rows ? (
                <p role="status" className="text-xs text-muted-foreground">
                  Loading matters…
                </p>
              ) : !mine.length ? (
                <div className="dashboard-empty">
                  <CheckCircle size={30} weight="duotone" />
                  <strong>
                    {rows?.length
                      ? "Your matters are with the team"
                      : "No matters waiting on you"}
                  </strong>
                  <p>
                    New work will appear here when a handoff needs your action.
                  </p>
                </div>
              ) : (
                <div className="dashboard-queue">
                  {mine.slice(0, 5).map((n) => (
                    <Link
                      key={n._id}
                      to={
                        "/matters/" +
                        n._id +
                        "#" +
                        (n.workflow.section ||
                          (n.workflow.step === 3 &&
                          !/document/i.test(n.workflow.label)
                            ? "draft"
                            : sections[n.workflow.step]))
                      }
                    >
                      <span className="queue-icon">
                        <FolderOpen size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong>{n.subject}</strong>
                        <small className="block leading-6">
                          {n.workflow.nextAction}
                        </small>
                        <small className="block leading-6">
                          {n.workflow.nextUpdateAt
                            ? "Next update: " +
                              new Date(n.workflow.nextUpdateAt).toLocaleString(
                                "en-IN",
                                { timeZone: "Asia/Kolkata" },
                              ) +
                              " IST"
                            : "Next update not yet scheduled"}
                        </small>
                        <small>
                          {n.noticeId} · {n.workflow.label}
                        </small>
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
                </div>
              )}
              {mine.length > 5 && (
                <a
                  href="#matter-list"
                  onClick={() => setFilter("mine")}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary"
                >
                  View all pending matters
                  <ArrowRight size={15} />
                </a>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Matter progress</CardTitle>
              <CardDescription>
                Current stage distribution across your available matters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="dashboard-stage-bars">
                {labels.map((label, i) => (
                  <div key={label}>
                    <div>
                      <span>{label}</span>
                      <strong>{counts[i]}</strong>
                    </div>
                    <div className="stage-track">
                      <span
                        style={{
                          width:
                            (rows?.length
                              ? (counts[i] / rows.length) * 100
                              : 0) + "%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        {role === "client" && user && (
          <AuthorityPanel clientId={user._id || user.id || ""} compact />
        )}
        {role === "admin" && <AuthorityQueue />}
        {role === "client" && drafts.length > 0 && (
          <Card className="my-6">
            <CardHeader>
              <CardTitle>Continue an unfinished request</CardTitle>
              <CardDescription>
                Your saved requests stay private until you submit them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="dashboard-queue">
                {drafts.slice(0, 3).map((d) => (
                  <Link
                    key={d._id}
                    to={"/client-notice-submission?draft=" + d._id}
                  >
                    <span className="queue-icon">
                      <FileTextIcon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong>{d.fields.subject || "Untitled request"}</strong>
                      <small>
                        Step {d.step + 1} of 5 · saved{" "}
                        {new Date(d.updatedAt).toLocaleDateString("en-IN")}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        <Card id="matter-list" className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Matters at a glance</CardTitle>
                <CardDescription>
                  Open a record for the complete facts, draft history and
                  activity timeline.
                </CardDescription>
              </div>
              <div
                className="dashboard-filter"
                role="group"
                aria-label="Filter matters"
              >
                {(
                  [
                    ["all", "All matters"],
                    ["mine", "Needs me"],
                    ["complete", "Delivered"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!rows ? (
              <p role="status" className="text-xs text-muted-foreground">
                Loading records…
              </p>
            ) : !shown.length ? (
              <div className="dashboard-empty">
                <Files size={30} />
                <strong>No matching matters</strong>
                {role === "client" && (
                  <Link to="/client-notice-submission">
                    Start a notice request →
                  </Link>
                )}
              </div>
            ) : (
              <div className="dashboard-matter-list">
                {shown.slice(0, 30).map((n) => (
                  <Link
                    key={n._id}
                    to={
                      "/matters/" +
                      n._id +
                      "#" +
                      (n.workflow.section || "next-action")
                    }
                  >
                    <div className="dashboard-matter-name">
                      <span>{n.noticeId}</span>
                      <strong>{n.subject}</strong>
                      <small className="block leading-6">
                        {n.workflow.nextAction}
                      </small>
                      <small className="block leading-6">
                        {n.workflow.nextUpdateAt
                          ? "Next update: " +
                            new Date(n.workflow.nextUpdateAt).toLocaleString(
                              "en-IN",
                              { timeZone: "Asia/Kolkata" },
                            ) +
                            " IST"
                          : "Next update not yet scheduled"}
                      </small>
                      {role !== "client" && (
                        <small className="block leading-6">
                          {n.clientName}
                        </small>
                      )}
                    </div>
                    <Badge
                      className={
                        n.workflow.step === 7
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : ""
                      }
                    >
                      {labels[n.workflow.step]}
                    </Badge>
                    <span className="dashboard-owner">
                      {n.workflow.owner
                        ? n.workflow.owner === "lawyer"
                          ? "Advocate"
                          : n.workflow.owner === "admin"
                            ? "Administrator"
                            : "Client"
                        : "Complete"}
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </div>
            )}
            {shown.length > 30 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Showing the latest 30 matters. Use Search matters in the header
                to find another record.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
function FileTextIcon() {
  return <Files size={19} />;
}
