const express = require("express");

const router =
    express.Router();

const authController =
    require("../controllers/authcontrollers");

// ========================================
// LOGIN
// ========================================

router.get(
    "/login",
    authController.showLogin
);

router.post(
    "/login",
    authController.login
);

// ========================================
// REGISTRATION
// ========================================

router.get(
    "/register",
    authController.showRegister
);

router.post(
    "/register",
    authController.register
);

// ========================================
// 2FA VERIFICATION
// STA-004
// ========================================

router.get(
    "/verify-2fa",
    authController.showVerify2FA
);

router.post(
    "/verify-2fa",
    authController.verify2FA
);

// ========================================
// 2FA SETUP
// STA-005
// ========================================

router.get(
    "/setup-2fa",
    authController.showSetup2FA
);

router.post(
    "/setup-2fa",
    authController.completeSetup2FA
);

// ========================================
// LOGOUT
// ========================================

router.get(
    "/logout",
    authController.logout
);

module.exports = router;