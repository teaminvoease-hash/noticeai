const express = require("express"),
  mongoose = require("mongoose"),
  crypto = require("crypto");
const a = require("./access"),
  {
    IntakeDraft,
    MatterEvent,
    DraftVersion,
  } = require("./models/matterWork.model"),
  service = require("./matterServices");
const { ClientPayment } = require("./models/clientPayment.model");
const router = express.Router();
const scalar = (value, max = 100000) => {
  if (typeof value !== "string" || value.length > max)
    a.fail(400, "Invalid request field");
  return value.trim();
};
const fields = [
  "subject",
  "category",
  "defaulterId",
  "recipientDetails",
  "caseSummary",
  "supportingDocument",
];
async function ownDraft(req) {
  const d = await IntakeDraft.findOne({
    _id: req.params.id,
    clientId: req.session.user.id,
  });
  if (!d) a.fail(404, "Saved request not found");
  return d;
}
router.get(
  "/intake-drafts",
  a.allow("client"),
  a.wrap(async (req, res) =>
    res.json({
      success: true,
      data: await IntakeDraft.find({
        clientId: req.session.user.id,
        state: { $ne: "submitted" },
      }).sort({ updatedAt: -1 }),
    }),
  ),
);
router.post(
  "/intake-drafts",
  a.allow("client"),
  a.wrap(async (req, res) => {
    if (
      (await IntakeDraft.countDocuments({
        clientId: req.session.user.id,
        state: { $ne: "submitted" },
      })) >= 30
    )
      a.fail(
        409,
        "You have 30 saved requests. Resume or submit an existing one.",
      );
    res.json({
      success: true,
      data: await IntakeDraft.create({
        clientId: req.session.user.id,
        fields: {},
      }),
    });
  }),
);
router.get(
  "/intake-drafts/:id",
  a.allow("client"),
  a.wrap(async (req, res) =>
    res.json({ success: true, data: await ownDraft(req) }),
  ),
);
router.put(
  "/intake-drafts/:id",
  a.allow("client"),
  a.wrap(async (req, res) => {
    const d = await ownDraft(req);
    if (d.state !== "draft")
      a.fail(409, "This request is being submitted or is already submitted.");
    if (req.body.revision !== d.revision)
      a.fail(
        409,
        "This saved request changed in another tab. Reload the saved version before editing.",
      );
    const values = {};
    for (const k of fields)
      values[k] = scalar(
        req.body.fields?.[k] || "",
        k === "subject"
          ? 200
          : k === "category"
            ? 100
            : k === "caseSummary"
              ? 20000
              : 3000,
      );
    if (
      values.defaulterId &&
      !(await a.ClientDefaulter.exists({
        _id: values.defaulterId,
        clientId: req.session.user.id,
      }))
    )
      a.fail(404, "Recipient not found");
    const attachments = req.body.fields?.supportingDocuments || [];
    if (
      !Array.isArray(attachments) ||
      attachments.length > 5 ||
      attachments.some((f) => typeof f !== "string")
    )
      a.fail(400, "Choose up to five supporting documents");
    values.supportingDocuments = [...new Set(attachments)];
    values.supportingDocument =
      values.supportingDocuments[0] || values.supportingDocument;
    await a.checkFiles({
      ...req,
      body: { ...values, responseFiles: values.supportingDocuments },
    });
    const step = Number(req.body.step);
    if (!Number.isInteger(step) || step < 0 || step > 4)
      a.fail(400, "Invalid request step");
    const data = await IntakeDraft.findOneAndUpdate(
      {
        _id: d._id,
        clientId: req.session.user.id,
        revision: d.revision,
        state: "draft",
      },
      { $set: { fields: values, step }, $inc: { revision: 1 } },
      { new: true },
    );
    if (!data) a.fail(409, "Request changed. Reload before editing.");
    res.json({ success: true, data });
  }),
);
router.post(
  "/intake-drafts/:id/submit",
  a.allow("client"),
  a.wrap(async (req, res) => {
    const d = await ownDraft(req);
    const existing = await a.ClientNotice.findOne({
      intakeDraftId: String(d._id),
      clientId: req.session.user.id,
    });
    if (existing) {
      await IntakeDraft.updateOne(
        { _id: d._id },
        { $set: { state: "submitted", noticeId: String(existing._id) } },
      );
      return res.json({ success: true, data: existing });
    }
    if (req.body.revision !== d.revision)
      a.fail(409, "The request changed. Reload and review the saved version.");
    const v = d.toObject().fields || {};
    if (
      !v.subject ||
      !v.category ||
      !v.defaulterId ||
      String(v.caseSummary || "").length < 20
    )
      a.fail(
        400,
        "Complete matter type, subject, recipient and at least 20 characters describing the facts.",
      );
    const recipient = await a.ClientDefaulter.findOne({
      _id: v.defaulterId,
      clientId: req.session.user.id,
    });
    if (!recipient) a.fail(404, "Recipient not found");
    const profile = await a.Client.findById(req.session.user.id);
    if (!profile?.authorityLetter)
      a.fail(
        409,
        "Upload your signed authority letter in Profile before submitting. Your draft is saved.",
      );
    if (d.state === "submitting" && d.lockedAt > Date.now() - 120000)
      a.fail(
        409,
        "Submission is processing. Wait, then reopen this saved request to check the result.",
      );
    const locked = await IntakeDraft.findOneAndUpdate(
      {
        _id: d._id,
        revision: d.revision,
        $or: [
          { state: "draft" },
          {
            state: "submitting",
            lockedAt: { $lt: new Date(Date.now() - 120000) },
          },
        ],
      },
      { $set: { state: "submitting", lockedAt: new Date() } },
      { new: true },
    );
    if (!locked) a.fail(409, "Submission is already processing.");
    let result,
      code = 200;
    try {
      req.body = {
        ...v,
        clientId: req.session.user.id,
        defaulterName: recipient.name,
        intakeDraftId: String(d._id),
      };
      await a.checkFiles(req);
      await require("./controller/clientPortal.controller").submitNotice(req, {
        status(n) {
          code = n;
          return this;
        },
        json(data) {
          result = data;
          return data;
        },
      });
      const n = await a.ClientNotice.findOne({
        intakeDraftId: String(d._id),
        clientId: req.session.user.id,
      });
      if (n) {
        await IntakeDraft.updateOne(
          { _id: d._id },
          { $set: { state: "submitted", noticeId: String(n._id) } },
        );
        await MatterEvent.updateOne(
          { noticeId: n.noticeId, label: "Guided request submitted" },
          {
            $setOnInsert: { actorId: req.session.user.id, actorRole: "client" },
          },
          { upsert: true },
        );
        return res.json({ success: true, data: n });
      }
      await IntakeDraft.updateOne({ _id: d._id }, { $set: { state: "draft" } });
      return res
        .status(code)
        .json(
          result || {
            success: false,
            message: "Unable to submit. Your request remains saved.",
          },
        );
    } catch (e) {
      await IntakeDraft.updateOne(
        { _id: d._id, state: "submitting" },
        { $set: { state: "draft" } },
      );
      throw e;
    }
  }),
);
// Minimal recipient intake for all matter types; invoice details are optional.
router.post(
  "/intake-recipients",
  a.allow("client"),
  a.wrap(async (req, res) => {
    const name = scalar(req.body.name || "", 200),
      address = scalar(req.body.address || "", 2000),
      email = scalar(req.body.email || "", 254);
    if (!name || !address)
      a.fail(400, "Recipient name and postal address are required");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      a.fail(400, "Enter a valid recipient email");
    res.json({
      success: true,
      data: await a.ClientDefaulter.create({
        clientId: req.session.user.id,
        defaulterId: "REC-" + crypto.randomUUID(),
        name,
        address,
        email,
        phone: scalar(req.body.phone || "", 40),
        companyName: scalar(req.body.companyName || "", 200),
      }),
    });
  }),
);
router.get(
  "/matters/:id",
  a.allow("client", "admin", "lawyer"),
  a.wrap(async (req, res) => {
    const n = await a.noticeAccess(req, req.params.id),
      role = req.session.user.role;
    const [documents, events, versions, payments, client, recipient] =
      await Promise.all([
        a.ClientDocument.find({ noticeId: n.noticeId })
          .sort({ createdAt: -1 })
          .lean(),
        MatterEvent.find({ noticeId: n.noticeId })
          .sort({ _id: -1 })
          .limit(30)
          .lean(),
        DraftVersion.find({ noticeId: n.noticeId })
          .sort({ revision: -1 })
          .limit(10)
          .lean(),
        ClientPayment.find({ noticeId: n.noticeId, clientId: n.clientId })
          .select(role === "lawyer" ? "status createdAt updatedAt" : "-__v")
          .sort({ createdAt: -1 })
          .lean(),
        a.Client.findById(n.clientId)
          .select(
            "name company authorityStatus authorityLetter authorityTemplate authorityFeedback authoritySubmittedAt authorityReviewedAt",
          )
          .lean(),
        mongoose.isValidObjectId(n.defaulterId)
          ? a.ClientDefaulter.findOne({
              _id: n.defaulterId,
              clientId: n.clientId,
            }).lean()
          : Promise.resolve(null),
      ]);
    res.json({
      success: true,
      data: {
        notice: n,
        client,
        recipient,
        documents: documents.map((d) => ({
          ...d,
          status: service.docState(d),
        })),
        events,
        versions,
        payments,
        workflow: require("./workflow").workflow(n, client, documents),
      },
    });
  }),
);
for (const [kind, Model, sort] of [
  ["events", MatterEvent, { _id: -1 }],
  ["versions", DraftVersion, { revision: -1 }],
])
  router.get(
    "/matters/:id/" + kind,
    a.allow("client", "admin", "lawyer"),
    a.wrap(async (req, res) => {
      const n = await a.noticeAccess(req, req.params.id);
      const filter = { noticeId: n.noticeId };
      if (req.query.before) {
        if (kind === "events") {
          if (!mongoose.isValidObjectId(req.query.before))
            a.fail(400, "Invalid cursor");
          filter._id = { $lt: req.query.before };
        } else {
          const before = Number(req.query.before);
          if (!Number.isInteger(before) || before < 0)
            a.fail(400, "Invalid version cursor");
          filter.revision = { $lt: before };
        }
      }
      res.json({
        success: true,
        data: await Model.find(filter)
          .sort(sort)
          .limit(kind === "events" ? 30 : 10),
      });
    }),
  );
