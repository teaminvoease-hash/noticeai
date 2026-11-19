// Small HTTP parts retain the existing 10 MB limit on function hosts.
const express = require("express"),
  mongoose = require("mongoose"),
  crypto = require("node:crypto"),
  path = require("node:path");
const { rateLimit } = require("express-rate-limit");
const a = require("./access"),
  storage = require("./storage");
const router = express.Router(),
  partBytes = 512 * 1024,
  maxBytes = 10 * 1024 * 1024;
const transfers = () => mongoose.connection.db.collection("upload_transfers");
const owner = (req) =>
  req.session.user
    ? "user:" + req.session.user.role + ":" + req.session.user.id
    : "session:" + req.sessionID;
const digest = (data) => crypto.createHash("sha256").update(data).digest("hex");
async function transfer(req, includeParts = false) {
  if (!/^[a-f0-9-]{36}$/.test(req.params.id)) a.fail(404, "Upload not found");
  const row = await transfers().findOne(
    {
      _id: req.params.id,
      owner: owner(req),
      expiresAt: { $gt: new Date() },
    },
    { projection: includeParts ? {} : { parts: 0 } },
  );
  if (!row) a.fail(404, "Upload not found or expired");
  return row;
}
router.post(
  "/file-transfers",
  rateLimit({ windowMs: 60000, limit: 12 }),
  a.wrap(async (req, res) => {
    const filename =
        typeof req.body.filename === "string"
          ? path.basename(req.body.filename)
          : "",
      size = req.body.size;
    if (
      !filename ||
      filename.length > 200 ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > maxBytes
    )
      a.fail(400, "Choose one document up to 10 MB");
    if (
      ![".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"].includes(
        path.extname(filename).toLowerCase(),
      )
    )
      a.fail(400, "Unsupported document type");
    // Expiry applies only to this new temporary-upload collection, never final documents.
    await transfers().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    // Remove only this owner's expired temporary parts; final documents are never removed here.
    await transfers().deleteMany({
      owner: owner(req),
      expiresAt: { $lte: new Date() },
    });
    if (
      (await transfers().countDocuments({
        owner: owner(req),
        status: { $ne: "complete" },
      })) >= 3
    )
      a.fail(
        429,
        "Finish an upload or retry after unfinished transfers expire",
      );
    const row = {
      _id: crypto.randomUUID(),
      owner: owner(req),
      filename,
      size,
      parts: [],
      hashes: [],
      received: 0,
      status: "uploading",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60000),
    };
    await transfers().insertOne(row);
    res.json({ success: true, data: { id: row._id, partBytes } });
  }),
);
router.put(
  "/file-transfers/:id/:index",
  a.wrap(async (req, res) => {
    const row = await transfer(req),
      index = Number(req.params.index);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= Math.ceil(row.size / partBytes) ||
      typeof req.body.data !== "string" ||
      req.body.data.length > Math.ceil(partBytes / 3) * 4
    )
      a.fail(400, "Invalid upload part");
    const bytes = Buffer.from(req.body.data, "base64");
    if (
      bytes.toString("base64") !== req.body.data ||
      bytes.length !== Math.min(partBytes, row.size - index * partBytes)
    )
      a.fail(400, "Invalid upload part length");
    if (row.status === "complete") a.fail(409, "Upload is already complete");
    const hash = digest(bytes);
    if (index < row.hashes.length) {
      if (row.hashes[index] !== hash)
        a.fail(409, "This part was already uploaded with different content");
      return res.json({ success: true });
    }
    if (row.status !== "uploading" || index !== row.hashes.length)
      a.fail(409, "Upload the next part in order");
    const result = await transfers().updateOne(
      {
        _id: row._id,
        owner: row.owner,
        status: "uploading",
        received: row.received,
      },
      {
        $push: { parts: bytes, hashes: hash },
        $inc: { received: bytes.length },
      },
    );
    if (!result.modifiedCount)
      a.fail(409, "Upload changed; retry the current part");
    res.json({ success: true });
  }),
);
router.post(
  "/file-transfers/:id/complete",
  rateLimit({ windowMs: 60000, limit: 12 }),
  a.wrap(async (req, res) => {
    const row = await transfer(req, true);
    if (row.status === "complete") return res.json(row.result);
    if (
      row.received !== row.size ||
      row.parts.length !== Math.ceil(row.size / partBytes)
    )
      a.fail(409, "Upload all document parts first");
    if (row.status !== "uploading")
      a.fail(409, "This upload is already being processed");
    const locked = await transfers().updateOne(
      { _id: row._id, owner: row.owner, status: "uploading" },
      { $set: { status: "committing" } },
    );
    if (!locked.modifiedCount)
      a.fail(409, "This upload is already being processed");
    try {
      const buffer = Buffer.concat(
        row.parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p.buffer))),
      );
      if (buffer.length !== row.size)
        a.fail(400, "Document size does not match");
      const result = await require("./services/privateUpload").persistUpload(
        req,
        { originalname: row.filename, buffer },
        row._id + path.extname(row.filename).toLowerCase(),
      );
      await transfers().updateOne(
        { _id: row._id },
        {
          $set: { status: "complete", result },
          $unset: { parts: "", hashes: "" },
        },
      );
      res.json(result);
    } catch (error) {
      await transfers().updateOne(
        { _id: row._id, status: "committing" },
        { $set: { status: "uploading" } },
      );
      throw error;
    }
  }),
);
router.get(
  "/files/:name/info",
  a.wrap(async (req, res) => {
    if (!(await a.fileAccess(req, req.params.name)))
      a.fail(404, "File not found");
    const info = await storage.info(req.params.name);
    res.set("Cache-Control", "private, no-store");
    res.json({ success: true, data: { ...info, partBytes } });
  }),
);
router.get(
  "/files/:name/parts/:index",
  a.wrap(async (req, res) => {
    if (!(await a.fileAccess(req, req.params.name)))
      a.fail(404, "File not found");
    const info = await storage.info(req.params.name),
      index = Number(req.params.index);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= Math.ceil(info.size / partBytes)
    )
      a.fail(404, "File part not found");
    const bytes = await storage.readRange(
      req.params.name,
      index * partBytes,
      Math.min(info.size, (index + 1) * partBytes),
    );
    res.set("Cache-Control", "private, no-store");
    res.type("application/octet-stream").send(bytes);
  }),
);
module.exports = { router, partBytes, maxBytes };
