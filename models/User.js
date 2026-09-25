const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: [
                "staff",
                "technician",
                "administrator"
            ],
            default: "staff"
        },

        // ========================================
        // TWO-FACTOR AUTHENTICATION
        // ========================================

        twoFactorEnabled: {
            type: Boolean,
            default: false
        },

        // Permanent Google Authenticator secret
        twoFactorSecret: {
            type: String,
            default: null
        },

        // Temporary secret used during setup
        // It becomes permanent only after
        // the user successfully verifies a code.
        twoFactorTempSecret: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model("User", userSchema);