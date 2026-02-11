const router = require("express").Router();
const multer = require("multer");
const controller = require("../controllers/product.controller");

/* =========================================================
   CLOUDINARY UPLOAD CONFIGURATION
   - All files now stored in Cloudinary
   - Auto-optimized for 1000+ products
   - Scalable cloud storage solution
========================================================= */

const MAX_VARIANTS = 20;

const buildVariantFields = () => {
  const fields = [];
  for (let i = 0; i < MAX_VARIANTS; i++) {
    fields.push({ name: `color_${i}`, maxCount: 1 });
    fields.push({ name: `color_secondary_${i}`, maxCount: 1 });
    fields.push({ name: `variant_main_image_${i}`, maxCount: 1 });
    fields.push({ name: `variant_secondary_image_${i}`, maxCount: 1 });
  }
  return fields;
};

const uploadFields = [
  { name: "gallery", maxCount: 6 },
  { name: "media", maxCount: 6 },
  { name: "video", maxCount: 1 },
  ...buildVariantFields(),
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
    files: 80,
  },
}).fields(uploadFields);


/* =========================================================
   FILE VALIDATION HELPERS
========================================================= */

const allowedImageMimes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
  "image/webp",
];

const allowedVideoMimes = [
  "video/mp4",
  "video/quicktime", // mov
  "video/x-msvideo", // avi
  "video/x-matroska", // mkv
  "video/webm",
];

const validateFileForCloudinary = (fieldName, file) => {
  if (!file || !file.buffer || file.buffer.length === 0) {
    return "Uploaded field did not include file data. Make sure you selected 'File' and picked an actual image/video.";
  }

  const mimetype = file.mimetype || "";

  if (fieldName === "video") {
    if (!allowedVideoMimes.includes(mimetype)) {
      return `Invalid video type (${mimetype || "unknown"}). Supported: MP4, MOV, AVI, MKV, WebM.`;
    }
  } else {
    if (!allowedImageMimes.includes(mimetype)) {
      return `Invalid image type (${mimetype || "unknown"}). Supported: JPEG, PNG, GIF, WebP.`;
    }
  }

  return null;
};

/* =========================================================
   CLOUDINARY UPLOAD HANDLER
   - Uploads directly to Cloudinary cloud storage
   - No local file storage needed
========================================================= */

const uploadHandler = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File too large. Max 10MB for images, 100MB for videos.",
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            message: "Too many files uploaded.",
          });
        }
      }
      return res.status(400).json({
        message: err.message || "File upload error",
      });
    }

    // Upload to Cloudinary
    if (req.files && Object.keys(req.files).length > 0) {
      try {
        const cloudinary = require("cloudinary").v2;
        const uploadPromises = [];

        for (const fieldName in req.files) {
          const files = req.files[fieldName];
          
          for (const file of files) {
            const validationError = validateFileForCloudinary(fieldName, file);
            if (validationError) {
              return res.status(400).json({
                message: validationError,
                field: fieldName,
                filename: file.originalname || "unknown",
              });
            }

            // Determine folder based on field type
            let folder = "just_gold/products/images";
            let resourceType = "image";

            if (fieldName === "video") {
              folder = "just_gold/products/videos";
              resourceType = "video";
            } else if (
              fieldName.startsWith("color_") ||
              fieldName.startsWith("color_secondary_") ||
              fieldName.startsWith("variant_main_image_") ||
              fieldName.startsWith("variant_secondary_image_")
            ) {
              folder = "just_gold/products/variants";
            }

            // Upload to Cloudinary
            const uploadPromise = new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: folder,
                  resource_type: resourceType,
                  transformation: resourceType === "image" ? [
                    { width: 1500, height: 1500, crop: "limit" },
                    { quality: "auto:best" },
                    { fetch_format: "auto" },
                  ] : [
                    { quality: "auto" },
                  ],
                },
                (error, result) => {
                  if (error) {
                    error._fieldName = fieldName;
                    error._filename = file.originalname || "unknown";
                    error._mimetype = file.mimetype;
                    reject(error);
                  } else {
                    // Replace file object with Cloudinary result
                    file.cloudinary = result;
                    file.path = result.secure_url;
                    file.filename = result.public_id.split("/").pop();
                    resolve(result);
                  }
                }
              );
              
              uploadStream.end(file.buffer);
            });

            uploadPromises.push(uploadPromise);
          }
        }

        await Promise.all(uploadPromises);
        next();
      } catch (error) {
        console.error("Cloudinary upload error:", {
          message: error.message,
          http_code: error.http_code,
          field: error._fieldName,
          filename: error._filename,
          mimetype: error._mimetype,
        });
        const statusCode = error.http_code === 400 ? 400 : 500;
        return res.status(statusCode).json({
          message: "Cloudinary rejected the uploaded file. Ensure you're sending a valid image/video file via form-data.",
          details: {
            field: error._fieldName || null,
            filename: error._filename || null,
            mimetype: error._mimetype || null,
            cloudinary_error: error.message,
            http_code: error.http_code || null,
          },
        });
      }
    } else {
      next();
    }
  });
};

/* -------- ROUTES -------- */

// Product CRUD (single resource)
router.post("/product", uploadHandler, controller.createProduct);
router.put("/product/:id", uploadHandler, controller.updateProduct);
router.delete("/product/:id", controller.deleteProduct);
router.get("/product/:id-:slug", controller.getProductDetail);

// Product collection
router.get("/products", controller.getProducts);

module.exports = router;
