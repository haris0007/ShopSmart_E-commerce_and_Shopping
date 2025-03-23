const express = require("express");
const UserModel = require("../models/userModel");
const authMw = require("../middleware/AuthM"); // if it's inside middleware folder; update the path accordingly
const AdminRouter = express.Router();

// Delete a user (only by admin, only user accounts)
AdminRouter.delete("/delete/:userId", authMw(), async (req, res) => {
    try {
        if (req.role !== "admin") {
            return res.status(403).json({ msg: "Only admin can perform this action" });
        }

        const user = await UserModel.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (user.role === "admin") {
            return res.status(403).json({ msg: "Admins cannot delete another admin" });
        }

        await UserModel.findByIdAndDelete(req.params.userId);
        res.status(200).json({ msg: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ msg: "Internal server error", error: err.message });
    }
});

// Make user unverified (only by admin, only user accounts)
AdminRouter.patch("/unverify/:userId", authMw(), async (req, res) => {
    try {
        if (req.role !== "admin") {
            return res.status(403).json({ msg: "Only admin can perform this action" });
        }

        const user = await UserModel.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (user.role === "admin") {
            return res.status(403).json({ msg: "Admins cannot modify verification of another admin" });
        }

        user.verified = false;
        await user.save();
        res.status(200).json({ msg: "User marked as unverified" });
    } catch (err) {
        res.status(500).json({ msg: "Internal server error", error: err.message });
    }
});

AdminRouter.patch("/make_seller/:id", authMw(), async (req, res) => {
    if (req.role !== "admin") {
        return res.status(403).json({ msg: "Access denied. Only admin can make sellers." });
    }

    try {
        const userId = req.params.id;
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { seller: true },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ msg: "User not found" });
        }

        res.status(200).json({ msg: "User is now a seller", user: updatedUser });
    } catch (err) {
        res.status(500).json({ msg: "Error making user a seller", error: err.message });
    }
});
module.exports = AdminRouter;
