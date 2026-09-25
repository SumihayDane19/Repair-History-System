const bcrypt = require("bcryptjs");
const axios = require("axios");
const QRCode = require("qrcode");

const User = require("../models/User");

const {
    generateSecret,
    verifyTOTP,
    generateOtpAuthUrl
} = require("../utils/totp");

// ========================================
// LOGIN PAGE
// ========================================

exports.showLogin = (req, res) => {
    res.render("login", {
        error: null,
        recaptchaSiteKey:
            process.env.RECAPTCHA_SITE_KEY
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

        const response =
            await axios.post(
                "https://www.google.com/recaptcha/api/siteverify",
                null,
                {
                    params: {
                        secret:
                            process.env
                                .RECAPTCHA_SECRET_KEY,

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
            "g-recaptcha-response":
                recaptchaToken
        } = req.body;

        if (!email || !password) {
            return res.render("login", {
                error:
                    "Please enter your email and password.",

                recaptchaSiteKey:
                    process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // reCAPTCHA
        // ----------------------------------------

        const recaptchaValid =
            await verifyRecaptcha(
                recaptchaToken
            );

        if (!recaptchaValid) {
            return res.render("login", {
                error:
                    "Please complete the reCAPTCHA verification.",

                recaptchaSiteKey:
                    process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // Find user
        // ----------------------------------------

        const user =
            await User.findOne({
                email:
                    email.toLowerCase()
            });

        if (!user) {
            return res.render("login", {
                error:
                    "Invalid email or password.",

                recaptchaSiteKey:
                    process.env.RECAPTCHA_SITE_KEY
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
                error:
                    "Invalid email or password.",

                recaptchaSiteKey:
                    process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // CHECK 2FA
        // ----------------------------------------

        if (
            user.twoFactorEnabled &&
            user.twoFactorSecret
        ) {
            req.session.pending2FAUserId =
                user._id.toString();

            return res.redirect(
                "/auth/verify-2fa"
            );
        }

        // ----------------------------------------
        // NORMAL LOGIN
        // ----------------------------------------

        req.session.userId =
            user._id.toString();

        req.session.role =
            user.role;

        req.session.username =
            user.username;

        return res.redirect("/dashboard");

    } catch (error) {
        console.error(error);

        return res.render("login", {
            error:
                "An unexpected error occurred.",

            recaptchaSiteKey:
                process.env.RECAPTCHA_SITE_KEY
        });
    }
};

// ========================================
// 2FA VERIFICATION PAGE
// STA-004
// ========================================

exports.showVerify2FA = async (
    req,
    res
) => {
    try {
        if (
            !req.session.pending2FAUserId
        ) {
            return res.redirect(
                "/auth/login"
            );
        }

        return res.render(
            "verify-2fa",
            {
                error: null
            }
        );

    } catch (error) {
        console.error(error);

        return res.redirect(
            "/auth/login"
        );
    }
};

// ========================================
// VERIFY 2FA CODE
// STA-004
// ========================================

exports.verify2FA = async (
    req,
    res
) => {
    try {
        const {
            code
        } = req.body;

        if (
            !req.session.pending2FAUserId
        ) {
            return res.redirect(
                "/auth/login"
            );
        }

        if (
            !code ||
            !/^\d{6}$/.test(code)
        ) {
            return res.render(
                "verify-2fa",
                {
                    error:
                        "Please enter the 6-digit verification code."
                }
            );
        }

        const user =
            await User.findById(
                req.session.pending2FAUserId
            );

        if (
            !user ||
            !user.twoFactorEnabled ||
            !user.twoFactorSecret
        ) {
            return res.redirect(
                "/auth/login"
            );
        }

        const valid =
            verifyTOTP(
                user.twoFactorSecret,
                code
            );

        if (!valid) {
            return res.render(
                "verify-2fa",
                {
                    error:
                        "Invalid or expired verification code."
                }
            );
        }

        // ----------------------------------------
        // CREATE AUTHENTICATED SESSION
        // ----------------------------------------

        req.session.userId =
            user._id.toString();

        req.session.role =
            user.role;

        req.session.username =
            user.username;

        delete req.session.pending2FAUserId;

        return res.redirect(
            "/dashboard"
        );

    } catch (error) {
        console.error(error);

        return res.render(
            "verify-2fa",
            {
                error:
                    "An unexpected error occurred."
            }
        );
    }
};

// ========================================
// 2FA SETUP PAGE
// STA-005
// ========================================

exports.showSetup2FA = async (
    req,
    res
) => {
    try {
        if (!req.session.userId) {
            return res.redirect(
                "/auth/login"
            );
        }

        const user =
            await User.findById(
                req.session.userId
            );

        if (!user) {
            return res.redirect(
                "/auth/login"
            );
        }

        // Already enabled
        if (user.twoFactorEnabled) {
            return res.render(
                "setup-2fa",
                {
                    error: null,
                    success:
                        "Google Authenticator is already enabled.",
                    qrCode: null,
                    manualSecret: null
                }
            );
        }

        // Generate a temporary secret
        const secret =
            generateSecret();

        user.twoFactorTempSecret =
            secret;

        await user.save();

        const otpAuthUrl =
            generateOtpAuthUrl(
                secret,
                user.email
            );

        const qrCode =
            await QRCode.toDataURL(
                otpAuthUrl
            );

        return res.render(
            "setup-2fa",
            {
                error: null,
                success: null,
                qrCode,
                manualSecret: secret
            }
        );

    } catch (error) {
        console.error(error);

        return res.render(
            "setup-2fa",
            {
                error:
                    "Unable to start 2FA setup.",
                success: null,
                qrCode: null,
                manualSecret: null
            }
        );
    }
};

// ========================================
// COMPLETE 2FA SETUP
// STA-005
// ========================================

exports.completeSetup2FA =
    async (req, res) => {
        try {
            if (
                !req.session.userId
            ) {
                return res.redirect(
                    "/auth/login"
                );
            }

            const {
                code
            } = req.body;

            const user =
                await User.findById(
                    req.session.userId
                );

            if (!user) {
                return res.redirect(
                    "/auth/login"
                );
            }

            if (
                !user.twoFactorTempSecret
            ) {
                return res.render(
                    "setup-2fa",
                    {
                        error:
                            "No 2FA setup session exists. Please start setup again.",
                        success: null,
                        qrCode: null,
                        manualSecret: null
                    }
                );
            }

            if (
                !code ||
                !/^\d{6}$/.test(code)
            ) {
                return res.render(
                    "setup-2fa",
                    {
                        error:
                            "Please enter the 6-digit verification code.",
                        success: null,
                        qrCode: null,
                        manualSecret:
                            user.twoFactorTempSecret,
                        qrCode: null
                    }
                );
            }

            const valid =
                verifyTOTP(
                    user.twoFactorTempSecret,
                    code
                );

            if (!valid) {
                const otpAuthUrl =
                    generateOtpAuthUrl(
                        user.twoFactorTempSecret,
                        user.email
                    );

                const qrCode =
                    await QRCode.toDataURL(
                        otpAuthUrl
                    );

                return res.render(
                    "setup-2fa",
                    {
                        error:
                            "Invalid verification code. Please try again.",
                        success: null,
                        qrCode,
                        manualSecret:
                            user.twoFactorTempSecret
                    }
                );
            }

            // ----------------------------------------
            // ACTIVATE 2FA
            // ----------------------------------------

            user.twoFactorSecret =
                user.twoFactorTempSecret;

            user.twoFactorTempSecret =
                null;

            user.twoFactorEnabled =
                true;

            await user.save();

            return res.render(
                "setup-2fa",
                {
                    error: null,
                    success:
                        "Google Authenticator has been successfully enabled.",
                    qrCode: null,
                    manualSecret: null
                }
            );

        } catch (error) {
            console.error(error);

            return res.render(
                "setup-2fa",
                {
                    error:
                        "Unable to complete 2FA setup.",
                    success: null,
                    qrCode: null,
                    manualSecret: null
                }
            );
        }
    };

// ========================================
// REGISTRATION PAGE
// ========================================

exports.showRegister = (
    req,
    res
) => {
    res.render(
        "register",
        {
            error: null
        }
    );
};

// ========================================
// REGISTRATION
// ========================================

exports.register = async (
    req,
    res
) => {
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
            password !==
            confirmPassword
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
                role: "staff",
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

exports.logout = (
    req,
    res
) => {
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