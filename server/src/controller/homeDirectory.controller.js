const { HomeDirectory } = require("../models/homeDirectory.model");

const GetHomeDirectoryData = async (req, res) => {
  try {
    const data = await HomeDirectory.findOne({ key: "default" });

    res.status(200).json({
      success: true,
      data: {
        categories: data?.categories || [],
        aiTools: data?.aiTools || [],
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Failed to fetch home directory data",
      error: err.message,
    });
  }
};

const UpsertHomeDirectoryData = async (req, res) => {
  try {
    const payload = {
      key: "default",
      categories: Array.isArray(req.body.categories) ? req.body.categories : [],
      aiTools: Array.isArray(req.body.aiTools) ? req.body.aiTools : [],
    };

    const data = await HomeDirectory.findOneAndUpdate(
      { key: "default" },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Home directory data saved successfully",
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Failed to save home directory data",
      error: err.message,
    });
  }
};

module.exports = {
  GetHomeDirectoryData,
  UpsertHomeDirectoryData,
};
