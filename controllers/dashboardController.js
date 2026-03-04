const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");

exports.getDashboardStats = async (req, res) => {
  const totalProducts = await Product.countDocuments();
  const totalCategories = await Category.countDocuments();
  const totalUsers = await User.countDocuments();

  const recentProducts = await Product.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name price createdAt");

  const latestProduct = await Product.findOne()
    .sort({ updatedAt: -1 })
    .select("name updatedAt");

  res.json({
    stats: {
      totalProducts,
      totalCategories,
      totalUsers,
    },
    recentProducts,
    latestProduct,
  });
};