const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
    userId,
    action,
    target,
    targetId = null,
    description,
    ipAddress = null
}) => {

    try {

        await AuditLog.create({
            userId,
            action,
            target,
            targetId,
            description,
            ipAddress
        });

    } catch (error) {

        console.error(
            "Audit logging error:",
            error.message
        );
    }
};

module.exports =
    createAuditLog;