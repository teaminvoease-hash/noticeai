const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientNoticeSchema = new Schema(
  {
    signedFile: String, courier: String, trackingId: String, dispatchDate: String,
    deliveryStatus: String, proofOfDelivery: String,
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
    supportingDocument: { type: String, default: "" },
    authorityLetter: { type: String, required: true },
    generatedNotice: { type: String, default: "" },
    paymentStatus: { type: String, default: "Pending" },
    draftStatus: { type: String, default: "Blocked" },
    signedNoticeStatus: { type: String, default: "Pending" },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

const ClientNotice = mongoose.model("client_notices", clientNoticeSchema);
module.exports = { ClientNotice };
