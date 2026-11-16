const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientPaymentSchema = new Schema(
  {
    clientId: { type: String, required: true },
    noticeId: { type: String, required: true },
    txnId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    billingEmail: { type: String },
    receiptFileName: { type: String },
    reconciliationReference:String, verifiedBy:String, verifiedAt:Date,
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

const ClientPayment = mongoose.model("client_payments", clientPaymentSchema);
module.exports = { ClientPayment };
