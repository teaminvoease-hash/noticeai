import { useState } from "react";
import { Link } from "react-router-dom";
import { List, ArrowRight } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
const links = [
  ["/#coverage", "For business"],
  ["/#notice-library", "Notice library"],
  ["/#workflow", "How it works"],
  ["/#scope", "Scope & fees"],
  ["/lawyer-signup", "For advocates"],
  ["/contact", "Contact"],
];
export default function ClassicHeader({ requestTo }: { requestTo: string }) {
  const [open, setOpen] = useState(false);
  const label = requestTo.includes("-dashboard")
    ? "Open dashboard"
    : "Create notice";
  return (
    <>
      <a className="rx-skip" href="#landing-main">
        Skip to content
      </a>
      <div className="rx-announcement">
        <div className="rx-container">
          <span>Technology-enabled business notice facilitation</span>
          <a href="tel:+919266478940">Call +91 9266478940</a>
        </div>
      </div>
      <header className="rx-site-header">
        <div className="rx-container rx-navbar">
          <Link
            className="rx-brand"
            to="/"
            aria-label="ResolveX by CredEnd home"
          >
            <strong>
              Resolve<span>X</span>
            </strong>
            <small>by CredEnd</small>
          </Link>
          <nav className="rx-desktop-nav" aria-label="Primary navigation">
            {links.map(([to, text]) => (
              <Link to={to} key={to}>
                {text}
              </Link>
            ))}
          </nav>
          <div className="rx-nav-actions">
            <Link to="/client-login" className="rx-nav-login">
              Login
            </Link>
            <Link className="rx-button rx-gold rx-nav-create" to={requestTo}>
              {label}
              <ArrowRight size={16} />
            </Link>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="rx-menu" aria-label="Open navigation">
                  <List size={23} />
                </button>
              </DialogTrigger>
              <DialogContent className="rx-public-dialog">
                <DialogTitle>ResolveX navigation</DialogTitle>
                <DialogDescription>
                  Explore the platform or start a notice request.
                </DialogDescription>
                <nav
                  aria-label="Mobile primary navigation"
                  className="rx-mobile-links"
                >
                  <Link to="/client-login" onClick={() => setOpen(false)}>
                    Client login
                  </Link>
                  {links.map(([to, text]) => (
                    <Link to={to} key={to} onClick={() => setOpen(false)}>
                      {text}
                    </Link>
                  ))}
                </nav>
                <Link
                  className="rx-button rx-gold"
                  to={requestTo}
                  onClick={() => setOpen(false)}
                >
                  {label}
                  <ArrowRight size={18} />
                </Link>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
    </>
  );
}
