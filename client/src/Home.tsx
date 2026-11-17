import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Scales,
  Buildings,
  CheckCircle,
  FlowArrow,
  FolderOpen,
  Wallet,
  Users,
  Briefcase,
  Trademark,
  HouseLine,
} from "@phosphor-icons/react";
import PublicLayout from "@/components/platform/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { SessionUser } from "@/types/platform";
const cases = [
  {
    icon: Wallet,
    title: "Payments & finance",
    text: "Organise outstanding invoices, refunds, documented debt and payment obligations.",
  },
  {
    icon: Briefcase,
    title: "Contracts & vendors",
    text: "Bring purchase orders, service commitments and contract performance into one record.",
  },
  {
    icon: Users,
    title: "Employment & HR",
    text: "Structure employment dues, exit obligations and confidentiality-related matters.",
  },
  {
    icon: Buildings,
    title: "Commercial operations",
    text: "Coordinate distributor, logistics, partnership and recurring commercial issues.",
  },
  {
    icon: Trademark,
    title: "Brand & data",
    text: "Prepare the facts around confidentiality, intellectual property and brand concerns.",
  },
  {
    icon: HouseLine,
    title: "Property & consumer",
    text: "Keep tenancy, warranty, property and other formal demands clearly documented.",
  },
];
export default function Home() {
  const user = useSelector(
    (s: unknown) =>
      (s as { userReducer: { userData: SessionUser | "" } }).userReducer
        .userData,
  );
  const start = user
    ? user.role === "client"
      ? "/client-notice-submission"
      : "/" + user.role + "-dashboard"
    : "/client-signup";
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
          note: "Contact the team for current pricing and matter scope.",
        }),
      );
  }, []);
  return (
    <PublicLayout>
      <main>
        <section className="premium-hero">
          <div className="premium-hero-copy">
            <Badge className="mb-6 border-blue-100 bg-blue-50 text-blue-700">
              <span className="mr-2 size-1.5 rounded-full bg-blue-500" />
              BUSINESS NOTICE INTELLIGENCE
            </Badge>
            <h1>
              Every notice.
              <br />A clear path <em>forward.</em>
            </h1>
            <p>
              Bring facts, documents, advocate review and delivery into one
              secure workspace. A structured process for the business matters
              that deserve a careful response.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={start}>
                  Start a notice request
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#workflow">
                  Explore the workflow
                  <ArrowRight />
                </a>
              </Button>
            </div>
            <p className="premium-hero-note">
              <ShieldCheck size={16} />
              Private documents · Role-based access · Independent professional
              review
            </p>
          </div>
          <div className="premium-hero-art">
            <div className="hero-picture">
              <img
                src="/assets/reference/hero-visual.webp"
                alt="Business professionals reviewing a notice management workspace"
              />
              <span>Illustrative workspace preview</span>
            </div>
            <Card className="hero-assurance">
              <span className="hero-assurance-icon">
                <Scales size={23} />
              </span>
              <div>
                <strong>Professional judgment at every handoff</strong>
                <small>Prepare → Review → Sign → Track</small>
              </div>
              <CheckCircle size={22} className="text-emerald-600" />
            </Card>
          </div>
        </section>
        <div className="premium-trust">
          {[
            [FolderOpen, "Private document workspace"],
            [Scales, "Independent advocate review"],
            [FlowArrow, "Visible workflow ownership"],
            [ShieldCheck, "Controlled access to records"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof FolderOpen;
            return (
              <span key={String(text)}>
                <I size={18} />
                {String(text)}
              </span>
            );
          })}
        </div>
        <section className="premium-section" id="coverage">
          <div className="premium-section-heading">
            <div>
              <p className="public-eyebrow">BUILT AROUND YOUR BUSINESS</p>
              <h2>
                One workspace.
                <br />
                Across your business matters.
              </h2>
            </div>
            <p>
              From payment obligations to commercial relationships, start with a
              structured request. Your advocate determines the appropriate legal
              framing.
            </p>
          </div>
          <div className="premium-usecases">
            {cases.map((item) => (
              <Card key={item.title} className="premium-usecase">
                <span>
                  <item.icon size={23} weight="duotone" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <Link to={start}>
                  Prepare a request
                  <ArrowUpRight size={15} />
                </Link>
              </Card>
            ))}
          </div>
        </section>
        <section className="premium-workflow" id="workflow">
          <div className="premium-section">
            <div className="premium-section-heading">
              <div>
                <p className="public-eyebrow">CLEAR FROM THE FIRST STEP</p>
                <h2>
                  A better handoff
                  <br />
                  at every stage.
                </h2>
              </div>
              <p>
                Know what is saved, who needs to act next and which records
                support the matter. Continue an unfinished request whenever you
                are ready.
              </p>
            </div>
            <div className="premium-flow-grid">
              {[
                [
                  "01",
                  "Share the facts",
                  "Choose a matter type, add the recipient and organise the relevant records.",
                ],
                [
                  "02",
                  "Prepare and review",
                  "Use optional AI assistance with authorisation, then coordinate independent advocate review.",
                ],
                [
                  "03",
                  "Sign and keep track",
                  "Access the signed record and administrator-recorded dispatch and delivery updates.",
                ],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
            <div className="premium-workflow-note">
              <ShieldCheck size={19} />
              <p>
                AI output is preliminary and can contain errors. Professional
                review and signature are separate steps; submission does not
                issue a notice to the recipient.
              </p>
            </div>
          </div>
        </section>
        <section className="premium-section premium-review">
          <div className="premium-review-image">
            <img
              src="/assets/reference/advocate-photo.webp"
              alt="An advocate reviewing matter documents"
            />
          </div>
          <div>
            <p className="public-eyebrow">PREPARATION WITH ACCOUNTABILITY</p>
            <h2>
              Useful technology.
              <br />
              Professional oversight.
            </h2>
            <p>
              Keep the request, source records, document corrections and saved
              draft versions together. Independent advocates retain
              responsibility for legal judgment and review.
            </p>
            <ul>
              {[
                "Source documents remain linked to the matter",
                "Editable proposals become versioned drafts after review",
                "Signed notices and delivery records stay accessible",
              ].map((t) => (
                <li key={t}>
                  <CheckCircle size={18} />
                  {t}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline">
              <Link to="/lawyer-signup">
                Join the advocate workspace
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
        <section className="premium-section premium-pricing">
          <div>
            <p className="public-eyebrow">START WITH A CLEAR SCOPE</p>
            <h2>
              Your matter.
              <br />
              An agreed service scope.
            </h2>
            <p>{pricing?.note || "Loading current service pricing…"}</p>
          </div>
          <Card className="premium-price-card">
            <Badge>Notice preparation workflow</Badge>
            <h3>
              {pricing?.available && pricing.amount
                ? "₹" + pricing.amount.toLocaleString("en-IN")
                : "Discuss your requirement"}
            </h3>
            <p>
              {pricing?.available
                ? "Current published standard service amount. Confirm matter scope and applicable taxes with the team."
                : "The team can explain the appropriate process, current pricing and required records."}
            </p>
            <Button asChild>
              <Link to="/contact">
                Contact the team
                <ArrowRight />
              </Link>
            </Button>
          </Card>
        </section>
        <section className="premium-section premium-faq">
          <p className="public-eyebrow">BEFORE YOU BEGIN</p>
          <h2>A few practical answers.</h2>
          {[
            [
              "What should I prepare?",
              "Your business details, authority letter, recipient details and records supporting the facts. Your reviewer may request further documents.",
            ],
            [
              "Can I save a request before submitting?",
              "Yes. Unfinished requests are saved to your account. Review the save indicator and use Save and close before leaving.",
            ],
            [
              "Does AI issue the notice?",
              "AI can assist with preliminary preparation when enabled and authorised. Independent professional review, acceptance and signature are required before issuance.",
            ],
            [
              "How do I track the matter?",
              "Your dashboard shows the next responsible role. Open the matter for document requests, draft versions, payment records and recorded delivery updates.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
        <section className="premium-final-cta">
          <div>
            <p className="public-eyebrow">A CLEARER WAY TO MOVE FORWARD</p>
            <h2>
              Your next notice starts
              <br />
              with an organised request.
            </h2>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            <Link to={start}>
              Open your workspace
              <ArrowUpRight />
            </Link>
          </Button>
        </section>
      </main>
    </PublicLayout>
  );
}
