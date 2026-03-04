const Product = require("../models/Product");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");

// Helper: parse features from FormData
// FormData can't send arrays natively, so we accept either:
//   - JSON string:  features = '["feat1","feat2"]'
//   - Repeated key: features[0]=feat1&features[1]=feat2  (express handles as array)
const parseFeatures = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    // single string value
    return [raw].filter(Boolean);
  }
};

// CREATE PRODUCT
exports.createProduct = async (req, res) => {
  const {
    name,
    category,
    brand,
    description,
    specifications,
    price,
    stock,
    features,
  } = req.body;

  if (!name || !category) {
    res.status(400);
    throw new Error("Name and category are required");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("Product image is required");
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    res.status(400);
    throw new Error("Invalid category");
  }

  const product = await Product.create({
    name,
    category,
    brand,
    description,
    specifications,
    features: parseFeatures(features),
    price,
    stock,
    image: {
      url: req.file.path,
      public_id: req.file.filename,
    },
  });

  res.status(201).json(product);
};

// GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};

  const categoryFilter = req.query.category
    ? { category: req.query.category }
    : {};

  const count = await Product.countDocuments({
    ...keyword,
    ...categoryFilter,
  });

  const products = await Product.find({
    ...keyword,
    ...categoryFilter,
  })
    .populate("category", "name")
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });

  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
};

// GET SINGLE PRODUCT
exports.getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    "category",
    "name",
  );

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
};

// UPDATE PRODUCT (with optional image replace)
exports.updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      res.status(400);
      throw new Error("Invalid category");
    }
  }

  // If new image uploaded → delete old one from Cloudinary
  if (req.file) {
    await cloudinary.uploader.destroy(product.image.public_id);
    product.image = {
      url: req.file.path,
      public_id: req.file.filename,
    };
  }

  product.name = req.body.name || product.name;
  product.category = req.body.category || product.category;
  product.brand = req.body.brand || product.brand;
  product.description = req.body.description || product.description;
  product.specifications = req.body.specifications || product.specifications;
  product.price = req.body.price ?? product.price;
  product.stock = req.body.stock ?? product.stock;

  // Only overwrite features if the field was explicitly sent
  if (req.body.features !== undefined) {
    product.features = parseFeatures(req.body.features);
  }

  const updatedProduct = await product.save();
  res.json(updatedProduct);
};

// DELETE PRODUCT (delete image from Cloudinary too)
exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await cloudinary.uploader.destroy(product.image.public_id);
  await product.deleteOne();

  res.json({ message: "Product removed successfully" });
};
