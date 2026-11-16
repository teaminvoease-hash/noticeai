const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientDefaulterSchema = new Schema(
  {
    clientId: { type: String, required: true },
    defaulterId: { type: String, unique: true, sparse: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    companyName: { type: String, default: "" },
    address: { type: String, default: "" },
    totalDueAmount: { type: Number, default: 0 },
    lastInvoiceDate: { type: String, default: "" },
  },
  { timestamps: true }
);

const ClientDefaulter = mongoose.model("client_defaulters", clientDefaulterSchema);
module.exports = { ClientDefaulter };
