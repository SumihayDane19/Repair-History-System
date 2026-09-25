require("dotenv").config();

const express = require("express");
const session = require("express-session");

const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");

const app = express();

const PORT = process.env.PORT || 3000;

// ========================================
// DATABASE
// ========================================

connectDB();

// ========================================
// VIEW ENGINE
// ========================================

app.set("view engine", "ejs");

// ========================================
// BODY PARSING
// ========================================

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

// ========================================
// STATIC FILES
// ========================================

app.use(express.static("public"));

// ========================================
// SESSION
// ========================================

app.use(
    session({
        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            sameSite: "lax",

            // HTTPS is required for secure cookies.
            // Keep false for localhost development.
            secure: process.env.NODE_ENV === "production",

            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

// ========================================
// AUTH ROUTES
// ========================================

app.use("/auth", authRoutes);

// ========================================
// DASHBOARD
// ========================================

app.get("/dashboard", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/auth/login");
    }

    res.render("dashboard", {
        username: req.session.username,
        role: req.session.role
    });
});

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
    res.redirect("/auth/login");
});

// ========================================
// SERVER
// ========================================

app.listen(PORT, () => {
    console.log(
        `Server running at http://localhost:${PORT}`
    );
});