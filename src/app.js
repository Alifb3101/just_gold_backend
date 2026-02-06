const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

/* ---------------- SECURITY ---------------- */

// Secure headers
app.use(helmet());

// Allow frontend/admin access
app.use(cors({
  origin: ["http://localhost:3001"],
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

/* ---------------- HEALTH CHECK ---------------- */

app.get("/", (req, res) => {
  res.json({ status: "Backend_Just_gold API Running 🚀" });
});

/* ---------------- ROUTES ---------------- */

app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/products", require("./routes/product.routes"));
app.use("/api/v1/orders", require("./routes/order.routes"));
app.use("/api/v1/categories", require("./routes/category.routes"));


/* ---------------- 404 HANDLER ---------------- */

app.use((req, res) => {
  res.status(404).json({ message: "Route Not Found" });
});

/* ---------------- GLOBAL ERROR ---------------- */

app.use(require("./middlewares/error.middleware"));

module.exports = app;
