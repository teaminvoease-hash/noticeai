const express = require("express"),
  mongoose = require("mongoose"),
  crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");
const a = require("./access"),
  legal = require("./services/legalAi"),
  { extractText } = require("./services/documentText"),
  { exportNotice } = require("./services/exports");
const Artifact = mongoose.model(
  "ai_artifacts",
  new mongoose.Schema(
    {
      noticeId: { type: String, index: true, required: true },
      kind: { type: String, enum: ["facts", "draft"] },
      draft: String,
      facts: {
        summary: String,
        parties: [String],
        dates: [String],
        amounts: [String],
        obligations: [String],
        missingInformation: [String],
        sourceQuotes: [String],
      },
      references: [String],
      actorId: String,
      actorRole: String,
      provider: String,
      model: String,
      sourceRevision: Number,
      inputHash: String,
      sourceFile: String,
      intent: String,
      instructions: String,
      appliedRevision: Number,
      appliedAt: Date,
      appliedBy: String,
    },
    { timestamps: true },
  ),
);
const router = express.Router();
router.use("/ai", a.allow("client", "lawyer", "admin"));
const processLimit = rateLimit({
  windowMs: 60000,
  limit: 10,
  keyGenerator: (req) => req.session.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const aiLimit = rateLimit({
  windowMs: 60000,
  limit: 3,
  keyGenerator: (req) => req.session.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
router.get("/ai/status", (req, res) =>
  res.json({ success: true, data: legal.status() }),
);
router.post(
  "/ai/extract",
  processLimit,
  a.wrap(async (req, res) => {
    const name = req.body.fileName;
    if (typeof name !== "string" || !(await a.fileAccess(req, name)))
      a.fail(404, "Document not found");
    const info = await require("./models/file.model").findOne({ name });
    const result = await extractText(
      await require("./storage").read(name),
      name,
    );
    res.json({
      success: true,
      data: { ...result, fileName: name, originalName: info?.original || name },
    });
  }),
);
router.get(
  "/ai/matters/:id/artifacts",
  a.wrap(async (req, res) => {
    const n = await a.noticeAccess(req, req.params.id);
    res.json({
      success: true,
      data: await Artifact.find({ noticeId: n.noticeId })
        .select(req.session.user.role === "client" ? "-instructions" : "")
        .sort({ createdAt: -1 })
        .limit(15),
    });
  }),
);
router.post(
  "/ai/matters/:id/:kind",
  aiLimit,
  a.wrap(async (req, res) => {
    const n = await a.noticeAccess(req, req.params.id),
      kind = req.params.kind;
    if (!["facts", "draft", "revise"].includes(kind))
      a.fail(400, "Choose facts, a new draft or a draft revision");
    if (n.signedFile)
      a.fail(409, "This matter already has a final signed notice.");
    let instructions = "",
      currentDraft = "";
    if (kind === "revise") {
      if (req.session.user.role !== "lawyer")
        a.fail(
          403,
          "Only the assigned advocate can request a notice revision.",
        );
      if (n.paymentStatus !== "Paid")
        a.fail(
          409,
          "Verified payment is required before revising the saved notice.",
        );
      if (req.body.revision !== (n.draftRevision || 0))
        a.fail(
          409,
          "The saved draft changed. Refresh before requesting a revision.",
        );
      instructions =
        typeof req.body.instructions === "string"
          ? req.body.instructions.trim()
          : "";
      if (instructions.length < 10 || instructions.length > 4000)
        a.fail(400, "Describe the required changes in 10–4,000 characters.");
      currentDraft = require("./services/exports").plain(n.generatedNotice);
      if (!currentDraft.trim())
        a.fail(409, "Save a draft before requesting AI revisions.");
      if (currentDraft.length > 50000)
        a.fail(
          400,
          "This saved draft exceeds the AI revision limit. Continue in the manual draft editor.",
        );
    }
    if (req.body.consentToAi !== true)
      a.fail(
        400,
        "Confirm that the selected content may be sent to the configured AI provider.",
      );
    let text = String(req.body.text || "").slice(0, 50000);
    const fileName = req.body.fileName;
    if (fileName) {
      if (typeof fileName !== "string" || !(await a.fileAccess(req, fileName)))
        a.fail(404, "Document not found");
      const matterFiles = [
        n.supportingDocument,
        ...(n.supportingDocuments || []),
      ];
      if (
        !matterFiles.includes(fileName) &&
        !(await a.ClientDocument.exists({
          noticeId: n.noticeId,
          $or: [
            { fileName },
            { responseFiles: fileName },
            { "responseHistory.files": fileName },
          ],
        }))
      )
        a.fail(
          403,
          "Attach the selected document to this matter before using it as AI evidence.",
        );
      text = (
        await extractText(await require("./storage").read(fileName), fileName)
      ).text;
    }
    if (!text.trim()) text = n.caseSummary;
    if (!text?.trim())
      a.fail(400, "Provide source facts or a readable document.");
    const result = await legal.generate(kind === "revise" ? "draft" : kind, {
      text,
      instructions,
      currentDraft,
      case: {
        subject: n.subject,
        category: n.category,
        facts: n.caseSummary,
        recipientDetails: n.recipientDetails,
      },
      referenceIds: Array.isArray(req.body.referenceIds)
        ? req.body.referenceIds
        : [],
    });
    let artifact;
    await mongoose.connection.transaction(async (session) => {
      [artifact] = await Artifact.create(
        [
          {
            noticeId: n.noticeId,
            kind: kind === "revise" ? "draft" : kind,
            intent: kind === "revise" ? "revision" : "initial",
            instructions,
            draft: result.draft,
            facts: result.facts,
            references: (result.references || []).map((r) => r.id),
            actorId: req.session.user.id,
            actorRole: req.session.user.role,
            provider: result.provider,
            model: result.model,
            sourceRevision: n.draftRevision || 0,
            inputHash: crypto
              .createHash("sha256")
              .update(JSON.stringify({ text, instructions, currentDraft }))
              .digest("hex"),
            sourceFile: fileName || "",
          },
        ],
        { session },
      );
      await require("./matterServices").event(
        req,
        n,
        kind === "facts"
          ? "AI fact proposal prepared"
          : kind === "revise"
            ? "AI revision proposal prepared"
            : "AI draft proposal prepared",
        "Independent review required; no case content changed.",
        session,
      );
    });
    res.json({
      success: true,
      data: { artifact, reviewRequired: true, warnings: result.warnings || [] },
    });
  }),
);
router.post(
  "/ai/artifacts/:artifactId/apply",
  a.allow("lawyer"),
  a.wrap(async (req, res) => {
    const artifact = await Artifact.findById(req.params.artifactId);
    if (!artifact || artifact.kind !== "draft")
      a.fail(404, "Draft proposal not found");
    const n = await a.ClientNotice.findOne({
      noticeId: artifact.noticeId,
      lawyerId: req.session.user.id,
    });
    if (!n) a.fail(404, "Matter not found");
    if (req.body.matterId !== undefined && req.body.matterId !== String(n._id))
      a.fail(409, "This proposal belongs to a different matter. Reopen the correct matter before applying it.");
    if ((n.draftRevision || 0) !== artifact.sourceRevision)
      a.fail(
        409,
        "The saved draft changed after this proposal. Review the current version and generate a fresh proposal.",
      );
    if (req.body.reviewed !== true)
      a.fail(400, "Review the proposal before applying it.");
    const editedDraft = req.body.editedDraft;
    if (
      editedDraft !== undefined &&
      (typeof editedDraft !== "string" ||
        !editedDraft.trim() ||
        editedDraft.length > 100000)
    )
      a.fail(400, "Enter a non-empty proposal of up to 100,000 characters.");
    req.aiArtifact = {
      id: String(artifact._id),
      edited: editedDraft !== undefined && editedDraft !== artifact.draft,
    };
    req.params.id = String(n._id);
    const escape = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    req.body = {
      generatedNotice: (editedDraft === undefined
        ? artifact.draft
        : editedDraft.trim()
      )
        .split(/\n\n+/)
        .map((p) => "<p>" + escape(p).replace(/\n/g, "<br>") + "</p>")
        .join(""),
      revision: artifact.sourceRevision,
    };
    return require("./matterServices").saveDraft(req, res);
  }),
);
router.get(
  "/matters/:id/export/:format",
  a.allow("client", "admin", "lawyer"),
  processLimit,
  a.wrap(async (req, res) => {
    const n = await a.noticeAccess(req, req.params.id);
    if (!["pdf", "docx"].includes(req.params.format))
      a.fail(400, "Choose PDF or DOCX");
    const result = await exportNotice(n, req.params.format);
    res.set("Cache-Control", "private, no-store");
    res
      .attachment(n.noticeId + "-working-copy." + req.params.format)
      .type(result.type)
      .send(result.buffer);
  }),
);
module.exports = router;
