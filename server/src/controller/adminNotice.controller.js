const { AdminNotice } = require("../models/adminNotice.model");

const allowedAuthorityLetter = ["uploaded", "missing"];
const allowedStatuses = [
  "pending",
  "uploaded",
  "verified",
  "draft pending",
  "in advocate review",
  "signed",
  "delivered",
];

const normalizeOrFallback = (value, allowed, fallback) => {
  const normalized = String(value || "").toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

const generateUniqueNoticeId = async () => {
  let noticeId = "";
  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    noticeId = `LN-${random}`;
    const found = await AdminNotice.findOne({ notice_id: noticeId }).select("_id");
    exists = Boolean(found);
  }

  return noticeId;
};

const getNotices = async (req, res) => {
  try {
    const list = await AdminNotice.find().sort({ createdAt: -1 });

    for (const item of list) {
      if (!item.notice_id) {
        item.notice_id = await generateUniqueNoticeId();
        await item.save();
      }
    }

    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getNoticeById = async (req, res) => {
  try {
    const data = await AdminNotice.findById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createNotice = async (req, res) => {
  try {
    const { clientName, assignedLawyer, authorityLetter, status, trackingNo } = req.body;

    if (!clientName) {
      return res.status(200).json({
        success: false,
        message: "clientName is required",
      });
    }

    const created = await AdminNotice.create({
      notice_id: await generateUniqueNoticeId(),
      clientName: String(clientName || "").trim(),
      assignedLawyer: String(assignedLawyer || "").trim(),
      authorityLetter: normalizeOrFallback(authorityLetter, allowedAuthorityLetter, "missing"),
      status: normalizeOrFallback(status, allowedStatuses, "pending"),
      trackingNo: String(trackingNo || "").trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Notice created successfully",
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateNotice = async (req, res) => {
  try {
    const existing = await AdminNotice.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Notice not found" });
    }

    const updated = await AdminNotice.findByIdAndUpdate(
      req.params.id,
      {
        clientName: String(req.body.clientName || "").trim(),
        assignedLawyer: String(req.body.assignedLawyer || "").trim(),
        authorityLetter: normalizeOrFallback(
          req.body.authorityLetter,
          allowedAuthorityLetter,
          existing.authorityLetter
        ),
        status: normalizeOrFallback(req.body.status, allowedStatuses, existing.status),
        trackingNo: String(req.body.trackingNo || "").trim(),
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

module.exports = {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
};
