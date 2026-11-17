const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientPaymentSchema = new Schema(
  {
    clientId: { type: String, required: true },
    noticeId: { type: String, required: true },
    txnId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    activeGatewayNotice:{type:String,unique:true,sparse:true},
    gatewayRequest:{firstname:String,email:String,phone:String,productinfo:String,udf1:String,udf2:String},
    billingEmail: { type: String },
    receiptFileName: { type: String },
    reconciliationReference:String, verifiedBy:String, verifiedAt:Date,
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

const ClientPayment = mongoose.model("client_payments", clientPaymentSchema);
module.exports = { ClientPayment };
