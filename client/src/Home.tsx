import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  ArrowUpRight,
  Buildings,
  CheckCircle,
  FileText,
  FlowArrow,
  FolderOpen,
  HouseLine,
  MagnifyingGlass,
  Scales,
  ShieldCheck,
  Trademark,
  Users,
  Wallet,
  Briefcase,
} from "@phosphor-icons/react";
import PublicLayout from "@/components/platform/PublicLayout";
import ProfessionalNotice from "@/components/platform/ProfessionalNotice";
import categories from "@/data/categories.json";
import { api } from "@/lib/api";
import { requestAuthPath, requestDestination } from "@/lib/requestIntent.mjs";
import type { SessionUser } from "@/types/platform";
import "./landing.css";
const functions = [
  {
    icon: Wallet,
    title: "Finance & accounts",
    group: "Payments & Finance",
    text: "Outstanding invoices, documented debt, refunds and payment obligations.",
  },
  {
    icon: Briefcase,
    title: "Contracts & procurement",
    group: "Contracts & Procurement",
    text: "Purchase orders, supplier commitments, service quality and contract performance.",
  },
  {
    icon: Users,
    title: "HR & people operations",
    group: "HR & Employment",
    text: "Employment dues, exit obligations, show-cause and confidentiality matters.",
  },
  {
    icon: Buildings,
    title: "Operations & commercial",
    group: "Operations & Commercial",
    text: "Logistics, distribution, franchise, partnership and commercial relationships.",
  },
  {
    icon: Trademark,
    title: "Brand, data & IP",
    group: "Brand, Data & Intellectual Property",
    text: "Brand misuse, intellectual property, privacy and confidentiality concerns.",
  },
  {
    icon: HouseLine,
    title: "Property & consumer",
    group: "Property, Consumer & General",
    text: "Tenancy, property, warranty, service claims and other formal demands.",
  },
];
const journey = [
  [
    "01",
    "Tell us what happened",
    "Choose the matter type, add the recipient and explain the facts. Your request can be saved and resumed.",
  ],
  [
    "02",
    "Organise the records",
    "Upload supporting documents and complete the authority-letter process. Scope and fees are agreed separately.",
  ],
  [
    "03",
    "Mandatory advocate review",
    "The assigned advocate checks facts and law, makes necessary corrections and updates, and approves the exact saved draft.",
  ],
  [
    "04",
    "Sign, dispatch and track",
    "The actual signed notice and recorded dispatch, delivery and team updates stay together in your matter.",
  ],
];
export default function Home() {
  const user = useSelector(
    (s: unknown) =>
      (s as { userReducer: { userData: SessionUser | "" } }).userReducer
        .userData,
  );
  const start = (category = "") =>
    user
      ? user.role === "client"
        ? requestDestination(category)
        : "/" + user.role + "-dashboard"
      : requestAuthPath("/client-signup", requestDestination(category));
  const [query, setQuery] = useState("");
  const [pricing, setPricing] = useState<{
    available: boolean;
    amount?: number;
    note: string;
  } | null>(null);
  useEffect(() => {
    api<{ available: boolean; amount?: number; note: string }>(
      "/api/public/pricing",
    )
      .then(setPricing)
      .catch(() =>
        setPricing({
          available: false,
          note: "Scope and lawful fees are confirmed privately before work proceeds.",
        }),
      );
  }, []);
  const total = Object.values(categories).flat().length;
  const results = Object.entries(categories)
    .map(([group, items]) => ({
      group,
      items: items.filter((t) =>
        (group + " " + t).toLowerCase().includes(query.trim().toLowerCase()),
      ),
    }))
    .filter((g) => g.items.length);
  return (
    <PublicLayout appearance="classic" requestTo={start()}>
      <main id="landing-main">
        <section className="rx-hero" aria-labelledby="landing-title">
          <div className="rx-container rx-hero-grid">
            <div className="rx-hero-copy">
              <p className="rx-eyebrow">Business-wide notice management</p>
              <h1 id="landing-title">
                The notice
                <br />
                workspace for
                <br />
                <em>modern companies.</em>
              </h1>
              <p className="rx-lead">
                Organise business notice requests, supporting records and
                mandatory advocate review in one clear workspace.
              </p>
              <div className="rx-actions">
                <Link className="rx-button rx-gold" to={start()}>
                  Create a notice request <ArrowRight size={18} />
                </Link>
                <a className="rx-button rx-outline" href="#coverage">
                  Explore use cases
                </a>
              </div>
              <div className="rx-proof" aria-label="Platform capabilities">
                <div>
                  <strong>{total}</strong>
                  <span>Notice categories</span>
                </div>
                <div>
                  <strong>8 stages</strong>
                  <span>One visible workflow</span>
                </div>
                <div>
                  <strong>Saved drafts</strong>
                  <span>Continue when ready</span>
                </div>
              </div>
              <aside
                className="rx-hero-review"
                aria-label="Mandatory advocate review"
              >
                <Scales size={20} />
                <p>
                  <strong>Advocate vetting is mandatory.</strong> The assigned
                  advocate must check every notice and make necessary
                  corrections and updates before approval, signature and
                  issuance. <Link to="/compliance">Review policy</Link>
                </p>
              </aside>
            </div>
            <div className="rx-hero-visual">
              <figure className="rx-hero-frame">
                <img
                  src="/assets/reference/hero-visual.webp"
                  alt="Illustrative business notice workspace, not a live client dashboard"
                  width="562"
                  height="295"
                  fetchPriority="high"
                />
                <figcaption>Illustrative workspace preview</figcaption>
              </figure>
              <div className="rx-float rx-float-top">
                <span className="rx-icon">
                  <Buildings size={23} />
                </span>
                <div>
                  <strong>Company-wide intake</strong>
                  <small>Finance · HR · Procurement · Operations</small>
                </div>
              </div>
              <div className="rx-float rx-float-bottom">
                <FlowArrow size={23} />
                <div>
                  <strong>One visible workflow</strong>
                  <small>Request → Review → Sign → Track</small>
                </div>
              </div>
            </div>
          </div>
          <div className="rx-container rx-trust">
            {[
              [FolderOpen, "Records together", "One private matter workspace"],
              [Scales, "Mandatory review", "Independent advocate judgment"],
              [FlowArrow, "Clear next steps", "Know who needs to act"],
              [ShieldCheck, "Controlled access", "Role-based document access"],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Scales;
              return (
                <div key={String(title)}>
                  <I size={25} />
                  <span>
                    <strong>{String(title)}</strong>
                    <small>{String(text)}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rx-section rx-container" id="coverage">
          <div className="rx-section-heading rx-centered">
            <p className="rx-eyebrow">Built around your business</p>
            <h2>
              Formal notices across the
              <br />
              commercial lifecycle.
            </h2>
            <p>
              Start with your business situation. Your assigned advocate
              independently determines the legal framing and whether the matter
              can be accepted.
            </p>
          </div>
          <div className="rx-departments">
            {functions.map((f) => (
              <article className="rx-department" key={f.group}>
                <span className="rx-icon">
                  <f.icon size={25} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <a
                  href={"#category-" + Object.keys(categories).indexOf(f.group)}
                  onClick={() => setQuery("")}
                >
                  View notice types <ArrowUpRight size={17} />
                </a>
              </article>
            ))}
          </div>
        </section>
        <section className="rx-soft" id="workflow">
          <div className="rx-container rx-section">
            <div className="rx-section-heading">
              <p className="rx-eyebrow">
                From the first fact to the final record
              </p>
              <h2>
                A clear process.
                <br />A better handoff at every step.
              </h2>
              <p>
                No guessing what comes next. Each matter shows the responsible
                role, document requests, draft versions and the latest team
                update.
              </p>
            </div>
            <div className="rx-journey">
              {journey.map(([n, title, text]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="rx-workspace-panel">
              <div>
                <p className="rx-eyebrow">One matter. One organised record.</p>
                <h3>
                  Keep the whole picture
                  <br />
                  in your dashboard.
                </h3>
                <p>
                  Pick up a saved request, respond to document corrections,
                  review recorded payments and access the actual signed notice.
                </p>
                <Link to={start()} className="rx-button rx-gold">
                  Start a notice request <ArrowRight size={18} />
                </Link>
              </div>
              <figure>
                <img
                  src="/assets/reference/dashboard-preview.webp"
                  alt="Illustration of the notice workspace; sample records are not real client data"
                  width="520"
                  height="280"
                  loading="lazy"
                />
                <figcaption>
                  Illustrative dashboard · actual records appear after sign-in
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
        <section className="rx-container rx-section" id="notice-library">
          <div className="rx-library-head">
            <div className="rx-section-heading">
              <p className="rx-eyebrow">Business notice library</p>
              <h2>
                Find the closest fit
                <br />
                for your situation.
              </h2>
              <p>
                {total} intake categories across six business functions. The
                category helps organise your request; it does not decide the
                legal advice.
              </p>
            </div>
            <div className="rx-search">
              <label htmlFor="notice-search">Search notice types</label>
              <div>
                <MagnifyingGlass size={20} />
                <input
                  id="notice-search"
                  type="search"
                  placeholder="Try invoice, employment or contract"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <p role="status">
                {results.reduce((n, g) => n + g.items.length, 0)} notice types
                shown
              </p>
            </div>
          </div>
          {!results.length ? (
            <div className="rx-no-results">
              <h3>No matching notice type</h3>
              <p>
                Try a broader term, or describe the situation in a general
                request.
              </p>
              <button
                className="rx-button rx-outline"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
              <Link to={start()} className="rx-text-link">
                Start a general request <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <div className="rx-library-grid">
              {results.map(({ group, items }) => {
                const Icon = functions.find((f) => f.group === group)!.icon;
                return (
                  <article
                    className="rx-library-card"
                    id={"category-" + Object.keys(categories).indexOf(group)}
                    key={group}
                  >
                    <header>
                      <span className="rx-icon">
                        <Icon size={23} />
                      </span>
                      <h3>{group}</h3>
                    </header>
                    <ul>
                      {items.map((name) => (
                        <li key={name}>
                          <Link to={start(name)}>
                            <span>{name}</span>
                            <ArrowUpRight size={18} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="rx-review-section rx-container">
          <div className="rx-review-image">
            <img
              src="/assets/reference/advocate-photo.webp"
              width="480"
              height="360"
              loading="lazy"
              alt="Illustrative document review, not an advocate endorsement"
            />
          </div>
          <div>
            <p className="rx-eyebrow">
              Technology with professional responsibility
            </p>
            <h2>
              AI prepares.
              <br />
              Your advocate checks.
            </h2>
            <p>
              AI output is preliminary and may contain errors. The assigned
              advocate must independently verify facts and law, make necessary
              corrections and updates, and approve the saved draft before a
              signed notice can be issued.
            </p>
            <ul className="rx-checks">
              {[
                "Authority and instructions checked",
                "Necessary document corrections reviewed",
                "Approval tied to the exact saved draft",
                "Signed notice and recorded delivery kept together",
              ].map((t) => (
                <li key={t}>
                  <CheckCircle size={20} />
                  {t}
                </li>
              ))}
            </ul>
            <Link className="rx-text-link" to="/compliance">
              Read the professional review policy <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <section className="rx-soft" id="scope">
          <div className="rx-container rx-section rx-scope">
            <div>
              <p className="rx-eyebrow">
                Clear expectations before work begins
              </p>
              <h2>
                Your matter.
                <br />
                An agreed scope.
              </h2>
              <p>
                Start by organising the request. Professional engagement, scope,
                lawful fees, taxes and any third-party expenses must be
                confirmed separately.
              </p>
            </div>
            <div className="rx-scope-card">
              <FileText size={30} />
              <h3>
                {pricing?.available && pricing.amount
                  ? "₹" + pricing.amount.toLocaleString("en-IN")
                  : "Scope and fee confirmation"}
              </h3>
              <p>
                {pricing?.note ||
                  "Scope and lawful fees are confirmed privately before work proceeds."}
              </p>
              <p>
                Creating a request does not itself establish an advocate–client
                engagement or issue a notice. No recovery, response or legal
                outcome is guaranteed.
              </p>
              <Link className="rx-text-link" to="/contact">
                Contact platform support <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
        <section className="rx-container rx-section rx-faq">
          <div>
            <p className="rx-eyebrow">Before you begin</p>
            <h2>
              A few practical
              <br />
              answers.
            </h2>
            <p>Know what to prepare and how the process works.</p>
          </div>
          <div>
            {[
              [
                "What do I need to start?",
                "Choose a matter type, add the recipient and explain the facts. Keep relevant agreements, invoices, correspondence and other supporting records ready. Complete the authority-letter process before the matter proceeds.",
              ],
              [
                "Can I save my request and finish later?",
                "Yes. Requests are saved to your signed-in account. Check the save indicator and use Save and close. You can resume an unfinished request from your dashboard.",
              ],
              [
                "Will AI send a notice automatically?",
                "No. AI assistance is optional and preliminary. Advocate vetting, checking and necessary corrections/updates are mandatory before approval, signature and issuance.",
              ],
              [
                "How will I know what happens next?",
                "Open your matter to see the current step, responsible role, document corrections, latest team update and any recorded next-update time. These update times are not legal deadlines.",
              ],
              [
                "Can I use this for an urgent legal deadline?",
                "Do not rely on the platform to calculate limitation or meet an urgent deadline. Contact an appropriately qualified advocate promptly for urgent or specialised matters.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <div className="rx-container rx-final">
          <div>
            <p className="rx-eyebrow">A more organised way to begin</p>
            <h2>
              Bring your next notice
              <br />
              into one clear workflow.
            </h2>
            <p>Start with the facts. Save your progress. Know the next step.</p>
          </div>
          <Link className="rx-button rx-gold" to={start()}>
            Create a notice request <ArrowRight size={19} />
          </Link>
        </div>
        <div className="rx-container rx-full-policy">
          <ProfessionalNotice />
        </div>
      </main>
    </PublicLayout>
  );
}
