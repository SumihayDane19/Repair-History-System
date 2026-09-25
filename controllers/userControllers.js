const bcrypt = require("bcryptjs");

const User = require("../models/User");

// ========================================
// USER MANAGEMENT PAGE
// ========================================

exports.index = async (req, res) => {

    try {

        const users = await User.find()
            .select("-password -twoFactorSecret -twoFactorTempSecret")
            .sort({ createdAt: -1 });

        res.render("users/index", {
            users,
            sessionUsername: req.session.username,
            error: null,
            success: null
        });

    } catch (error) {

        console.error(
            "User management error:",
            error.message
        );

        res.status(500).render("users/index", {
            users: [],
            sessionUsername: req.session.username,
            error: "Unable to load users.",
            success: null
        });
    }
};

// ========================================
// CREATE USER PAGE
// ========================================

exports.showCreate = (req, res) => {

    res.render("users/create", {
        error: null
    });
};

// ========================================
// CREATE USER
// ========================================

exports.create = async (req, res) => {

    try {

        const {
            username,
            email,
            password,
            confirmPassword,
            role
        } = req.body;

        if (
            !username ||
            !email ||
            !password ||
            !confirmPassword ||
            !role
        ) {

            return res.render("users/create", {
                error:
                    "Please complete all fields."
            });
        }

        if (
            ![
                "staff",
                "technician",
                "administrator"
            ].includes(role)
        ) {

            return res.render("users/create", {
                error:
                    "Invalid user role."
            });
        }

        if (password.length < 8) {

            return res.render("users/create", {
                error:
                    "Password must be at least 8 characters."
            });
        }

        if (password !== confirmPassword) {

            return res.render("users/create", {
                error:
                    "Passwords do not match."
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const existingUser =
            await User.findOne({
                $or: [
                    {
                        email:
                            normalizedEmail
                    },
                    {
                        username:
                            username.trim()
                    }
                ]
            });

        if (existingUser) {

            return res.render("users/create", {
                error:
                    "Username or email is already registered."
            });
        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );

        const user = new User({
            username:
                username.trim(),

            email:
                normalizedEmail,

            password:
                hashedPassword,

            role,

            isActive:
                true
        });

        await user.save();

        res.redirect("/users");

    } catch (error) {

        console.error(
            "Create user error:",
            error.message
        );

        res.render("users/create", {
            error:
                "Unable to create user."
        });
    }
};

// ========================================
// EDIT USER PAGE
// ========================================

exports.showEdit = async (req, res) => {

    try {

        const user =
            await User.findById(
                req.params.id
            );

        if (!user) {

            return res.redirect(
                "/users"
            );
        }

        res.render("users/edit", {
            user,
            error: null
        });

    } catch (error) {

        console.error(
            "Edit user page error:",
            error.message
        );

        res.redirect("/users");
    }
};

// ========================================
// EDIT USER
// ========================================

exports.update = async (req, res) => {

    try {

        const {
            username,
            email,
            role,
            password
        } = req.body;

        const user =
            await User.findById(
                req.params.id
            );

        if (!user) {

            return res.redirect(
                "/users"
            );
        }

        if (
            ![
                "staff",
                "technician",
                "administrator"
            ].includes(role)
        ) {

            return res.render("users/edit", {
                user,
                error:
                    "Invalid user role."
            });
        }

        user.username =
            username.trim();

        user.email =
            email.trim().toLowerCase();

        user.role =
            role;

        if (
            password &&
            password.length >= 8
        ) {

            user.password =
                await bcrypt.hash(
                    password,
                    12
                );
        }

        await user.save();

        res.redirect("/users");

    } catch (error) {

        console.error(
            "Update user error:",
            error.message
        );

        res.redirect("/users");
    }
};

// ========================================
// DEACTIVATE USER
// ========================================

exports.deactivate = async (
    req,
    res
) => {

    try {

        const user =
            await User.findById(
                req.params.id
            );

        if (!user) {
            return res.redirect(
                "/users"
            );
        }

        // Prevent administrator from
        // deactivating their own account.

        if (
            user._id.toString() ===
            req.session.userId
        ) {

            return res.redirect(
                "/users?error=self"
            );
        }

        user.isActive = false;

        await user.save();

        res.redirect("/users");

    } catch (error) {

        console.error(
            "Deactivate user error:",
            error.message
        );

        res.redirect("/users");
    }
};

// ========================================
// ACTIVATE USER
// ========================================

exports.activate = async (
    req,
    res
) => {

    try {

        const user =
            await User.findById(
                req.params.id
            );

        if (!user) {
            return res.redirect(
                "/users"
            );
        }

        user.isActive = true;

        await user.save();

        res.redirect("/users");

    } catch (error) {

        console.error(
            "Activate user error:",
            error.message
        );

        res.redirect("/users");
    }
};