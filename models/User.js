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

        isActive: {
            type: Boolean,
            default: true
        },

        twoFactorEnabled: {
            type: Boolean,
            default: false
        },

        twoFactorSecret: {
            type: String,
            default: null
        },

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