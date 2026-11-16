const { Blog } = require("../models/blog.model");

const GetBlogs = async (req, res) => {
  try {
    const data = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: "Failed to fetch blogs", error: err.message });
  }
};

const GetBlogById = async (req, res) => {
  try {
    const data = await Blog.findById(req.params.id);
    if (!data) {
      return res.status(200).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: "Failed to fetch blog", error: err.message });
  }
};

const CreateBlog = async (req, res) => {
  try {
    if (!req.body.title || !req.body.desc) {
      return res.status(200).json({ success: false, message: "title and desc are required" });
    }

    const data = await Blog.create({
      title: req.body.title,
      desc: req.body.desc,
      image: req.body.image || "",
    });

    res.status(200).json({ success: true, message: "Blog created", data });
  } catch (err) {
    res.status(400).json({ success: false, message: "Failed to create blog", error: err.message });
  }
};

const UpdateBlog = async (req, res) => {
  try {
    const existing = await Blog.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Blog not found" });
    }

    const payload = {
      title: req.body.title,
      desc: req.body.desc,
      image: req.body.image || "",
    };

    const data = await Blog.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.status(200).json({ success: true, message: "Blog updated", data });
  } catch (err) {
    res.status(400).json({ success: false, message: "Failed to update blog", error: err.message });
  }
};

const DeleteBlog = async (req, res) => {
  try {
    const data = await Blog.findByIdAndDelete(req.params.id);
    if (!data) {
      return res.status(200).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, message: "Blog deleted", data });
  } catch (err) {
    res.status(400).json({ success: false, message: "Failed to delete blog", error: err.message });
  }
};

module.exports = {
  GetBlogs,
  GetBlogById,
  CreateBlog,
  UpdateBlog,
  DeleteBlog,
};
