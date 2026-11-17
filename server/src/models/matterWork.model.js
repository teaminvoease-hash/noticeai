const mongoose = require("mongoose");
const { Schema } = mongoose;
const intakeSchema = new Schema(
  {
    clientId: { type: String, required: true, index: true },
    fields: {
      subject: String,
      category: String,
      defaulterId: String,
      recipientDetails: String,
      caseSummary: String,
      supportingDocument: String,
      supportingDocuments: [String],
    },
    step: { type: Number, default: 0 },
    revision: { type: Number, default: 0 },
    state: { type: String, default: "draft" },
    noticeId: String,
    lockedAt: Date,
  },
  { timestamps: true },
);
const eventSchema = new Schema(
  {
    noticeId: { type: String, required: true, index: true },
    actorId: String,
    actorRole: String,
    label: { type: String, required: true },
    detail: String,
  },
  { timestamps: true },
);
const versionSchema = new Schema(
  {
    noticeId: { type: String, required: true },
    revision: { type: Number, required: true },
    content: String,
    actorRole: String,
    actorId: String,
    label: String,
  },
  { timestamps: true },
);
versionSchema.index({ noticeId: 1, revision: 1 }, { unique: true });
module.exports = {
  IntakeDraft: mongoose.model("intake_drafts", intakeSchema),
  MatterEvent: mongoose.model("matter_events", eventSchema),
  DraftVersion: mongoose.model("notice_draft_versions", versionSchema),
};
