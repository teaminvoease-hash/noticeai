const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lawyerSchema = new Schema(
  {
    credentialReview: {
      status: { type: String, enum: ["verified", "withdrawn"] },
      barCouncil: String,
      enrolmentNumber: String,
      sourceReference: String,
      checkedAt: Date,
      checkedBy: String,
    },
    advocate_id: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    enrollmentNo: { type: String },
    barId: { type: String },
    city: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    aadhaarFile: { type: String },
    panFile: { type: String },
    barIdFile: { type: String },
    firmName: { type: String, default: "" },
    designation: { type: String, default: "Advocate" },
    signatureImage: { type: String, default: "" },
    status: { type: String, default: "pending" },
  },
  {
    timestamps: true,
  },
);

const Lawyer = mongoose.model("lawyers", lawyerSchema);

module.exports = { Lawyer };
