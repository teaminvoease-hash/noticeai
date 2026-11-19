import { Link } from "react-router-dom";
export default function ProfessionalNotice() {
  return (
    <aside
      className="professional-notice"
      aria-label="Mandatory professional review"
    >
      <strong>Advocate vetting is mandatory.</strong> Every notice must be
      checked by the assigned advocate, who must make necessary corrections and
      updates before approval, signature and issuance. AI output and
      administrator checks do not replace this review.{" "}
      <Link to="/compliance">Professional boundaries and review policy</Link>
    </aside>
  );
}
