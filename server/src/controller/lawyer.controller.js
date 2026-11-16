const bcrypt = require("bcryptjs");
const { Lawyer } = require("../models/lawyer.model");

const allowedStatuses = ["pending", "verified", "inactive", "active"];

const safeLawyer = (data) => {
  if (!data) return data;
  const obj = data.toObject ? data.toObject() : data;
  delete obj.password;
  return obj;
};

const generateUniqueAdvocateId = async () => {
  let advocateId = "";
  let exists = true;
  while (exists) {
    const random = Math.floor(2000 + Math.random() * 8000);
    advocateId = `ADV-${random}`;
    const found = await Lawyer.findOne({ advocate_id: advocateId }).select("_id");
    exists = Boolean(found);
  }
  return advocateId;
};

const getLawyers = async (req, res) => {
  try {
    const list = await Lawyer.find().sort({ createdAt: -1 });

    // Backfill advocate_id for older records
    for (const item of list) {
      if (!item.advocate_id) {
        item.advocate_id = await generateUniqueAdvocateId();
        await item.save();
      }
    }

    const data = list.map((item) => safeLawyer(item));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getLawyerById = async (req, res) => {
  try {
    const data = await Lawyer.findById(req.params.id).select("-password");
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createLawyer = async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      enrollmentNo,
      barId,
      city,
      email,
      password,
      aadhaarFile,
      panFile,
      barIdFile,
      status,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(200).json({
        success: false,
        message: "name, email and password are required",
      });
    }

    const existing = await Lawyer.findOne({ email });
    if (existing) {
      return res.status(200).json({
        success: false,
        message: "Lawyer already registered with this email",
      });
    }

    const advocateId = await generateUniqueAdvocateId();
    const hash = bcrypt.hashSync(password, 10);
    const normalizedStatus = String(status || "pending").toLowerCase();
    const finalStatus = allowedStatuses.includes(normalizedStatus) ? normalizedStatus : "pending";

    const created = await Lawyer.create({
      advocate_id: advocateId,
      name,
      address: address || "",
      phone: phone || "",
      enrollmentNo: enrollmentNo || "",
      barId: barId || "",
      city: city || "",
      email,
      password: hash,
      aadhaarFile: aadhaarFile || "",
      panFile: panFile || "",
      barIdFile: barIdFile || "",
      status: finalStatus,
    });

    return res.status(200).json({
      success: true,
      message: "Lawyer created successfully",
      data: safeLawyer(created),
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateLawyer = async (req, res) => {
  try {
    const existing = await Lawyer.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Lawyer not found" });
    }

    const update = {
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      enrollmentNo: req.body.enrollmentNo,
      barId: req.body.barId,
      city: req.body.city,
      email: req.body.email,
      aadhaarFile: req.body.aadhaarFile,
      panFile: req.body.panFile,
      barIdFile: req.body.barIdFile,
    };

    if (req.body.status) {
      const normalizedStatus = String(req.body.status).toLowerCase();
      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(200).json({
          success: false,
          message: "Allowed statuses are pending, verified, inactive, active",
        });
      }
      update.status = normalizedStatus;
    }

    if (req.body.password && String(req.body.password).trim()) {
      update.password = bcrypt.hashSync(String(req.body.password).trim(), 10);
    }

    const updated = await Lawyer.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.status(200).json({
      success: true,
      message: "Lawyer updated successfully",
      data: safeLawyer(updated),
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateLawyerStatus = async (req, res) => {
  try {
    const nextStatus = String(req.body.status || "").toLowerCase();
    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(200).json({
        success: false,
        message: "Allowed statuses are pending, verified, inactive, active",
      });
    }

    const updated = await Lawyer.findByIdAndUpdate(
      req.params.id,
      { status: nextStatus },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Lawyer status updated",
      data: safeLawyer(updated),
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateLawyerProfile = async (req, res) => {
  try {
    const existing = await Lawyer.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Lawyer not found" });
    }

    const allowedFields = ["name", "address", "phone", "city", "enrollmentNo", "barId",
      "firmName", "designation", "signatureImage", "aadhaarFile", "panFile", "barIdFile"];

    const update = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    if (req.body.password && String(req.body.password).trim()) {
      update.password = bcrypt.hashSync(String(req.body.password).trim(), 10);
    }

    const updated = await Lawyer.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: safeLawyer(updated),
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

module.exports = {
  getLawyers,
  getLawyerById,
  createLawyer,
  updateLawyer,
  updateLawyerStatus,
  updateLawyerProfile,
  generateUniqueAdvocateId,
};
