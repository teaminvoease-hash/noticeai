const { AdminDocument } = require("../models/adminDocument.model");

const allowedTypes = ["authority letter", "signed notice", "invoice", "receipt"];
const allowedUploaders = ["admin", "client", "advocate"];
const allowedAccess = ["restricted", "client + advocate", "admin only"];
const allowedStatuses = ["active", "archived"];

const generateUniqueDocumentId = async () => {
  let docId = "";
  let exists = true;
  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    docId = `DOC-${random}`;
    const found = await AdminDocument.findOne({ document_id: docId }).select("_id");
    exists = Boolean(found);
  }
  return docId;
};

const normalizeOrDefault = (value, allowed, fallback) => {
  const normalized = String(value || "").toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

const getDocuments = async (req, res) => {
  try {
    const list = await AdminDocument.find().sort({ createdAt: -1 });
    for (const item of list) {
      if (!item.document_id) {
        item.document_id = await generateUniqueDocumentId();
        await item.save();
      }
    }
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const data = await AdminDocument.findById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createDocument = async (req, res) => {
  try {
    const { noticeId, type, uploadedBy, accessLevel, status } = req.body;
    if (!type || !uploadedBy) {
      return res.status(200).json({
        success: false,
        message: "type and uploadedBy are required",
      });
    }

    const created = await AdminDocument.create({
      document_id: await generateUniqueDocumentId(),
      noticeId: String(noticeId || "").trim(),
      type: normalizeOrDefault(type, allowedTypes, "authority letter"),
      uploadedBy: normalizeOrDefault(uploadedBy, allowedUploaders, "admin"),
      accessLevel: normalizeOrDefault(accessLevel, allowedAccess, "restricted"),
      status: normalizeOrDefault(status, allowedStatuses, "active"),
    });

    return res.status(200).json({
      success: true,
      message: "Document created successfully",
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const existing = await AdminDocument.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Document not found" });
    }

    const update = {
      noticeId: String(req.body.noticeId || "").trim(),
      type: normalizeOrDefault(req.body.type, allowedTypes, existing.type),
      uploadedBy: normalizeOrDefault(req.body.uploadedBy, allowedUploaders, existing.uploadedBy),
      accessLevel: normalizeOrDefault(req.body.accessLevel, allowedAccess, existing.accessLevel),
      status: normalizeOrDefault(req.body.status, allowedStatuses, existing.status),
    };

    const data = await AdminDocument.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
};
