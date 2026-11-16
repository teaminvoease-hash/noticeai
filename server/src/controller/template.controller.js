const { Template } = require("../models/template.model");

const allowedStatuses = ["active", "inactive"];

const generateUniqueTemplateId = async () => {
  let templateId = "";
  let exists = true;
  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    templateId = `TMP-${random}`;
    const found = await Template.findOne({ template_id: templateId }).select("_id");
    exists = Boolean(found);
  }
  return templateId;
};

const getTemplates = async (req, res) => {
  try {
    const list = await Template.find().sort({ createdAt: -1 });

    for (const item of list) {
      if (!item.template_id) {
        item.template_id = await generateUniqueTemplateId();
        await item.save();
      }
    }

    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const data = await Template.findById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { name, category, version, status, body } = req.body;
    if (!name || !category) {
      return res.status(200).json({
        success: false,
        message: "name and category are required",
      });
    }

    const templateId = await generateUniqueTemplateId();
    const normalizedStatus = String(status || "active").toLowerCase();
    const finalStatus = allowedStatuses.includes(normalizedStatus) ? normalizedStatus : "active";

    const created = await Template.create({
      template_id: templateId,
      name: String(name).trim(),
      category: String(category).trim(),
      version: version ? String(version).trim() : "v1.0",
      status: finalStatus,
      body: body ? String(body) : "",
    });

    return res.status(200).json({
      success: true,
      message: "Template created successfully",
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const existing = await Template.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Template not found" });
    }

    const update = {
      name: req.body.name,
      category: req.body.category,
      version: req.body.version,
      body: req.body.body,
    };

    if (req.body.status) {
      const normalizedStatus = String(req.body.status).toLowerCase();
      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(200).json({
          success: false,
          message: "Allowed statuses are active and inactive",
        });
      }
      update.status = normalizedStatus;
    }

    const updated = await Template.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
};
