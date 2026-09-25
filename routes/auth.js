const express = require("express");

const router = express.Router();

const authController =
    require("../controllers/authcontrollers");


// Login
router.get(
    "/login",
    authController.showLogin
);

router.post(
    "/login",
    authController.login
);


// Registration
router.get(
    "/register",
    authController.showRegister
);

router.post(
    "/register",
    authController.register
);


// Logout
router.get(
    "/logout",
    authController.logout
);


module.exports = router;