/**
 * Central error handler — must be registered LAST with app.use()
 */
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Multer errors (file too large, wrong type, etc.)
  if (err.name === "MulterError") {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Custom upload filter errors
  if (err.message && err.message.includes("Only image files")) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res
      .status(409)
      .json({ success: false, message: `Duplicate value for ${field}` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = errorHandler;
