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
// VALIDATION HELPERS
// STA-006
// ========================================

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPassword = (password) => {
    return (
        typeof password === "string" &&
        password.length >= 8 &&
        password.length <= 128
    );
};

const isValidUsername = (username) => {
    return (
        typeof username === "string" &&
        /^[a-zA-Z0-9_]{3,30}$/.test(username)
    );
};

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

        const response = await axios.post(
            "https://www.google.com/recaptcha/api/siteverify",
            null,
            {
                params: {
                    secret:
                        process.env.RECAPTCHA_SECRET_KEY,

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
// REGENERATE SESSION
// STA-006
// ========================================

const regenerateSession = (req) => {

    return new Promise((resolve, reject) => {

        req.session.regenerate((error) => {

            if (error) {
                return reject(error);
            }

            resolve();
        });
    });
};

// ========================================
// LOGIN
// STA-001
// STA-002
// STA-003
// STA-006
// ========================================

exports.login = async (req, res) => {

    try {

        const {
            email,
            password,
            "g-recaptcha-response":
                recaptchaToken
        } = req.body;

        // ----------------------------------------
        // SERVER-SIDE INPUT VALIDATION
        // ----------------------------------------

        if (
            typeof email !== "string" ||
            typeof password !== "string"
        ) {

            return res.render("login", {
                error:
                    "Invalid email or password.",

                recaptchaSiteKey:
                    process.env.RECAPTCHA_SITE_KEY
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        if (
            !isValidEmail(normalizedEmail) ||
            !isValidPassword(password)
        ) {

            return res.render("login", {
                error:
                    "Invalid email or password.",

                recaptchaSiteKey:
                    process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // RECAPTCHA
        // STA-002
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
        // FIND USER
        // ----------------------------------------

        const user =
            await User.findOne({
                email: normalizedEmail
            });

        // ----------------------------------------
        // GENERIC ERROR
        // ----------------------------------------

        if (!user) {

            return res.render("login", {
                error:
                    "Invalid email or password.",

                recaptchaSiteKey:
                    process.env.RECAPTCHA_SITE_KEY
            });
        }

        // ----------------------------------------
        // PASSWORD VERIFICATION
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
        // REGENERATE SESSION
        // STA-006
        // ----------------------------------------

        await regenerateSession(req);

        // ----------------------------------------
        // CHECK 2FA
        // STA-003
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
        // AUTHENTICATED SESSION
        // ----------------------------------------

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

        console.error(
            "Login error:",
            error.message
        );

        return res.render("login", {
            error:
                "Unable to process login.",

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

    if (!req.session.pending2FAUserId) {

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
};

// ========================================
// VERIFY 2FA CODE
// STA-004
// STA-006
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

        // ----------------------------------------
        // SERVER-SIDE CODE VALIDATION
        // ----------------------------------------

        if (
            typeof code !== "string" ||
            !/^\d{6}$/.test(code)
        ) {

            return res.render(
                "verify-2fa",
                {
                    error:
                        "Invalid verification code."
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
        // REGENERATE SESSION AGAIN
        // ----------------------------------------

        await regenerateSession(req);

        // ----------------------------------------
        // FULLY AUTHENTICATED SESSION
        // ----------------------------------------

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

        console.error(
            "2FA verification error:",
            error.message
        );

        return res.render(
            "verify-2fa",
            {
                error:
                    "Unable to verify authentication code."
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

        console.error(
            "2FA setup error:",
            error.message
        );

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

            if (!req.session.userId) {

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
                typeof code !== "string" ||
                !/^\d{6}$/.test(code)
            ) {

                return res.render(
                    "setup-2fa",
                    {
                        error:
                            "Invalid verification code.",
                        success: null,
                        qrCode: null,
                        manualSecret:
                            user.twoFactorTempSecret
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

            console.error(
                "2FA setup completion error:",
                error.message
            );

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
// STA-001 / STA-006
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

        // ----------------------------------------
        // SERVER-SIDE VALIDATION
        // ----------------------------------------

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof confirmPassword !== "string"
        ) {

            return res.render(
                "register",
                {
                    error:
                        "Please provide valid registration information."
                }
            );
        }

        const cleanUsername =
            username.trim();

        const normalizedEmail =
            email.trim().toLowerCase();

        if (
            !isValidUsername(
                cleanUsername
            )
        ) {

            return res.render(
                "register",
                {
                    error:
                        "Username must be 3-30 characters and contain only letters, numbers, and underscores."
                }
            );
        }

        if (
            !isValidEmail(
                normalizedEmail
            )
        ) {

            return res.render(
                "register",
                {
                    error:
                        "Please enter a valid email address."
                }
            );
        }

        if (
            !isValidPassword(password)
        ) {

            return res.render(
                "register",
                {
                    error:
                        "Password must be between 8 and 128 characters."
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

        // ----------------------------------------
        // CHECK EXISTING ACCOUNT
        // ----------------------------------------

        const existingUser =
            await User.findOne({
                $or: [
                    {
                        email:
                            normalizedEmail
                    },
                    {
                        username:
                            cleanUsername
                    }
                ]
            });

        if (existingUser) {

            return res.render(
                "register",
                {
                    error:
                        "Unable to create the account with the information provided."
                }
            );
        }

        // ----------------------------------------
        // HASH PASSWORD
        // ----------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );

        const user =
            new User({
                username:
                    cleanUsername,

                email:
                    normalizedEmail,

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

        console.error(
            "Registration error:",
            error.message
        );

        return res.render(
            "register",
            {
                error:
                    "Unable to create the account."
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

                console.error(
                    "Logout error:",
                    error.message
                );

                return res.redirect(
                    "/dashboard"
                );
            }

            res.clearCookie(
                "connect.sid"
            );

            res.redirect(
                "/auth/login"
            );
        }
    );
};