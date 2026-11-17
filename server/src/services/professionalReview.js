const crypto = require("crypto");
const { Lawyer } = require("../models/lawyer.model");
const policyVersion = "advocate-vetting-v1";
const checklist = {
  instructionsAndAuthority:
    "I checked the client/authorised-agent instructions and authority.",
  conflictsAndIndependence:
    "I completed conflict checks and independently accepted professional responsibility.",
  factsAndEvidence:
    "I checked the parties, facts, amounts and supporting evidence.",
  lawAndDeadlines:
    "I verified applicable provisions, jurisdiction, limitation and relevant deadlines.",
  correctionsAndUpdates:
    "I made all necessary corrections and updates to this saved draft.",
  communicationAndService:
    "I checked restrained language, relief, recipient representation and the appropriate service route.",
  scopeAndFees:
    "I confirmed the engagement scope and lawful, non-contingent fee arrangements with the client.",
  confidentiality:
    "I checked confidentiality and any permission for external AI processing.",
};
const hash = (notice) =>
  crypto
    .createHash("sha256")
    .update(String(notice.generatedNotice || ""))
    .digest("hex");
function reviewRecorded(n) {
  const r = n.professionalReview;
  return (
    ["approved", "verified"].includes(String(n.status).toLowerCase()) &&
    !!r &&
    r.policyVersion === policyVersion &&
    r.lawyerId === String(n.lawyerId) &&
    r.revision === (n.draftRevision || 0) &&
    Object.keys(checklist).every((k) => r.checklist?.[k] === true) &&
    !!r.reviewedAt
  );
}
function currentReview(n) {
  return reviewRecorded(n) && n.professionalReview.contentHash === hash(n);
}
async function requireCredentials(id) {
  const lawyer = await Lawyer.findById(id);
  const c = lawyer?.credentialReview;
  if (
    !lawyer ||
    !["active", "verified"].includes(lawyer.status) ||
    c?.status !== "verified" ||
    !c.checkedAt ||
    !c.enrolmentNumber ||
    !c.barCouncil
  )
    throw Object.assign(
      new Error(
        "An administrator must record current practising-credential checks for the assigned advocate before professional approval or issuance.",
      ),
      { status: 409 },
    );
  return lawyer;
}
function attestation(req, n) {
  if (
    req.session.user.role !== "lawyer" ||
    String(n.lawyerId) !== req.session.user.id
  )
    throw Object.assign(
      new Error(
        "Only the assigned advocate can record professional vetting and approval.",
      ),
      { status: 403 },
    );
  const v = req.body.vetting;
  if (
    !v ||
    req.body.revision !== (n.draftRevision || 0) ||
    !Object.keys(checklist).every((k) => v.checklist?.[k] === true)
  )
    throw Object.assign(
      new Error(
        "Complete every mandatory advocate vetting check for the current saved draft revision.",
      ),
      { status: 400 },
    );
  const note = String(v.note || "").trim(),
    updates = String(v.updates || "").trim();
  if (
    note.length < 20 ||
    note.length > 2000 ||
    updates.length < 20 ||
    updates.length > 2000
  )
    throw Object.assign(
      new Error(
        "Record review notes and corrections/updates (20–2,000 characters each). If no change was needed, explain the review conclusion.",
      ),
      { status: 400 },
    );
  const route = v.serviceRoute;
  if (
    !route ||
    !["unrepresented_email", "through_counsel", "manual_service"].includes(
      route.mode,
    )
  )
    throw Object.assign(
      new Error(
        "Record the professionally checked communication/service route.",
      ),
      { status: 400 },
    );
  const email = String(route.email || "")
      .trim()
      .toLowerCase(),
    basis = String(route.basis || "").trim();
  if (
    (route.mode !== "manual_service" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    basis.length < 20 ||
    basis.length > 2000
  )
    throw Object.assign(
      new Error(
        "Provide the checked email where applicable and a 20–2,000 character service-route basis. Represented-party communications must be assessed by the advocate.",
      ),
      { status: 400 },
    );
  return {
    serviceRoute: {
      mode: route.mode,
      email: route.mode === "manual_service" ? "" : email,
      basis,
    },
    policyVersion,
    lawyerId: req.session.user.id,
    revision: n.draftRevision || 0,
    contentHash: hash(n),
    checklist: Object.fromEntries(Object.keys(checklist).map((k) => [k, true])),
    note,
    updates,
    reviewedAt: new Date(),
  };
}
function emailDestination(n) {
  const route = n.professionalReview?.serviceRoute;
  if (
    !route ||
    !["unrepresented_email", "through_counsel"].includes(route.mode) ||
    !route.email
  )
    throw Object.assign(
      new Error(
        "This review does not authorise email dispatch. Use the advocate-approved service route or obtain a fresh review.",
      ),
      { status: 409 },
    );
  return route.email;
}
async function requireVetting(n) {
  await requireCredentials(n.lawyerId);
  if (!currentReview(n))
    throw Object.assign(
      new Error(
        "Mandatory advocate vetting, corrections/updates and approval of this exact saved draft must be recorded before signing or issuance.",
      ),
      { status: 409 },
    );
}
module.exports = {
  emailDestination,
  policyVersion,
  checklist,
  reviewRecorded,
  currentReview,
  requireCredentials,
  attestation,
  requireVetting,
};
