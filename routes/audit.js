const express = require("express");

const router = express.Router();

const auditController =
    require("../controllers/auditController");

const {
    requireAdministrator
} = require("../middleware/roleMiddleWare");

router.get(
    "/",
    requireAdministrator,
    auditController.index
);

module.exports = router;