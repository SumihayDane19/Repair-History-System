const bcrypt = require("bcryptjs");
const axios = require("axios");

const User = require("../models/User");

// ========================================
// LOGIN PAGE
// ========================================

exports.showLogin = (req, res) => {
    res.render("login", {
        error: null,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
    });
};

// ========================================
// VERIFY RECAPTCHA
// ========================================

const verifyRecaptcha = async (token) => {
    try {
        if (!token) {
            return false;
        }

        const response = await axios.post(
            "https://www.google.com/recaptcha/api/siteverify",
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: token
                }
            }
        );

        return response.data.success === true;

    } catch (error) {
        console.error(
            "reCAPTCHA verification error:",
            error.message
        );

        return false;
    }
};

// ========================================
// LOGIN
// ========================================

exports.login = async (req, res) => {
    try {
        const {
            email,
            password,
            "g-recaptcha-response": recaptchaToken
        } = req.body;

        // ----------------------------------------
        // Check required fields
        // ----------------------------------------

        if (!email || !password) {
            return res.render("login", {
                error: "Please enter your email and password.",
                recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // Verify reCAPTCHA FIRST
        // ----------------------------------------

        const recaptchaValid =
            await verifyRecaptcha(recaptchaToken);

        if (!recaptchaValid) {
            return res.render("login", {
                error: "Please complete the reCAPTCHA verification.",
                recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // Find user in MongoDB
        // ----------------------------------------

        const user = await User.findOne({
            email: email.toLowerCase()
        });

        if (!user) {
            return res.render("login", {
                error: "Invalid email or password.",
                recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // Verify password
        // ----------------------------------------

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.render("login", {
                error: "Invalid email or password.",
                recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // Create session
        // ----------------------------------------

        req.session.userId =
            user._id.toString();

        req.session.role =
            user.role;

        req.session.username =
            user.username;

        // ----------------------------------------
        // Login successful
        // ----------------------------------------

        return res.redirect("/dashboard");

    } catch (error) {
        console.error(error);

        return res.render("login", {
            error: "An unexpected error occurred.",
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
        });
    }
};

// ========================================
// REGISTRATION PAGE
// ========================================

exports.showRegister = (req, res) => {
    res.render("register", {
        error: null
    });
};

// ========================================
// REGISTRATION
// ========================================

exports.register = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            confirmPassword
        } = req.body;

        if (
            !username ||
            !email ||
            !password ||
            !confirmPassword
        ) {
            return res.render("register", {
                error: "Please complete all fields."
            });
        }

        if (password !== confirmPassword) {
            return res.render("register", {
                error: "Passwords do not match."
            });
        }

        const existingUser =
            await User.findOne({
                $or: [
                    {
                        email:
                            email.toLowerCase()
                    },
                    {
                        username
                    }
                ]
            });

        if (existingUser) {
            return res.render("register", {
                error:
                    "Username or email is already registered."
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 12);

        const user = new User({
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: "staff",
            twoFactorEnabled: false
        });

        await user.save();

        return res.redirect("/auth/login");

    } catch (error) {
        console.error(error);

        return res.render("register", {
            error: "Registration failed."
        });
    }
};

// ========================================
// LOGOUT
// ========================================

exports.logout = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error(error);

            return res.redirect("/dashboard");
        }

        res.redirect("/auth/login");
    });
};