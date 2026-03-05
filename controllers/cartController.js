const Cart = require("../models/Cart");
const Product = require("../models/Product");

// GET USER CART
exports.getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
  );

  if (!cart) {
    return res.json({ items: [] });
  }

  res.json(cart);
};

// ADD TO CART
exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
    });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId,
  );

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity || 1;
  } else {
    cart.items.push({
      product: productId,
      quantity: quantity || 1,
    });
  }

  await cart.save();

  res.json(cart);
};

// REMOVE ITEM
exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId,
  );

  await cart.save();

  res.json(cart);
};

// CLEAR CART
exports.clearCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  cart.items = [];

  await cart.save();

  res.json({ message: "Cart cleared" });
};
