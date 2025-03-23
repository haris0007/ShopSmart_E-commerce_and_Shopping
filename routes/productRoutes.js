const express = require('express');
const router = express.Router();
const ProductModel = require('../models/productModel');
const UserModel = require('../models/userModel');

// Middleware to verify seller
const verifySeller = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.body.sellerId);
        if (!user || !user.seller) {
            return res.status(403).json({ message: "You are not authorized to perform this action" });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add Product (POST)
router.post('/add', verifySeller, async (req, res) => {
    try {
        const newProduct = new ProductModel({...req.body,seller:req.id});
        await newProduct.save();
        res.status(201).json({ message: 'Product added successfully', product: newProduct });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Edit Product (PUT)
router.put('/edit/:productId', verifySeller, async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if product belongs to the seller
        if (product.seller.toString() !== req.body.sellerId) {
            return res.status(403).json({ message: "You can only edit your own products" });
        }

        const updatedProduct = await ProductModel.findByIdAndUpdate(
            req.params.productId,
            req.body,
            { new: true }
        );
        res.json({ message: 'Product updated', product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete Product (DELETE)
router.delete('/delete/:productId', verifySeller, async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if product belongs to the seller
        if (product.seller.toString() !== req.body.sellerId) {
            return res.status(403).json({ message: "You can only delete your own products" });
        }

        await ProductModel.findByIdAndDelete(req.params.productId);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
