const express = require("express"),
  mongoose = require("mongoose");
const a = require("./access"),
  professional = require("./services/professionalReview");
const { ProfessionalReview } = require("./models/matterWork.model");
const router = express.Router();
router.get(
  "/professional-policy",
  a.allow("client", "admin", "lawyer"),
  (_req, res) =>
    res.json({
      success: true,
      data: {
        version: professional.policyVersion,
        checklist: professional.checklist,
        mandatory:
          "Every notice must be vetted and checked by the assigned advocate, who must make necessary corrections and updates before approval, signature and issuance. AI or administrator checks do not replace professional review.",
      },
    }),
);
router.post(
  "/advocates/:id/credential-review",
  a.allow("admin"),
  a.wrap(async (req, res) => {
    const lawyer = await a.Lawyer.findById(req.params.id);
    if (!lawyer) a.fail(404, "Advocate not found");
    const { status } = req.body;
    if (!["verified", "withdrawn"].includes(status))
      a.fail(400, "Choose verified or withdrawn");
    const field = (k) =>
      typeof req.body[k] === "string" ? req.body[k].trim() : "";
    const barCouncil = field("barCouncil"),
      enrolmentNumber = field("enrolmentNumber"),
      sourceReference = field("sourceReference");
    if (
      status === "verified" &&
      (!barCouncil ||
        !enrolmentNumber ||
        sourceReference.length < 10 ||
        req.body.practisingStatusChecked !== true)
    )
      a.fail(
        400,
        "Record the State Bar Council, enrolment number, verification reference and confirmation of current practising status, including certificate-of-practice requirements where applicable.",
      );
    if (
      [barCouncil, enrolmentNumber, sourceReference].some(
        (s) => s.length > 1000,
      )
    )
      a.fail(400, "Keep verification fields within 1,000 characters.");
    const data = await a.Lawyer.findOneAndUpdate(
      { _id: lawyer._id, updatedAt: lawyer.updatedAt },
      {
        $set: {
          credentialReview: {
            status,
            barCouncil,
            enrolmentNumber,
            sourceReference,
            checkedBy: req.session.user.id,
            checkedAt: new Date(),
          },
        },
      },
      { new: true },
    ).select("-password");
    if (!data)
      a.fail(
        409,
        "The advocate record changed. Refresh before recording verification.",
      );
    res.json({
      success: true,
      data,
      message:
        "Operator credential-check record saved. This is not BCI certification or an automated registry verification.",
    });
  }),
);
router.get(
  "/matters/:id/professional-review",
  a.allow("client", "admin", "lawyer"),
  a.wrap(async (req, res) => {
    const n = await a.noticeAccess(req, req.params.id),
      lawyer = n.lawyerId ? await a.Lawyer.findById(n.lawyerId) : null;
    const c = lawyer?.credentialReview;
    res.json({
      success: true,
      data: {
        current:
          professional.currentReview(n) &&
          c?.status === "verified" &&
          ["active", "verified"].includes(lawyer?.status),
        review: n.professionalReview || null,
        credentialStatus: c?.status || "not_recorded",
        credentials: c
          ? {
              status: c.status,
              barCouncil: c.barCouncil,
              enrolmentNumber: c.enrolmentNumber,
              checkedAt: c.checkedAt,
            }
          : null,
        history:
          req.session.user.role === "client"
            ? undefined
            : await ProfessionalReview.find({ noticeId: n.noticeId })
                .sort({ createdAt: -1 })
                .limit(20),
      },
    });
  }),
);
router.post(
  "/matters/:id/handoff",
  a.allow("admin", "lawyer"),
  a.wrap(async (req, res) => {
    const n = await a.noticeAccess(req, req.params.id);
    const note = String(req.body.note || "").trim();
    if (note.length < 10 || note.length > 2000)
      a.fail(400, "Add a clear client update of 10–2,000 characters.");
    const when = req.body.nextUpdateAt ? new Date(req.body.nextUpdateAt) : null;
    if (when && (!Number.isFinite(when.getTime()) || when <= new Date()))
      a.fail(
        400,
        "Choose a future update time. This is an update commitment, not a legal deadline.",
      );
    if (req.body.expectedUpdatedAt !== n.updatedAt.toISOString())
      a.fail(409, "The matter changed. Refresh before updating the client.");
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
        {
          $set: {
            clientUpdateNote: note,
            nextUpdateAt: when,
            handoffUpdatedBy: req.session.user.id,
          },
        },
        { new: true, session },
      );
      if (!data) a.fail(409, "The matter changed. Refresh before updating.");
      await require("./matterServices").event(
        req,
        n,
        "Client handoff update",
        note,
        session,
      );
      await a.ClientNotification.create(
        [
          {
            clientId: n.clientId,
            noticeId: n.noticeId,
            notificationId: "NTF-" + require("crypto").randomUUID(),
            channel: "Portal",
            message: note,
            status: "Unread",
          },
        ],
        { session },
      );
    });
    res.json({ success: true, data });
  }),
);
module.exports = router;