router.post(
  "/matters/:id/document-requests",
  a.allow("admin", "lawyer"),
  a.wrap(async (req, res) => {
    const n = await a.noticeAccess(req, req.params.id);
    if (n.signedFile)
      a.fail(409, "This matter already has a final signed notice.");
    const type = scalar(req.body.type || "", 150),
      message = scalar(req.body.requestMessage || "", 2000);
    if (!type || !message)
      a.fail(400, "Document title and instructions are required");
    let data;
    await mongoose.connection.transaction(async (session) => {
      [data] = await a.ClientDocument.create(
        [
          {
            clientId: n.clientId,
            noticeId: n.noticeId,
            docId: "DOC-" + crypto.randomUUID(),
            type,
            requestMessage: message,
            requestedByRole: req.session.user.role,
            requestedById: req.session.user.id,
            status: "Requested",
          },
        ],
        { session },
      );
      await a.ClientNotice.updateOne(
        { _id: n._id },
        { $set: { status: "pending" } },
        { session },
      );
      await service.event(req, n, "Document requested", type, session);
    });
    res.json({ success: true, data });
  }),
);
router.post(
  "/document-requests/:docId/respond",
  a.allow("client"),
  a.wrap(service.respondDocument),
);
router.post(
  "/document-requests/:docId/review",
  a.allow("admin", "lawyer"),
  a.wrap(service.reviewDocument),
);
module.exports = router;
