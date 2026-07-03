const mongoose = require("mongoose");

const cakeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cake name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Birthday", "Anniversary", "Theme", "Cupcakes", "Desserts"],
        message: "{VALUE} is not a valid category",
      },
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Cloudinary image details
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    flavors: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cake", cakeSchema);
