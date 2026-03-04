const express = require("express");
const router = express.Router();

const {
  createCategory,
  getCategories,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.route("/")
  .get(getCategories)
  .post(protect, admin, createCategory);

router.route("/:id")
  .delete(protect, admin, deleteCategory);

module.exports = router;