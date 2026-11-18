const mongoose = require("mongoose");
const a = require("../access");
const { MatterEvent } = require("../models/matterWork.model");
const { notifyClient } = require("./clientUpdates");
async function saveDelivery(req, res) {
  const n = await a.noticeAccess(req, req.params.id);
  if (!n.signedFile)
    a.fail(409, "Upload the final signed notice before recording dispatch.");
  await require("./professionalReview").requireVetting(n);
  const text = (k) =>
    typeof req.body[k] === "string" ? req.body[k].trim() : "";
  const courier = text("courier"),
    trackingId = text("trackingId"),
    dispatchDate = text("dispatchDate"),
    deliveryStatus = text("deliveryStatus");
  if (
    !courier ||
    courier.length > 120 ||
    !trackingId ||
    trackingId.length > 160 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dispatchDate) ||
    !Number.isFinite(Date.parse(dispatchDate)) ||
    new Date(dispatchDate).toISOString().slice(0, 10) !== dispatchDate
  )
    a.fail(400, "Enter a courier, tracking reference and valid dispatch date.");
  if (!["In Transit", "Delivered", "Returned"].includes(deliveryStatus))
    a.fail(400, "Choose a valid delivery status.");
  const note = text("note");
  if (note.length > 2000)
    a.fail(400, "Use a client update of up to 2,000 characters.");
  if (
    req.body.expectedUpdatedAt &&
    req.body.expectedUpdatedAt !== n.updatedAt.toISOString()
  )
    a.fail(
      409,
      "The matter changed. Refresh before saving the delivery update.",
    );
  const files = {};
  for (const key of ["courierReceipt", "proofOfDelivery"]) {
    if (req.body[key] === undefined || req.body[key] === "") continue;
    const name = text(key);
    if (
      !/^[\w-]+\.(pdf|png|jpe?g)$/i.test(name) ||
      !(await a.fileAccess(req, name))
    )
      a.fail(403, "Choose an accessible PDF, PNG or JPEG document.");
    files[key] = name;
  }
  let nextUpdateAt = n.nextUpdateAt || null;
  if (Object.hasOwn(req.body, "nextUpdateAt")) {
    nextUpdateAt = req.body.nextUpdateAt
      ? new Date(req.body.nextUpdateAt)
      : null;
    if (
      nextUpdateAt &&
      (!Number.isFinite(nextUpdateAt.getTime()) || nextUpdateAt <= new Date())
    )
      a.fail(400, "Choose a future time for the next client update.");
  } else if (deliveryStatus === "Delivered") nextUpdateAt = null;
  const summary =
    `${deliveryStatus}: ${courier}, tracking ${trackingId}.` +
    (note ? ` ${note}` : "");
  const fields = {
    courier,
    trackingId,
    dispatchDate,
    deliveryStatus,
    ...files,
    clientUpdateNote: summary,
    nextUpdateAt,
    handoffUpdatedBy: req.session.user.id,
  };
  // A repeated identical save must not create another notification.
  const unchanged = Object.entries(fields).every(
    ([k, v]) =>
      k === "handoffUpdatedBy" ||
      (k === "nextUpdateAt"
        ? String(n[k] || "") === String(v || "")
        : (n[k] || "") === v),
  );
  if (unchanged) return res.json({ success: true, data: n });
  let data;
  await mongoose.connection.transaction(async (session) => {
    data = await a.ClientNotice.findOneAndUpdate(
      {
        _id: n._id,
        updatedAt: n.updatedAt,
        ...(req.session.user.role === "lawyer"
          ? { lawyerId: req.session.user.id }
          : {}),
      },
      { $set: fields },
      { new: true, session },
    );
    if (!data)
      a.fail(
        409,
        "Another update was saved. Refresh before updating delivery.",
      );
    await MatterEvent.create(
      [
        {
          noticeId: n.noticeId,
          actorId: req.session.user.id,
          actorRole: req.session.user.role,
          label: "Courier and delivery update",
          detail: summary,
          attachments: Object.entries(files).map(([kind, fileName]) => ({
            kind,
            fileName,
          })),
        },
      ],
      { session },
    );
    await notifyClient(
      n,
      summary +
        (files.courierReceipt ? " Courier receipt is available." : "") +
        (files.proofOfDelivery ? " Delivery proof is available." : ""),
      session,
      "delivery",
    );
  });
  res.json({ success: true, data });
}
module.exports = { saveDelivery };
