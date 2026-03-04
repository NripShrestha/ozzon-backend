const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: { type: String, required: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    brand: { type: String },
    description: { type: String },
    specifications: { type: String },

    // Array of feature strings e.g. ["Full synthetic formula", "Superior engine protection"]
    features: [{ type: String }],

    price: { type: Number },
    image: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
    },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
