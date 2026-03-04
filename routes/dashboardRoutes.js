const express = require("express");
const router = express.Router();

const { getDashboardStats } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/", protect, admin, getDashboardStats);

module.exports = router;