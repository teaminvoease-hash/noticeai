const mongoose = require("mongoose"),
  sanitize = require("sanitize-html");
const a = require("./access");
const { MatterEvent, DraftVersion } = require("./models/matterWork.model");
const docState = (d) =>
  ["Reviewed", "Corrections needed", "Uploaded", "Requested"].includes(d.status)
    ? d.status
    : (d.responseFiles || []).length || d.fileName
      ? "Uploaded"
      : "Requested";
const event = (req, notice, label, detail = "", session) =>
  MatterEvent.create(
    [
      {
        noticeId: notice.noticeId,
        actorId: req.session.user.id,
        actorRole: req.session.user.role,
        label,
        detail,
      },
    ],
    session ? { session } : {},
  );
// Every document mutation writes the parent matter in the same transaction.
// This serializes it with signing and reassignment and invalidates old approval.
async function lockDocumentMatter(req, notice, session) {
  const filter = {
    _id: notice._id,
    updatedAt: notice.updatedAt,
    signedFile: { $in: [null, ""] },
  };
  if (req.session.user.role === "lawyer") filter.lawyerId = req.session.user.id;
  const changed = await a.ClientNotice.findOneAndUpdate(
    filter,
    { $set: { status: "pending" } },
    { new: true, session },
  );
  if (!changed)
    a.fail(
      409,
      "The matter changed or has a final signed notice. Refresh before updating documents.",
    );
  return changed;
}
async function saveDraft(req, res) {
  const n = await a.noticeAccess(req, req.params.id);
  if (n.signedFile) a.fail(409, "A final signed notice cannot be edited.");
  if (n.paymentStatus !== "Paid")
    a.fail(409, "Payment must be verified before editing the draft");
  const content = sanitize(String(req.body.generatedNotice || ""));
  if (!content.trim() || content.length > 100000)
    a.fail(400, "Enter a draft of up to 100,000 characters");
  const revision = n.draftRevision || 0;
  if (req.body.revision !== undefined && req.body.revision !== revision)
    a.fail(
      409,
      "The draft has changed. Refresh and compare the latest version before saving.",
    );
  let updated;
  await mongoose.connection.transaction(async (session) => {
    updated = await a.ClientNotice.findOneAndUpdate(
      {
        _id: n._id,
        ...(req.session.user.role === "lawyer"
          ? { lawyerId: req.session.user.id }
          : {}),
        updatedAt: n.updatedAt,
        $expr: {
          $eq: [{ $ifNull: ["$draftRevision", 0] }, n.draftRevision || 0],
        },
        signedFile: { $in: [null, ""] },
      },
      {
        $set: { generatedNotice: content, status: "pending" },
        $inc: { draftRevision: 1 },
      },
      { new: true, session },
    );
    if (!updated) a.fail(409, "The matter changed. Refresh before saving.");
    if (revision === 0)
      await DraftVersion.updateOne(
        { noticeId: n.noticeId, revision: 0 },
        {
          $setOnInsert: {
            content: n.generatedNotice,
            actorRole: "system",
            label: "Baseline when version history began",
          },
        },
        { upsert: true, session },
      );
    await DraftVersion.create(
      [
        {
          noticeId: n.noticeId,
          revision: revision + 1,
          content,
          actorId: req.session.user.id,
          actorRole: req.session.user.role,
          label: "Professional draft saved",
        },
      ],
      { session },
    );
    await event(
      req,
      n,
      "Draft version " + (revision + 1) + " saved",
      "",
      session,
    );
  });
  return res.json({ success: true, data: updated });
}
async function respondDocument(req, res, legacy = false) {
  const doc = await a.ClientDocument.findById(
    req.params.docId || req.params.id,
  );
  if (!doc) a.fail(404, "Document request not found");
  const n = await a.noticeAccess(req, doc.noticeId, true);
  if (n.signedFile)
    a.fail(409, "This matter already has a final signed notice.");
  if (
    req.body.revision !== undefined &&
    req.body.revision !== (doc.revision || 0)
  )
    a.fail(409, "The document request changed. Refresh first.");
  const files = req.body.responseFiles;
  const state = docState(doc);
  if (!["Requested", "Corrections needed"].includes(state))
    a.fail(
      409,
      "The current upload is awaiting review or has already been reviewed.",
    );
  if (
    !Array.isArray(files) ||
    !files.length ||
    files.length > 5 ||
    files.some((f) => typeof f !== "string")
  )
    a.fail(400, "Upload between one and five files.");
  if ((doc.responseHistory || []).length >= 20)
    a.fail(409, "Open a new document request for further submissions.");
  await a.checkFiles(req);
  if (n.signedFile)
    a.fail(409, "A final signed notice cannot change documents.");
  let data;
  await mongoose.connection.transaction(async (session) => {
    await lockDocumentMatter(req, n, session);
    data = await a.ClientDocument.findOneAndUpdate(
      {
        _id: doc._id,
        updatedAt: doc.updatedAt,
        $expr: { $eq: [{ $ifNull: ["$revision", 0] }, doc.revision || 0] },
      },
      {
        $set: {
          responseFiles: [...new Set(files)],
          status: "Uploaded",
          reviewNote: "",
          reviewedAt: null,
          reviewedBy: "",
        },
        $inc: { revision: 1 },
        $push: {
          responseHistory: {
            files,
            uploadedAt: new Date(),
            actorId: req.session.user.id,
          },
        },
      },
      { new: true, session },
    );
    if (!data) a.fail(409, "The request changed. Refresh first.");
    await event(req, n, "Documents uploaded", doc.type, session);
  });
  return res.json({
    success: true,
    data,
    message: "Files saved. Awaiting reviewer assessment.",
  });
}
async function reviewDocument(req, res) {
  const doc = await a.ClientDocument.findById(
    req.params.docId || req.params.id,
  );
  if (!doc) a.fail(404, "Document request not found");
  const n = await a.noticeAccess(req, doc.noticeId, true);
  if (docState(doc) !== "Uploaded")
    a.fail(409, "Review is available after a client upload.");
  if (req.body.revision !== (doc.revision || 0))
    a.fail(
      409,
      "A newer document response is available. Refresh before reviewing.",
    );
  const state = req.body.status,
    note = String(req.body.reviewNote || "").trim();
  if (!["Reviewed", "Corrections needed"].includes(state))
    a.fail(400, "Choose Reviewed or Corrections needed");
  if (state === "Corrections needed" && !note)
    a.fail(400, "Describe the corrections required.");
  if (note.length > 2000)
    a.fail(400, "Keep review notes within 2,000 characters.");
  if (n.signedFile)
    a.fail(409, "A final signed notice cannot change documents.");
  let data;
  await mongoose.connection.transaction(async (session) => {
    await lockDocumentMatter(req, n, session);
    data = await a.ClientDocument.findOneAndUpdate(
      {
        _id: doc._id,
        updatedAt: doc.updatedAt,
        $expr: { $eq: [{ $ifNull: ["$revision", 0] }, doc.revision || 0] },
      },
      {
        $set: {
          status: state,
          reviewNote: note,
          reviewedAt: new Date(),
          reviewedBy: req.session.user.id,
        },
        $inc: { revision: 1 },
      },
      { new: true, session },
    );
    if (!data) a.fail(409, "The response changed. Refresh before reviewing.");
    await event(
      req,
      n,
      state === "Reviewed"
        ? "Documents reviewed"
        : "Document corrections requested",
      note,
      session,
    );
  });
  return res.json({ success: true, data });
}
async function replaceRequest(req, n, patch) {
  let updated;
  const revision = n.draftRevision || 0;
  await mongoose.connection.transaction(async (session) => {
    updated = await a.ClientNotice.findOneAndUpdate(
      {
        _id: n._id,
        updatedAt: n.updatedAt,
        $expr: {
          $eq: [{ $ifNull: ["$draftRevision", 0] }, n.draftRevision || 0],
        },
        paymentStatus: { $ne: "Paid" },
        lawyerId: { $in: [null, ""] },
        signedFile: { $in: [null, ""] },
      },
      { $set: patch, $inc: { draftRevision: 1 } },
      { new: true, session },
    );
    if (!updated)
      a.fail(
        409,
        "This matter changed or has entered review. Refresh before editing.",
      );
    if (revision === 0)
      await DraftVersion.updateOne(
        { noticeId: n.noticeId, revision: 0 },
        {
          $setOnInsert: {
            content: n.generatedNotice,
            actorRole: "system",
            label: "Baseline when version history began",
          },
        },
        { upsert: true, session },
      );
    await DraftVersion.create(
      [
        {
          noticeId: n.noticeId,
          revision: revision + 1,
          content: patch.generatedNotice,
          actorId: req.session.user.id,
          actorRole: req.session.user.role,
          label: "Preliminary draft regenerated after facts changed",
        },
      ],
      { session },
    );
    await event(
      req,
      n,
      "Request facts updated and preliminary draft regenerated",
      "",
      session,
    );
  });
  return updated;
}
async function reviewNotice(req, res) {
  const n = await a.noticeAccess(req, req.params.id),
    status = String(req.body.status || "").toLowerCase();
  if (!["pending", "approved", "rejected", "verified"].includes(status))
    a.fail(400, "Invalid review status");
  if (n.signedFile)
    a.fail(409, "A signed final notice cannot change review status");
  if (
    req.body.revision !== undefined &&
    req.body.revision !== (n.draftRevision || 0)
  )
    a.fail(409, "A newer draft is available. Review it before approving.");
  if (["approved", "verified"].includes(status) && n.paymentStatus !== "Paid")
    a.fail(409, "Payment must be verified before review approval");
  if (
    ["approved", "verified"].includes(status) &&
    !String(n.generatedNotice || "").trim()
  )
    a.fail(409, "Save and review a notice draft before approval.");
  let data;
  await mongoose.connection.transaction(async (session) => {
    const docs = await a.ClientDocument.find({ noticeId: n.noticeId }).session(
      session,
    );
    if (
      ["approved", "verified"].includes(status) &&
      docs.some((d) => docState(d) !== "Reviewed")
    )
      a.fail(
        409,
        "Review all requested document responses before approving the notice.",
      );
    data = await a.ClientNotice.findOneAndUpdate(
      {
        _id: n._id,
        ...(req.session.user.role === "lawyer"
          ? { lawyerId: req.session.user.id }
          : {}),
        updatedAt: n.updatedAt,
        $expr: {
          $eq: [{ $ifNull: ["$draftRevision", 0] }, n.draftRevision || 0],
        },
      },
      { $set: { status } },
      { new: true, session },
    );
    if (!data) a.fail(409, "The matter changed. Refresh before reviewing.");
    await event(req, n, "Professional review status updated", status, session);
  });
  res.json({ success: true, data });
}
async function signNotice(req, res) {
  const n = await a.noticeAccess(req, req.params.id);
  if (
    n.paymentStatus !== "Paid" ||
    !["approved", "verified"].includes(n.status)
  )
    a.fail(409, "Payment and review approval are required");
  if (n.signedFile) a.fail(409, "The final signed notice is already uploaded");
  if (
    req.body.revision !== undefined &&
    req.body.revision !== (n.draftRevision || 0)
  )
    a.fail(
      409,
      "The draft changed. Review the current version before uploading a signed file.",
    );
  if (!req.body.signedFile?.endsWith(".pdf"))
    a.fail(400, "A signed PDF is required");
  let data;
  await mongoose.connection.transaction(async (session) => {
    const documents = await a.ClientDocument.find({
      noticeId: n.noticeId,
    }).session(session);
    if (documents.some((d) => docState(d) !== "Reviewed"))
      a.fail(
        409,
        "Review every document response before uploading the final signed notice.",
      );
    if (!String(n.generatedNotice || "").trim())
      a.fail(409, "A saved notice draft is required before signing.");
    data = await a.ClientNotice.findOneAndUpdate(
      {
        _id: n._id,
        lawyerId: req.session.user.id,
        status: { $in: ["approved", "verified"] },
        paymentStatus: "Paid",
        updatedAt: n.updatedAt,
        $expr: {
          $eq: [{ $ifNull: ["$draftRevision", 0] }, n.draftRevision || 0],
        },
        signedFile: { $in: [null, ""] },
      },
      {
        $set: {
          signedFile: req.body.signedFile,
          signedNoticeStatus: "Uploaded",
        },
      },
      { new: true, session },
    );
    if (!data) a.fail(409, "The matter changed. Refresh before uploading.");
  });
  res.json({ success: true, data });
}
module.exports = {
  docState,
  lockDocumentMatter,
  event,
  saveDraft,
  respondDocument,
  reviewDocument,
  replaceRequest,
  reviewNotice,
  signNotice,
};
