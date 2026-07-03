const express = require("express");
const router = express.Router();
const Cake = require("../models/Cake");
const cloudinary = require("../config/cloudinary");
const { uploadCakeImage } = require("../middleware/upload");

// ── GET /api/cakes ── list all (with optional filters)
router.get("/", async (req, res, next) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.featured === "true") query.featured = true;
    if (req.query.inStock === "true") query.inStock = true;

    const sort = {};
    if (req.query.sort === "price_asc") sort.price = 1;
    else if (req.query.sort === "price_desc") sort.price = -1;
    else sort.createdAt = -1;

    const cakes = await Cake.find(query).sort(sort);
    res.json({ success: true, count: cakes.length, data: cakes });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/cakes/:id ── single cake
router.get("/:id", async (req, res, next) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) return res.status(404).json({ success: false, message: "Cake not found" });
    res.json({ success: true, data: cake });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/cakes ── create with optional image upload
router.post("/", uploadCakeImage.single("image"), async (req, res, next) => {
  try {
    const { name, price, category, description, flavors, sizes, featured, inStock } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ success: false, message: "Cake name is required" });
    if (!price || isNaN(Number(price)))
      return res.status(400).json({ success: false, message: "Valid price is required" });
    if (!category)
      return res.status(400).json({ success: false, message: "Category is required" });

    const cakeData = {
      name: name.trim(),
      price: Number(price),
      category,
      description: description || "",
      flavors: parseFlatList(flavors),
      sizes: parseFlatList(sizes),
      featured: featured === "true" || featured === true,
      inStock: inStock === undefined || inStock === "true" || inStock === true,
    };

    // The custom storage engine already uploaded to Cloudinary —
    // req.file.path = secure_url, req.file.filename = public_id
    if (req.file) {
      cakeData.image = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    const cake = await Cake.create(cakeData);
    res.status(201).json({ success: true, data: cake });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/cakes/:id ── update (image optional)
router.put("/:id", uploadCakeImage.single("image"), async (req, res, next) => {
  try {
    const existing = await Cake.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Cake not found" });

    const { name, price, category, description, flavors, sizes, featured, inStock } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (price !== undefined) updates.price = Number(price);
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (flavors !== undefined) updates.flavors = parseFlatList(flavors);
    if (sizes !== undefined) updates.sizes = parseFlatList(sizes);
    if (featured !== undefined) updates.featured = featured === "true" || featured === true;
    if (inStock !== undefined) updates.inStock = inStock === "true" || inStock === true;

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

    const cake = await Cake.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: cake });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/cakes/:id ── delete cake + its Cloudinary image
router.delete("/:id", async (req, res, next) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) return res.status(404).json({ success: false, message: "Cake not found" });

    if (cake.image && cake.image.publicId) {
      await cloudinary.uploader.destroy(cake.image.publicId).catch(() => {});
    }

    await cake.deleteOne();
    res.json({ success: true, message: "Cake deleted" });
  } catch (err) {
    next(err);
  }
});

// ── Helper ─────────────────────────────────────────────────────────────────
function parseFlatList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

module.exports = router;
