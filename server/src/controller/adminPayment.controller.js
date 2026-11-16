const { AdminPayment } = require("../models/adminPayment.model");

const allowedStatuses = ["pending", "verified", "reject"];
const allowedPriceModes = ["standard", "custom"];
const allowedPaymentScopes = ["global", "per_client"];

const getPayments = async (req, res) => {
  try {
    const list = await AdminPayment.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const data = await AdminPayment.findById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createPayment = async (req, res) => {
  try {
    const { paymentScope, clientId, clientName, priceMode, totalAmount, platformFee, advocateFee, status, notes } = req.body;

    const normalizedStatus = String(status || "pending").toLowerCase();
    const normalizedMode = String(priceMode || "standard").toLowerCase();
    const normalizedScope = String(paymentScope || "global").toLowerCase();
    const finalScope = allowedPaymentScopes.includes(normalizedScope) ? normalizedScope : "global";
    const finalClientId = finalScope === "per_client" ? clientId || null : null;
    const finalClientName = finalScope === "per_client" ? String(clientName || "").trim() : "";

    const created = await AdminPayment.create({
      paymentScope: finalScope,
      clientId: finalClientId,
      clientName: finalClientName,
      priceMode: allowedPriceModes.includes(normalizedMode) ? normalizedMode : "standard",
      totalAmount: Number(totalAmount || 0),
      platformFee: Number(platformFee || 0),
      advocateFee: Number(advocateFee || 0),
      status: allowedStatuses.includes(normalizedStatus) ? normalizedStatus : "pending",
      notes: notes || "",
    });

    return res.status(200).json({
      success: true,
      message: "Payment created successfully",
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const existing = await AdminPayment.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Payment not found" });
    }

    const normalizedStatus = String(req.body.status || existing.status).toLowerCase();
    const normalizedMode = String(req.body.priceMode || existing.priceMode).toLowerCase();
    const normalizedScope = String(req.body.paymentScope || existing.paymentScope || (existing.clientId ? "per_client" : "global")).toLowerCase();
    const finalScope = allowedPaymentScopes.includes(normalizedScope) ? normalizedScope : "global";
    const finalClientId = finalScope === "per_client"
      ? (req.body.clientId || existing.clientId || null)
      : null;
    const finalClientName = finalScope === "per_client"
      ? String(req.body.clientName || existing.clientName || "").trim()
      : "";

    const updated = await AdminPayment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
        paymentScope: finalScope,
        clientId: finalClientId,
        clientName: finalClientName,
        priceMode: allowedPriceModes.includes(normalizedMode) ? normalizedMode : existing.priceMode,
        totalAmount: Number(req.body.totalAmount || 0),
        platformFee: Number(req.body.platformFee || 0),
        advocateFee: Number(req.body.advocateFee || 0),
        status: allowedStatuses.includes(normalizedStatus) ? normalizedStatus : existing.status,
        notes: req.body.notes || "",
        },
        $unset: { noticeId: 1 },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
};
