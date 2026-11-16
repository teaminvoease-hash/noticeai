const { AdminWithdrawal } = require("../models/adminWithdrawal.model");

const allowedStatuses = ["pending", "approved", "rejected"];

const generateUniqueRequestId = async () => {
  let requestId = "";
  let exists = true;
  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    requestId = `WDR-${random}`;
    const found = await AdminWithdrawal.findOne({ request_id: requestId }).select("_id");
    exists = Boolean(found);
  }
  return requestId;
};

const normalizeStatus = (status, fallback = "pending") => {
  const normalized = String(status || "").toLowerCase();
  return allowedStatuses.includes(normalized) ? normalized : fallback;
};

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const resolveProcessedDate = (status, inputDate, oldDate = "") => {
  if (String(inputDate || "").trim()) return inputDate;
  if (status === "approved" || status === "rejected") return oldDate || getTodayDate();
  return "";
};

const getWithdrawals = async (req, res) => {
  try {
    const { advocateId, lawyerId } = req.query;
    const filter = {};
    const resolvedAdvocateId = advocateId || lawyerId || "";
    if (resolvedAdvocateId) filter.advocateId = resolvedAdvocateId;

    const list = await AdminWithdrawal.find(filter).sort({ createdAt: -1 });
    for (const item of list) {
      if (!item.request_id) {
        item.request_id = await generateUniqueRequestId();
        await item.save();
      }
    }
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getWithdrawalById = async (req, res) => {
  try {
    const data = await AdminWithdrawal.findById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createWithdrawal = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status, "pending");
    const created = await AdminWithdrawal.create({
      request_id: await generateUniqueRequestId(),
      advocateId: String(req.body.advocateId || req.body.lawyerId || "").trim(),
      advocateName: String(req.body.advocateName || "").trim(),
      amount: Number(req.body.amount || 0),
      walletBalance: Number(req.body.walletBalance || 0),
      bankAccount: String(req.body.bankAccount || "").trim(),
      ifsc: String(req.body.ifsc || "").trim(),
      bankName: String(req.body.bankName || "").trim(),
      bankBranch: String(req.body.bankBranch || "").trim(),
      remarks: String(req.body.remarks || "").trim(),
      status,
      adminRemarks: String(req.body.adminRemarks || "").trim(),
      processedDate: resolveProcessedDate(status, req.body.processedDate, ""),
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal created successfully",
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateWithdrawal = async (req, res) => {
  try {
    const existing = await AdminWithdrawal.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Withdrawal not found" });
    }

    const status = normalizeStatus(req.body.status, existing.status);
    const updated = await AdminWithdrawal.findByIdAndUpdate(
      req.params.id,
      {
        advocateId: String(req.body.advocateId || req.body.lawyerId || existing.advocateId || "").trim(),
        advocateName: String(req.body.advocateName || "").trim(),
        amount: Number(req.body.amount || 0),
        walletBalance: Number(req.body.walletBalance || 0),
        bankAccount: String(req.body.bankAccount || "").trim(),
        ifsc: String(req.body.ifsc || "").trim(),
        bankName: String(req.body.bankName || "").trim(),
        bankBranch: String(req.body.bankBranch || "").trim(),
        remarks: String(req.body.remarks || "").trim(),
        status,
        adminRemarks: String(req.body.adminRemarks || "").trim(),
        processedDate: resolveProcessedDate(status, req.body.processedDate, existing.processedDate),
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Withdrawal updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

module.exports = {
  getWithdrawals,
  getWithdrawalById,
  createWithdrawal,
  updateWithdrawal,
};
