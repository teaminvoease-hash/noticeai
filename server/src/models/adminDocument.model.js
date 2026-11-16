const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminDocumentSchema = new Schema(
  {
    document_id: { type: String, unique: true, sparse: true },
    noticeId: { type: String, default: "" },
    type: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    accessLevel: { type: String, default: "restricted" },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

const AdminDocument = mongoose.model("admin_documents", adminDocumentSchema);
module.exports = { AdminDocument };
