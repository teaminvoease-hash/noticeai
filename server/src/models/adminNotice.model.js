const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminNoticeSchema = new Schema(
  {
    notice_id: { type: String, unique: true, sparse: true },
    clientName: { type: String, default: "" },
    assignedLawyer: { type: String, default: "" },
    authorityLetter: { type: String, default: "missing" },
    status: { type: String, default: "pending" },
    trackingNo: { type: String, default: "" },
  },
  { timestamps: true }
);

const AdminNotice = mongoose.model("admin_notices", adminNoticeSchema);
module.exports = { AdminNotice };
