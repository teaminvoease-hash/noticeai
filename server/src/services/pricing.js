const { AdminPayment } = require("../models/adminPayment.model");
async function priceFor(clientId) {
  const p =
    (await AdminPayment.findOne({
      paymentScope: "per_client",
      clientId,
      status: { $in: ["verified", "active"] },
    }).sort({ updatedAt: -1 })) ||
    (await AdminPayment.findOne({
      paymentScope: "global",
      status: { $in: ["verified", "active"] },
    }).sort({ updatedAt: -1 }));
  if (
    !p ||
    !Number.isFinite(p.totalAmount) ||
    p.totalAmount <= 0 ||
    Math.abs(Math.round(p.totalAmount * 100) - p.totalAmount * 100) >
      0.0000001 ||
    !Number.isSafeInteger(Math.round(p.totalAmount * 100))
  )
    throw Object.assign(
      new Error("Ask the administrator to configure a valid service price."),
      { status: 409 },
    );
  return p.totalAmount;
}
module.exports = { priceFor };
