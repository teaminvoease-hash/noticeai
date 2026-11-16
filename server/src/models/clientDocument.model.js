const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientDocumentSchema = new Schema(
  {
    clientId: { type: String, required: true },
    noticeId: { type: String, required: true },
    docId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    fileName: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    requestMessage: { type: String, default: "" },
    requestedByRole: { type: String, default: "client" },
    requestedById: { type: String, default: "" },
    responseFiles: { type: [String], default: [] },
    status: { type: String, default: "Requested" },
  },
  { timestamps: true }
);

const ClientDocument = mongoose.model("client_documents", clientDocumentSchema);
module.exports = { ClientDocument };
