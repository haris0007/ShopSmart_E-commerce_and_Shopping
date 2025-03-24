const express = require("express");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const authMw = require("../middleware/AuthM");
const cartRouter = express.Router();

// Add product to cart & update stock
cartRouter.post("/add", authMw(), async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ msg: "Product not found" });
    if (product.stock < quantity) return res.status(400).json({ msg: "Not enough stock" });

    // Reduce stock
    product.stock -= quantity;
    await product.save();

    let cart = await Cart.findOne({ user: req.id });
    if (!cart) {
      cart = new Cart({ user: req.id, products: [{ product: productId, quantity }] });
    } else {
      const index = cart.products.findIndex(p => p.product.toString() === productId);
      if (index > -1) {
        cart.products[index].quantity += quantity;
      } else {
        cart.products.push({ product: productId, quantity });
      }
    }
    await cart.save();
    res.status(200).json({ msg: "Product added to cart and stock updated", cart });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Remove product from cart & restore stock
cartRouter.delete("/remove/:productId", authMw(), async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ user: req.id });
    if (!cart) return res.status(404).json({ msg: "Cart not found" });

    const itemIndex = cart.products.findIndex(p => p.product.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ msg: "Product not in cart" });

    const quantityToRestore = cart.products[itemIndex].quantity;
    cart.products.splice(itemIndex, 1);
    await cart.save();

    // Restore stock
    const product = await Product.findById(productId);
    if (product) {
      product.stock += quantityToRestore;
      await product.save();
    }

    res.status(200).json({ msg: "Product removed from cart & stock restored", cart });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Update product quantity in cart & adjust stock
cartRouter.put("/update/:productId", authMw(), async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.id });
    if (!cart) return res.status(404).json({ msg: "Cart not found" });

    const productInCart = cart.products.find(p => p.product.toString() === productId);
    if (!productInCart) return res.status(404).json({ msg: "Product not in cart" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    const difference = quantity - productInCart.quantity;
    if (difference > 0) {
      // Need more stock
      if (product.stock < difference) return res.status(400).json({ msg: "Not enough stock" });
      product.stock -= difference;
    } else if (difference < 0) {
      // Restore stock if reduced
      product.stock += Math.abs(difference);
    }

    await product.save();
    productInCart.quantity = quantity;
    await cart.save();

    res.status(200).json({ msg: "Cart updated & stock adjusted", cart });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get user cart
cartRouter.get("/", authMw(), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.id }).populate("products.product");
    res.status(200).json(cart || { products: [] });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Clear entire cart and restore stock
CartRouter.delete("/clearcart", authMw(), async (req, res) => {
    try {
      const userId = req.id;
      const cart = await CartModel.findOne({ user: userId });
      if (!cart) return res.status(404).json({ msg: "Cart not found" });
  
      // Restore stock for each product
      for (const item of cart.products) {
        const product = await ProductModel.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
  
      // Clear cart products
      cart.products = [];
      await cart.save();
  
      res.status(200).json({ msg: "Cart cleared successfully", cart });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  });
  

module.exports = cartRouter;
