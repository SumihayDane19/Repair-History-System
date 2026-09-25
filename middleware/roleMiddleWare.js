const User = require("../models/User");

// ========================================
// ADMINISTRATOR ONLY
// ========================================

exports.requireAdministrator =
    async (req, res, next) => {

        try {

            if (!req.session.userId) {

                return res.redirect(
                    "/auth/login"
                );
            }

            const user =
                await User.findById(
                    req.session.userId
                );

            if (
                !user ||
                user.isActive === false
            ) {

                req.session.destroy(() => {
                    res.redirect(
                        "/auth/login"
                    );
                });

                return;
            }

            if (
                user.role !==
                "administrator"
            ) {

                return res.status(403).render(
                    "error",
                    {
                        message:
                            "Administrator access is required."
                    }
                );
            }

            next();

        } catch (error) {

            console.error(
                "Role middleware error:",
                error.message
            );

            res.status(500).render(
                "error",
                {
                    message:
                        "Unable to verify permissions."
                }
            );
        }
    };