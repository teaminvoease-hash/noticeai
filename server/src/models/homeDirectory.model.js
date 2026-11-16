const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema(
  {
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const videoSchema = new Schema(
  {
    youtube: { type: String, default: "" },
    tutorial: { type: String, default: "" },
    demo: { type: String, default: "" },
  },
  { _id: false }
);

const newFeaturesSchema = new Schema(
  {
    releaseDate: { type: String, default: "" },
    features: [{ type: Schema.Types.Mixed }],
  },
  { _id: false }
);

const aiToolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    pricing: { type: String, default: "Freemium" },
    price: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    icon: { type: String, default: "" },
    tags: [{ type: String }],
    features: [{ type: String }],
    usecase: [{ type: String }],
    platform: [{ type: String }],
    badges: [{ type: String }],
    website: { type: String, default: "" },
    videos: { type: videoSchema, default: () => ({}) },
    newFeatures: { type: newFeaturesSchema, default: null },
  },
  { _id: false }
);

const homeDirectorySchema = new Schema(
  {
    key: { type: String, default: "default", unique: true },
    categories: [categorySchema],
    aiTools: [aiToolSchema],
  },
  { timestamps: true }
);

const HomeDirectory = mongoose.model("homeDirectory", homeDirectorySchema);

module.exports = { HomeDirectory };
