const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/product.controller");

/* -------- STORAGE -------- */

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../../uploads"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

/* -------- UPLOAD CONFIG -------- */

const upload = multer({ storage }).fields([
  { name: "gallery", maxCount: 6 },
  { name: "media", maxCount: 6 },
  { name: "video", maxCount: 1 },
  { name: "color_0", maxCount: 1 },
  { name: "color_1", maxCount: 1 },
  { name: "color_2", maxCount: 1 },
  { name: "color_3", maxCount: 1 },
  { name: "color_4", maxCount: 1 },
  { name: "color_5", maxCount: 1 }
]);

/* -------- ROUTES -------- */

router.post("/", upload, controller.createProduct);
router.get("/", controller.getProducts);
router.get("/:slug", controller.getProductBySlug);
router.delete("/:id", controller.deleteProduct);

module.exports = router;
