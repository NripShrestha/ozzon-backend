const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

// Use upload.array("images", 10) to accept up to 10 images
router
  .route("/")
  .get(getProducts)
  .post(protect, admin, upload.array("images", 10), createProduct);

router
  .route("/:id")
  .get(getProductById)
  .put(protect, admin, upload.array("images", 10), updateProduct)
  .delete(protect, admin, deleteProduct);

module.exports = router;
