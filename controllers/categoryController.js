const Category = require("../models/Category");

// Create Category (Admin)
exports.createCategory = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Category name is required");
  }

  const existing = await Category.findOne({ name });
  if (existing) {
    res.status(400);
    throw new Error("Category already exists");
  }

  const category = await Category.create({ name, description });

  res.status(201).json(category);
};

// Get All Categories (Public)
exports.getCategories = async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  res.json(categories);
};

// Delete Category (Admin)
exports.deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  await category.deleteOne();

  res.json({ message: "Category removed" });
};
