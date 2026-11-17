import ProfessionalNotice from "@/components/platform/ProfessionalNotice";
import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import PublicLayout from "@/components/platform/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import policies from "@/data/policies.json";
import AdminLayout from "./AdminDashboard/dashscreen/eraser/AdminPortalLayout";
export function LegalPage() {
  const { policy = "" } = useParams();
  const item = policies[policy as keyof typeof policies];
  return (
    <PublicLayout>
      <main className="premium-section">
        <ProfessionalNotice />
        {policy === "compliance" && (
          <section className="professional-policy">
            <h1>Mandatory professional review and platform boundaries</h1>
            <p>
              Every notice must be vetted and checked by the assigned advocate.
              Necessary corrections and updates, reasoned review notes and
              approval of the exact saved draft are mandatory before signature
              or issuance. These are platform safeguards; they are not a
              representation that BCI has approved the platform or its
              commercial model.
            </p>
            <p>
              Administrator authority-letter checks, payment, AI generation and
              an active login do not substitute for independent professional
              review. Practising credentials must be checked against the
              relevant State Bar Council and applicable supporting requirements.
              No account or form submission by itself confirms an
              advocate–client engagement.
            </p>
            <p>
              Advocates retain control over conflicts, client instructions,
              confidentiality, applicable law and deadlines, engagement scope
              and the appropriate communication route, including represented
              counterparties. No advocate rankings, success-rate claims,
              guaranteed outcomes or outcome-based fees are offered.
            </p>
            <p>
              BCI restrictions on advertising/solicitation, unauthorised
              practice and arrangements for sharing remuneration with
              non-advocates require separate assessment of the actual operator,
              public website, engagement and payment arrangements. Calling a
              payment a “platform fee” does not decide its lawfulness. New
              production financial processing stays paused until independent
              legal review is recorded in deployment configuration; existing
              records and callbacks remain available.
            </p>
            <p>
              Sources:{" "}
              <a
                href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2043470"
                target="_blank"
                rel="noreferrer"
              >
                Ministry of Law and Justice: online legal services
              </a>
              ;{" "}
              <a
                href="https://ksbc.org.in/advo_act64.php"
                target="_blank"
                rel="noreferrer"
              >
                BCI Rules: professional conduct
              </a>
              ;{" "}
              <a
                href="https://ksbc.org.in/advo_act68.php"
                target="_blank"
                rel="noreferrer"
              >
                Conditions for right to practise
              </a>
              .
            </p>
            <p>
              The policies below must be reconciled with existing engagements
              and independently reviewed before production launch. Historical
              client agreements and financial records are not changed by this
              development update.
            </p>
          </section>
        )}
        <div className="legal-policy">
          {item ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(item.html),
              }}
            />
          ) : (
            <>
              <h1>Policy not found</h1>
              <Link to="/">Return home</Link>
            </>
          )}
        </div>
      </main>
    </PublicLayout>
  );
}
export function ContactPage() {
  const [form, setForm] = useState({
      name: "",
      business: "",
      email: "",
      phone: "",
      message: "",
      website: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ reference: string }>(
        "/api/public/enquiries",
        "POST",
        form,
      );
      setReference(r.reference);
      setForm({
        name: "",
        business: "",
        email: "",
        phone: "",
        message: "",
        website: "",
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to record the enquiry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <PublicLayout>
      <main className="premium-section contact-layout">
        <div>
          <p className="public-eyebrow">BUSINESS ONBOARDING & SUPPORT</p>
          <h1>
            Let’s clarify
            <br />
            your next step.
          </h1>
          <p>
            Discuss the business requirement, service scope or account support
            you need. Create an account to upload confidential evidence; this
            public form is for general enquiries.
          </p>
          <div className="contact-methods">
            <a href="tel:9266478940">
              Business enquiries<strong>+91 9266478940</strong>
            </a>
            <a href="tel:9429693037">
              Platform support<strong>+91 9429693037</strong>
            </a>
            <a href="mailto:support@credend.in">
              Email support<strong>support@credend.in</strong>
            </a>
          </div>
        </div>
        <Card className="p-7">
          <h2 className="mb-5 text-xl font-semibold">Send a general enquiry</h2>
          {reference && (
            <p
              role="status"
              className="mb-5 rounded-lg bg-emerald-50 p-4 text-xs leading-6 text-emerald-800"
            >
              Your enquiry has been recorded. Reference: {reference}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-700">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="grid gap-4">
            {(
              [
                ["name", "Your name", true],
                ["business", "Business / organisation", false],
                ["email", "Email", false],
                ["phone", "Phone number", true],
              ] as const
            ).map(([key, label, required]) => (
              <label
                className="grid gap-2 text-xs font-semibold"
                key={key}
                htmlFor={"contact-" + key}
              >
                {label}
                <Input
                  id={"contact-" + key}
                  type={
                    key === "email" ? "email" : key === "phone" ? "tel" : "text"
                  }
                  required={required}
                  autoComplete={
                    key === "name"
                      ? "name"
                      : key === "phone"
                        ? "tel"
                        : key === "email"
                          ? "email"
                          : "organization"
                  }
                  value={form[key]}
                  maxLength={key === "phone" ? 40 : 200}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
            <label
              className="grid gap-2 text-xs font-semibold"
              htmlFor="contact-message"
            >
              How can the team help?
              <textarea
                id="contact-message"
                className="min-h-36 rounded-lg border p-3 text-sm font-normal leading-6"
                required
                minLength={10}
                maxLength={3000}
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
              />
            </label>
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) =>
                  setForm((f) => ({ ...f, website: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Recording enquiry…" : "Submit enquiry"}
            </Button>
            <p className="text-[11px] leading-6 text-muted-foreground">
              Please include only general information. Read the{" "}
              <Link className="underline" to="/privacy">
                privacy policy
              </Link>{" "}
              before submitting personal details.
            </p>
          </form>
        </Card>
      </main>
    </PublicLayout>
  );
}
interface Enquiry {
  _id: string;
  reference: string;
  name: string;
  business: string;
  phone: string;
  email: string;
  message: string;
  status: string;
  adminNote?: string;
  createdAt: string;
}
export function EnquiriesPage() {
  const [data, setData] = useState<{
      items: Enquiry[];
      total: number;
      page: number;
    } | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState<Record<string, string>>({});
  async function load() {
    setData(await api("/api/enquiries?page=" + page));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [page]);
  async function update(item: Enquiry, status: string) {
    setBusy(true);
    try {
      await api("/api/enquiries/" + item._id, "POST", {
        status,
        adminNote: notes[item._id] ?? item.adminNote ?? "",
      });
      await load();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminLayout
      title="Business enquiries"
      subtitle="General enquiries recorded by the public website. Confidential case evidence stays in the matter workspace."
      activeKey="enquiries"
    >
      <p role="alert" className="mb-4 text-sm text-red-700">
        {error}
      </p>
      {!data ? (
        <p role="status">Loading enquiries…</p>
      ) : (
        <>
          <p className="mb-5 text-sm text-muted-foreground">
            {data.total} enquiries
          </p>
          <div className="grid gap-4">
            {data.items.map((item) => (
              <Card className="p-6" key={item._id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    {item.name} · {item.business || "General enquiry"}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {item.status} ·{" "}
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="my-3 text-xs text-muted-foreground">
                  {item.reference} · {item.email} · {item.phone}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {item.message}
                </p>
                <label
                  htmlFor={"enquiry-note-" + item._id}
                  className="mt-5 block text-xs font-semibold"
                >
                  Internal follow-up note
                </label>
                <textarea
                  id={"enquiry-note-" + item._id}
                  maxLength={2000}
                  value={notes[item._id] ?? item.adminNote ?? ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [item._id]: e.target.value }))
                  }
                  className="mt-2 w-full rounded-lg border p-3 text-sm"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {["New", "In progress", "Closed"].map((status) => (
                    <Button
                      key={status}
                      variant={status === item.status ? "secondary" : "outline"}
                      size="sm"
                      disabled={busy}
                      onClick={() => update(item, status)}
                    >
                      Mark {status.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          {!data.items.length && (
            <Card className="p-8 text-sm text-muted-foreground">
              No enquiries on this page.
            </Card>
          )}
          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page * 25 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
