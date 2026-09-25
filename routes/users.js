const express = require("express");

const router = express.Router();

const userController =
    require("../controllers/userControllers");

const {
    requireAdministrator
} = require("../middleware/roleMiddleWare");

// ========================================
// USER MANAGEMENT
// ========================================

router.get(
    "/",
    requireAdministrator,
    userController.index
);

router.get(
    "/create",
    requireAdministrator,
    userController.showCreate
);

router.post(
    "/create",
    requireAdministrator,
    userController.create
);

router.get(
    "/edit/:id",
    requireAdministrator,
    userController.showEdit
);

router.post(
    "/edit/:id",
    requireAdministrator,
    userController.update
);

router.post(
    "/deactivate/:id",
    requireAdministrator,
    userController.deactivate
);

router.post(
    "/activate/:id",
    requireAdministrator,
    userController.activate
);

module.exports = router;