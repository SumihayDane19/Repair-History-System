const express = require("express");

const router = express.Router();

const backupController =
    require("../controllers/backupController");

const {
    requireAdministrator
} = require("../middleware/roleMiddleWare");

router.get(
    "/",
    requireAdministrator,
    backupController.index
);

router.post(
    "/create",
    requireAdministrator,
    backupController.create
);

router.post(
    "/restore",
    requireAdministrator,
    backupController.restore
);

module.exports = router;