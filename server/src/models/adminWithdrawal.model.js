const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminWithdrawalSchema = new Schema(
  {
    request_id: { type: String, unique: true, sparse: true },
    advocateId: { type: String, default: "" },
    advocateName: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    bankAccount: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
    remarks: { type: String, default: "" },
    status: { type: String, default: "pending" },
    adminRemarks: { type: String, default: "" },
    processedDate: { type: String, default: "" },
  },
  { timestamps: true }
);

const AdminWithdrawal = mongoose.model("admin_withdrawals", adminWithdrawalSchema);
module.exports = { AdminWithdrawal };
