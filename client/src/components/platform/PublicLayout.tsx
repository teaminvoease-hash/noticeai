import StagingBanner from "./StagingBanner";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Scales, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-platform">
      <StagingBanner />
      <div className="public-announcement">
        <span>Business notice management, from facts to final record.</span>
        <a href="tel:9266478940">+91 9266478940</a>
      </div>
      <header className="public-nav">
        <Link to="/" className="public-logo">
          <span>
            <Scales size={23} weight="duotone" />
          </span>
          <div>
            ResolveX<small>BY CREDEND</small>
          </div>
        </Link>
        <nav aria-label="Public navigation">
          <Link to="/#workflow">How it works</Link>
          <Link to="/#coverage">Use cases</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/client-login" className="public-login">
            Log in
          </Link>
          <Button asChild size="sm">
            <Link to="/client-signup">
              Get started
              <ArrowRight />
            </Link>
          </Button>
        </nav>
      </header>
      {children}
      <footer className="public-footer">
        <div>
          <Link to="/" className="public-logo">
            <span>
              <Scales size={23} />
            </span>
            <div>
              ResolveX<small>BY CREDEND</small>
            </div>
          </Link>
          <p>
            Structured preparation. Professional review.
            <br />A clearer record of every business notice.
          </p>
          <a href="mailto:support@credend.in">support@credend.in</a>
        </div>
        <div>
          <strong>Workspaces</strong>
          <Link to="/client-login">Client login</Link>
          <Link to="/lawyer-login">Advocate login</Link>
          <Link to="/lawyer-signup">Advocate application</Link>
          <Link to="/admin-login">Administrator login</Link>
        </div>
        <div>
          <strong>Information</strong>
          <Link to="/contact">Contact & support</Link>
          <Link to="/terms">Terms of service</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/refund">Refund policy</Link>
          <Link to="/compliance">Professional compliance</Link>
        </div>
        <p className="public-footer-note">
          ResolveX facilitates the workflow. Independent advocates determine
          legal framing, acceptance and issuance. No outcome is guaranteed.
        </p>
      </footer>
    </div>
  );
}
