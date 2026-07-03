const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// ── Custom Cloudinary v2 storage engine for Multer ────────────────────────
// Works with both multer v1 (file.stream) and multer v2 (file.stream as PassThrough).
function createCloudinaryStorage(folder) {
  return {
    _handleFile(req, file, cb) {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"));
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto:best" }],
        },
        (error, result) => {
          if (error) return cb(error);
          cb(null, {
            path: result.secure_url,    // req.file.path  → image URL
            filename: result.public_id, // req.file.filename → Cloudinary publicId
            size: result.bytes,
          });
        }
      );

      // file.stream is a PassThrough/Readable in both multer v1 and v2
      file.stream.pipe(uploadStream);
    },

    _removeFile(_req, file, cb) {
      cloudinary.uploader
        .destroy(file.filename)
        .then(() => cb(null))
        .catch(cb);
    },
  };
}

// ── File filter — images only ──────────────────────────────────────────────
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"), false);
  }
};

const limits = { fileSize: 5 * 1024 * 1024 }; // 5 MB

const uploadCakeImage = multer({
  storage: createCloudinaryStorage("sweet-aroma/cakes"),
  fileFilter: imageFilter,
  limits,
});

const uploadGalleryImage = multer({
  storage: createCloudinaryStorage("sweet-aroma/gallery"),
  fileFilter: imageFilter,
  limits,
});

// ── Convenience helper used by routes that need manual uploads ─────────────
// Accepts a Buffer and uploads it to the given Cloudinary folder.
// Returns { url, publicId }.
function streamToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto:best" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    const { Readable } = require("stream");
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
}

module.exports = { uploadCakeImage, uploadGalleryImage, streamToCloudinary };
