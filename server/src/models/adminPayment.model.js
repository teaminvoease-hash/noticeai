const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminPaymentSchema = new Schema(
  {
    paymentScope: { type: String, default: "global" },
    clientId: { type: Schema.Types.Mixed, default: null },
    clientName: { type: String, default: "" },
    priceMode: { type: String, default: "standard" },
    totalAmount: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    advocateFee: { type: Number, default: 0 },
    status: { type: String, default: "pending" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const AdminPayment = mongoose.model("admin_payments", adminPaymentSchema);
module.exports = { AdminPayment };
