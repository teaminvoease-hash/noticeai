const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const templateSchema = new Schema(
  {
    template_id: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    version: { type: String, default: "v1.0" },
    status: { type: String, default: "active" },
    body: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const Template = mongoose.model("templates", templateSchema);
module.exports = { Template };
