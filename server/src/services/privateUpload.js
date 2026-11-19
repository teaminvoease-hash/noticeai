const path = require("node:path"),
  crypto = require("node:crypto");
const File = require("../models/file.model"),
  storage = require("../storage");
const { fail } = require("../access");
async function persistUpload(req, file, transferName) {
  const ext = path.extname(file.originalname).toLowerCase();
  const type = await import("file-type").then((m) =>
    m.fileTypeFromBuffer(file.buffer),
  );
  const allowed = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/x-cfb",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  if (!allowed[ext] || allowed[ext] !== type?.mime)
    fail(400, "Use a valid PDF, PNG, JPG, DOC or DOCX document");
  const name = transferName || crypto.randomUUID() + ext;
  const result = {
    success: true,
    image: name,
    fileName: name,
    filePath: "/uploads/" + name,
    fileUrl: "/uploads/" + name,
    originalName: file.originalname,
  };
  if (transferName) {
    const existing = await File.findOne({ name });
    if (existing) {
      if (
        existing.sessionId !== req.sessionID &&
        (!req.session.user ||
          existing.ownerId !== req.session.user.id ||
          existing.role !== req.session.user.role)
      )
        fail(404, "File not found");
      return result;
    }
    // Only this server-generated transfer UUID can be retried; remove uncommitted bytes, never a recorded file.
    await storage.remove(name);
  }
  if (
    !req.session.user &&
    (await File.countDocuments({ sessionId: req.sessionID })) >= 3
  )
    fail(429, "Complete registration before uploading more documents");
  await storage.save(name, file.buffer, type.mime);
  try {
    await File.create({
      name,
      original: path.basename(file.originalname),
      ownerId: req.session.user?.id,
      role: req.session.user?.role,
      sessionId: req.session.user ? undefined : req.sessionID,
    });
  } catch (error) {
    await storage.remove(name);
    throw error;
  }
  return result;
}
module.exports = { persistUpload };
