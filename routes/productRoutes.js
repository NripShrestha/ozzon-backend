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

router
  .route("/")
  .get(getProducts)
  .post(protect, admin, upload.single("image"), createProduct);

router
  .route("/:id")
  .get(getProductById)
  .put(protect, admin, upload.single("image"), updateProduct)
  .delete(protect, admin, deleteProduct);

module.exports = router;