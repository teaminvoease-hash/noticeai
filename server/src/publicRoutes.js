const express = require("express"),
  mongoose = require("mongoose"),
  crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");
const { wrap, allow, fail } = require("./access");
const Enquiry = mongoose.model(
  "public_enquiries",
  new mongoose.Schema(
    {
      reference: { type: String, unique: true },
      name: String,
      business: String,
      email: String,
      phone: String,
      message: String,
      status: { type: String, default: "New" },
      adminNote: String,
      reviewedBy: String,
    },
    { timestamps: true },
  ),
);
const router = express.Router();
router.get("/public/runtime", (_req, res) =>
  res.json({
    success: true,
    data: { staging: process.env.APP_ENV === "staging" },
  }),
);
router.get(
  "/public/pricing",
  wrap(async (req, res) => {
    if (process.env.PUBLIC_PRICE_DISPLAY_APPROVED !== "true")
      return res.json({
        success: true,
        data: {
          available: false,
          note: "Scope and lawful fees are confirmed privately under a separate engagement.",
        },
      });
    const p = await require("./models/adminPayment.model")
      .AdminPayment.findOne({
        paymentScope: "global",
        status: { $in: ["verified", "active"] },
      })
      .sort({ updatedAt: -1 });
    res.json({
      success: true,
      data:
        p && p.totalAmount > 0
          ? {
              available: true,
              amount: p.totalAmount,
              currency: "INR",
              note: "Confirmed scope and any applicable taxes are agreed before payment.",
            }
          : {
              available: false,
              note: "Contact the team for current pricing and matter scope.",
            },
    });
  }),
);
router.post(
  "/public/enquiries",
  rateLimit({
    windowMs: 15 * 60000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  wrap(async (req, res) => {
    if (req.body.website)
      return res.json({ success: true, data: { reference: "received" } });
    const value = (key, max) => {
      const v = String(req.body[key] || "").trim();
      if (v.length > max) fail(400, "The " + key + " field is too long.");
      return v;
    };
    const name = value("name", 150),
      phone = value("phone", 40),
      email = value("email", 254),
      message = value("message", 3000),
      business = value("business", 200);
    if (
      name.length < 2 ||
      phone.replace(/\D/g, "").length < 10 ||
      message.length < 10
    )
      fail(
        400,
        "Provide your name, a valid phone number and a short description.",
      );
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail(400, "Enter a valid email address.");
    const reference = "ENQ-" + crypto.randomUUID();
    await Enquiry.create({ reference, name, phone, email, message, business });
    res.json({
      success: true,
      data: { reference },
      message: "Your enquiry has been recorded for the team.",
    });
  }),
);
router.get(
  "/enquiries",
  allow("admin"),
  wrap(async (req, res) => {
    const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    const [items, total] = await Promise.all([
      Enquiry.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * 25)
        .limit(25),
      Enquiry.countDocuments(),
    ]);
    res.json({ success: true, data: { items, total, page } });
  }),
);
router.post(
  "/enquiries/:id",
  allow("admin"),
  wrap(async (req, res) => {
    if (!["New", "In progress", "Closed"].includes(req.body.status))
      fail(400, "Choose a valid enquiry status.");
    const adminNote = String(req.body.adminNote || "").trim();
    if (adminNote.length > 2000)
      fail(400, "Keep notes within 2,000 characters.");
    const data = await Enquiry.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: req.body.status,
          adminNote,
          reviewedBy: req.session.user.id,
        },
      },
      { new: true },
    );
    if (!data) fail(404, "Enquiry not found");
    res.json({ success: true, data });
  }),
);
module.exports = router;
