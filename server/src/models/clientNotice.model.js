const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientNoticeSchema = new Schema(
  {
    professionalReview: {
      serviceRoute: { mode: String, email: String, basis: String },
      policyVersion: String,
      lawyerId: String,
      revision: Number,
      contentHash: String,
      checklist: {
        instructionsAndAuthority: Boolean,
        conflictsAndIndependence: Boolean,
        factsAndEvidence: Boolean,
        lawAndDeadlines: Boolean,
        correctionsAndUpdates: Boolean,
        communicationAndService: Boolean,
        scopeAndFees: Boolean,
        confidentiality: Boolean,
      },
      note: String,
      updates: String,
      reviewedAt: Date,
    },
    clientUpdateNote: String,
    nextUpdateAt: Date,
    handoffUpdatedBy: String,
    intakeDraftId: { type: String, unique: true, sparse: true },
    draftRevision: { type: Number, default: 0 },
    signedFile: String,
    courier: String,
    trackingId: String,
    dispatchDate: String,
    deliveryStatus: String,
    proofOfDelivery: String,
    clientId: { type: String, required: true },
    noticeId: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    category: { type: String, required: true },
    defaulterId: { type: String, default: "" },
    defaulterName: { type: String, default: "" },
    lawyerId: { type: String, default: "" },
    lawyerName: { type: String, default: "" },
    lawyerCode: { type: String, default: "" },
    recipientDetails: { type: String, default: "" },
    caseSummary: { type: String, default: "" },
    supportingDocuments: [String],
    supportingDocument: { type: String, default: "" },
    authorityLetter: { type: String, required: true },
    generatedNotice: { type: String, default: "" },
    paymentStatus: { type: String, default: "Pending" },
    draftStatus: { type: String, default: "Blocked" },
    signedNoticeStatus: { type: String, default: "Pending" },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true },
);

clientNoticeSchema.index({ clientId: 1, createdAt: -1 });
clientNoticeSchema.index({ lawyerId: 1, createdAt: -1 });
const ClientNotice = mongoose.model("client_notices", clientNoticeSchema);
module.exports = { ClientNotice };
