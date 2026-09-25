const bcrypt = require("bcryptjs");

const User = require("../models/User");


// ========================================
// LOGIN PAGE
// ========================================

exports.showLogin = (req, res) => {

    res.render("login", {
        error: null
    });

};


// ========================================
// LOGIN
// ========================================

exports.login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.render("login", {
                error:
                    "Please enter your email and password."
            });

        }


        const user = await User.findOne({
            email: email.toLowerCase()
        });


        if (!user) {

            return res.render("login", {
                error:
                    "Invalid email or password."
            });

        }


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.render("login", {
                error:
                    "Invalid email or password."
            });

        }


        // Create authenticated session
        req.session.userId =
            user._id.toString();


        req.session.role =
            user.role;


        req.session.username =
            user.username;


        return res.redirect(
            "/dashboard"
        );


    } catch (error) {

        console.error(error);

        return res.render("login", {
            error:
                "An unexpected error occurred."
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

            return res.render(
                "register",
                {
                    error:
                        "Please complete all fields."
                }
            );

        }


        if (
            password !== confirmPassword
        ) {

            return res.render(
                "register",
                {
                    error:
                        "Passwords do not match."
                }
            );

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

            return res.render(
                "register",
                {
                    error:
                        "Username or email is already registered."
                }
            );

        }


        // Hash password
        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );


        const user =
            new User({

                username,

                email:
                    email.toLowerCase(),

                password:
                    hashedPassword,

                role:
                    "staff",

                twoFactorEnabled:
                    false

            });


        await user.save();


        return res.redirect(
            "/auth/login"
        );


    } catch (error) {

        console.error(error);

        return res.render(
            "register",
            {
                error:
                    "Registration failed."
            }
        );

    }

};


// ========================================
// LOGOUT
// ========================================

exports.logout = (req, res) => {

    req.session.destroy(
        (error) => {

            if (error) {

                console.error(error);

                return res.redirect(
                    "/dashboard"
                );

            }

            res.redirect(
                "/auth/login"
            );

        }
    );

};