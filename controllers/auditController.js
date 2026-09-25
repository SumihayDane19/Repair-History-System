const AuditLog = require("../models/AuditLog");

exports.index = async (req, res) => {

    try {

        const logs =
            await AuditLog.find()
                .populate(
                    "userId",
                    "username email role"
                )
                .sort({
                    createdAt: -1
                });

        res.render(
            "audit/index",
            {
                logs,
                error: null
            }
        );

    } catch (error) {

        console.error(
            "Audit log error:",
            error.message
        );

        res.status(500).render(
            "audit/index",
            {
                logs: [],
                error:
                    "Unable to load audit logs."
            }
        );
    }
};