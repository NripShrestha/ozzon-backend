// const express = require("express");
// const router = express.Router();

// const {
//   createOrder,
//   getMyOrders,
//   getOrderById,
//   cancelOrder,
//   getOrders,
//   updateOrderStatus,
// } = require("../controllers/orderController");

// const { protect } = require("../middleware/authMiddleware");
// const { admin } = require("../middleware/adminMiddleware");

// // USER
// router.post("/", protect, createOrder);
// router.get("/my", protect, getMyOrders);
// router.get("/:id", protect, getOrderById);
// router.put("/:id/cancel", protect, cancelOrder);

// // ADMIN
// router.get("/", protect, admin, getOrders);
// router.put("/:id/status", protect, admin, updateOrderStatus);

// module.exports = router;

const express = require("express");
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

// USER routes
router.post("/", protect, createOrder);
router.get("/my", protect, getMyOrders); // must be before /:id
router.put("/:id/cancel", protect, cancelOrder);
router.get("/:id", protect, getOrderById);

// ADMIN routes
router.get("/", protect, admin, getOrders);
router.put("/:id/status", protect, admin, updateOrderStatus);

module.exports = router;