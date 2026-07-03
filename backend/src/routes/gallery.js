const express = require("express");
const router = express.Router();
const Gallery = require("../models/Gallery");
const cloudinary = require("../config/cloudinary");
const { uploadGalleryImage } = require("../middleware/upload");

// ── GET /api/gallery ── list all (visible by default; ?all=true for admin)
router.get("/", async (req, res, next) => {
  try {
    const query = {};
    if (req.query.all !== "true") query.visible = true;

    const items = await Gallery.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/gallery/:id ── single item
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/gallery ── upload a new gallery image
router.post("/", uploadGalleryImage.single("image"), async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "An image file is required" });

    const { title, caption, order, visible } = req.body;

    // The custom storage engine already uploaded to Cloudinary —
    // req.file.path = secure_url, req.file.filename = public_id
    const item = await Gallery.create({
      title: title || "",
      caption: caption || "",
      image: {
        url: req.file.path,
        publicId: req.file.filename,
      },
      order: order ? Number(order) : 0,
      visible: visible === undefined || visible === "true" || visible === true,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/gallery/:id ── update metadata and/or replace image
router.put("/:id", uploadGalleryImage.single("image"), async (req, res, next) => {
  try {
    const existing = await Gallery.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Gallery item not found" });

    const { title, caption, order, visible } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (caption !== undefined) updates.caption = caption;
    if (order !== undefined) updates.order = Number(order);
    if (visible !== undefined) updates.visible = visible === "true" || visible === true;

    if (req.file) {
      // Delete old image from Cloudinary before assigning the new one
      if (existing.image && existing.image.publicId) {
        await cloudinary.uploader.destroy(existing.image.publicId).catch(() => {});
      }
      updates.image = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    const item = await Gallery.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/gallery/:id ── delete item + Cloudinary image
router.delete("/:id", async (req, res, next) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found" });

    if (item.image && item.image.publicId) {
      await cloudinary.uploader.destroy(item.image.publicId).catch(() => {});
    }

    await item.deleteOne();
    res.json({ success: true, message: "Gallery item deleted" });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/gallery/bulk-delete ── delete multiple items at once
router.post("/bulk-delete", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "Provide an array of ids" });

    const items = await Gallery.find({ _id: { $in: ids } });

    await Promise.all(
      items
        .filter((it) => it.image && it.image.publicId)
        .map((it) => cloudinary.uploader.destroy(it.image.publicId).catch(() => {}))
    );

    await Gallery.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${items.length} item(s) deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
