const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

const Blog = mongoose.model("blog", blogSchema);

module.exports = { Blog };
