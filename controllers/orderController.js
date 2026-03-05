// const Order = require("../models/Order");
// const Product = require("../models/Product");

// /*
// CREATE ORDER
// POST /api/orders
// User checkout
// */
// exports.createOrder = async (req, res) => {
//   try {
//     const { items, shippingAddress } = req.body;

//     if (!items || items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     const orderItems = [];
//     let totalPrice = 0;

//     for (const item of items) {
//       const product = await Product.findById(item.productId);

//       if (!product) {
//         return res.status(404).json({ message: "Product not found" });
//       }

//       orderItems.push({
//         product: product._id,
//         name: product.name,
//         quantity: item.quantity,
//         price: product.price,
//         image: product.image?.url,
//       });

//       totalPrice += product.price * item.quantity;
//     }

//     const order = new Order({
//       user: req.user._id,
//       orderItems,
//       shippingAddress,
//       totalPrice,
//       paymentMethod: "Cash on Delivery",
//     });

//     const createdOrder = await order.save();

//     res.status(201).json(createdOrder);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /*
// GET MY ORDERS
// GET /api/orders/my
// */
// exports.getMyOrders = async (req, res) => {
//   try {
//     const orders = await Order.find({ user: req.user._id }).sort({
//       createdAt: -1,
//     });

//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /*
// GET ORDER BY ID
// GET /api/orders/:id
// */
// exports.getOrderById = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id).populate(
//       "user",
//       "name email",
//     );

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.json(order);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /*
// USER CANCEL ORDER
// PUT /api/orders/:id/cancel
// */
// exports.cancelOrder = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     if (order.user.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     if (order.orderStatus !== "pending") {
//       return res.status(400).json({
//         message: "Order cannot be cancelled",
//       });
//     }

//     order.orderStatus = "cancelled";

//     const updatedOrder = await order.save();

//     res.json(updatedOrder);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /*
// ADMIN: GET ALL ORDERS
// GET /api/orders
// */
// exports.getOrders = async (req, res) => {
//   try {
//     const orders = await Order.find()
//       .populate("user", "name email")
//       .sort({ createdAt: -1 });

//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /*
// ADMIN: UPDATE ORDER STATUS
// PUT /api/orders/:id/status
// */
// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const { status } = req.body;

//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     order.orderStatus = status;

//     if (status === "delivered") {
//       order.paymentStatus = "paid";
//     }

//     const updatedOrder = await order.save();

//     res.json(updatedOrder);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");

// CREATE ORDER (User Checkout)
// Reads cart from DB — frontend only needs to send shippingAddress
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, notes } = req.body;

    // Validate shipping address fields
    if (
      !shippingAddress ||
      !shippingAddress.name ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city
    ) {
      return res.status(400).json({
        message:
          "Please provide full delivery details (name, phone, address, city)",
      });
    }

    // Load user's cart from DB
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }

    // Build orderItems + calculate total
    let totalPrice = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;

      if (!product) {
        return res
          .status(400)
          .json({ message: "One or more products not found" });
      }

      const itemPrice = product.price || 0;
      totalPrice += itemPrice * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        image: product.image?.url || "",
      });
    }

    // Create the order
    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      notes: notes || "",
      paymentMethod: "COD",
      paymentStatus: "unpaid",
      orderStatus: "pending",
      totalPrice,
    });

    // Clear the cart after successful order
    cart.items = [];
    await cart.save();

    res.status(201).json(order);
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET MY ORDERS (User)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE ORDER (User — own order only)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Ensure the order belongs to the requesting user (unless admin)
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorised" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CANCEL ORDER (User — only if pending)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised" });
    }

    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        message: "Order cannot be cancelled after it has been confirmed",
      });
    }

    order.orderStatus = "cancelled";
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL ORDERS (Admin)
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ORDER STATUS (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.orderStatus = status;

    // Auto-mark payment as paid when delivered
    if (status === "delivered") {
      order.paymentStatus = "paid";
    }

    await order.save();

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};