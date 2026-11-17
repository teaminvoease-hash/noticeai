const descriptions = [
  {
    action: "Complete or await review of the signed authority letter.",
    next: "When authority is approved, the payment step becomes available.",
    section: "authority",
  },
  {
    action: "Review the agreed scope and fee before recording payment.",
    next: "Payment does not approve or issue a notice. Professional review is still mandatory.",
    section: "payment",
  },
  {
    action: "The administrator is coordinating advocate assignment.",
    next: "The assigned advocate must check instructions, conflicts, evidence and the draft.",
    section: "assignment",
  },
  {
    action:
      "Mandatory advocate vetting, checking and necessary corrections/updates are in progress.",
    next: "After review of this exact saved version, the advocate can approve and sign it.",
    section: "professional-review",
  },
  {
    action: "The assigned advocate must upload the actual signed notice PDF.",
    next: "The team can then record real dispatch and delivery information.",
    section: "signed",
  },
  {
    action: "The administrator must record actual dispatch details.",
    next: "A tracking record is not a guarantee of service or a legal outcome.",
    section: "delivery",
  },
  {
    action: "The administrator must update the recorded delivery status.",
    next: "Returned or disputed delivery may need further instructions and professional assessment.",
    section: "delivery",
  },
  {
    action:
      "The matter is recorded as delivered. Keep the signed copy and available proof.",
    next: "Delivery does not establish acceptance, recovery or a successful legal outcome.",
    section: "timeline",
  },
];
function handoff(workflow, n) {
  const d = descriptions[workflow.step] || descriptions[3];
  const documentStep = workflow.step === 3 && /document/i.test(workflow.label);
  return {
    ...workflow,
    nextAction: /credential/i.test(workflow.label)
      ? "Administration must check the assigned advocate’s current practising credentials before professional approval or issuance."
      : documentStep
        ? workflow.owner === "client"
          ? "Upload the files listed in the document requests and address any correction notes."
          : "The assigned advocate must check the uploaded responses."
        : d.action,
    whatHappensNext: d.next,
    section: documentStep ? "documents" : d.section,
    updateNote: n.clientUpdateNote || "",
    nextUpdateAt: n.nextUpdateAt || null,
    updatedAt: n.updatedAt,
  };
}
module.exports = { handoff };
