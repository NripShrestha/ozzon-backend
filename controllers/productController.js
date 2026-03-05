const Product = require("../models/Product");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");

// Helper: parse features from FormData
const parseFeatures = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [raw].filter(Boolean);
  }
};

// Helper: parse existing images JSON sent from client during update
// Shape: [{ url, public_id }, ...]  — images the user wants to KEEP
const parseKeepImages = (raw) => {
  if (!raw) return null; // null means "field not sent" → keep all existing
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
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

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("At least one product image is required");
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    res.status(400);
    throw new Error("Invalid category");
  }

  // First uploaded file becomes the primary image; rest go into images[]
  const [primaryFile, ...extraFiles] = req.files;

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
      url: primaryFile.path,
      public_id: primaryFile.filename,
    },
    images: extraFiles.map((f) => ({ url: f.path, public_id: f.filename })),
  });

  res.status(201).json(product);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
exports.getProducts = async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  const keyword = req.query.keyword
    ? { name: { $regex: req.query.keyword, $options: "i" } }
    : {};

  const categoryFilter = req.query.category
    ? { category: req.query.category }
    : {};

  const count = await Product.countDocuments({ ...keyword, ...categoryFilter });

  const products = await Product.find({ ...keyword, ...categoryFilter })
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

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Reconcile images ─────────────────────────────────────────────────────
  // keepImages: array of { url, public_id } the client wants to RETAIN
  // If the field was not sent at all, we keep everything as-is.
  const keepImages = parseKeepImages(req.body.keepImages);

  if (keepImages !== null) {
    // Build the set of public_ids to keep
    const keepIds = new Set(keepImages.map((img) => img.public_id));

    // Delete from Cloudinary any existing image NOT in keepIds
    const allExisting = [product.image, ...product.images];
    for (const img of allExisting) {
      if (img && img.public_id && !keepIds.has(img.public_id)) {
        await cloudinary.uploader.destroy(img.public_id).catch(() => {});
      }
    }

    // Determine which kept images are "primary" vs "extra"
    // We treat the first kept image as primary (if any remain)
    const keptPrimary = keepImages[0] || null;
    const keptExtras = keepImages.slice(1);

    if (keptPrimary) {
      product.image = keptPrimary;
    }
    product.images = keptExtras;
  }

  // ── Append newly uploaded files ──────────────────────────────────────────
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((f) => ({
      url: f.path,
      public_id: f.filename,
    }));

    // If primary image slot is somehow empty, fill it
    if (!product.image || !product.image.url) {
      product.image = newImages.shift();
    }

    product.images = [...(product.images || []), ...newImages];
  }

  // ── Scalar fields ────────────────────────────────────────────────────────
  product.name = req.body.name || product.name;
  product.category = req.body.category || product.category;
  product.brand = req.body.brand !== undefined ? req.body.brand : product.brand;
  product.description =
    req.body.description !== undefined
      ? req.body.description
      : product.description;
  product.specifications =
    req.body.specifications !== undefined
      ? req.body.specifications
      : product.specifications;
  product.price = req.body.price ?? product.price;
  product.stock = req.body.stock ?? product.stock;

  if (req.body.features !== undefined) {
    product.features = parseFeatures(req.body.features);
  }

  const updatedProduct = await product.save();
  res.json(updatedProduct);
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Delete all images from Cloudinary
  const allImages = [product.image, ...(product.images || [])];
  for (const img of allImages) {
    if (img && img.public_id) {
      await cloudinary.uploader.destroy(img.public_id).catch(() => {});
    }
  }

  await product.deleteOne();
  res.json({ message: "Product removed successfully" });
};
