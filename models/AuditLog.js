const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        action: {
            type: String,
            required: true,
            trim: true
        },

        target: {
            type: String,
            required: true,
            trim: true
        },

        targetId: {
            type: String,
            default: null
        },

        description: {
            type: String,
            required: true
        },

        ipAddress: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model(
        "AuditLog",
        auditLogSchema
    );