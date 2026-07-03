const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

// ── GET /api/categories ── list all
router.get("/", async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/categories/:id ── single
router.get("/:id", async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/categories ── create
router.post("/", async (req, res, next) => {
  try {
    const { name, description, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    const category = await Category.create({ name: name.trim(), slug, description, order });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/categories/:id ── update
router.put("/:id", async (req, res, next) => {
  try {
    const { name, description, order } = req.body;
    const updates = {};

    if (name !== undefined) {
      updates.name = name.trim();
      updates.slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    }
    if (description !== undefined) updates.description = description;
    if (order !== undefined) updates.order = order;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/categories/:id ── delete
router.delete("/:id", async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
