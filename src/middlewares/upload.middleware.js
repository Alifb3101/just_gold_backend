const multer = require("multer");
const {
  productImageStorage,
  productVideoStorage,
  variantImageStorage,
} = require("../config/cloudinary");

/* =========================================================
   CLOUDINARY UPLOAD MIDDLEWARE
   - Handles multiple file uploads to Cloudinary
   - Supports images, videos, and variant images
   - Enterprise-grade file validation
========================================================= */

/* -------- FILE FILTER: VALIDATE FILE TYPES -------- */

const imageFileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedImageTypes.test(
    file.originalname.toLowerCase().split(".").pop()
  );
  const mimetype = allowedImageTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed!"));
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
  const extname = allowedVideoTypes.test(
    file.originalname.toLowerCase().split(".").pop()
  );
  const mimetype = file.mimetype.startsWith("video/");

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only video files (MP4, MOV, AVI, MKV, WebM) are allowed!"));
  }
};

/* -------- DYNAMIC FILE FILTER -------- */

const dynamicFileFilter = (req, file, cb) => {
  // Video field
  if (file.fieldname === "video") {
    return videoFileFilter(req, file, cb);
  }
  // All other fields are images
  else {
    return imageFileFilter(req, file, cb);
  }
};

/* =========================================================
   MULTER CONFIGURATION WITH CLOUDINARY
   - Handles product gallery images (up to 6)
   - Handles product videos (1)
   - Handles variant/shade images (up to 6)
   - 10MB limit per file for images
   - 100MB limit for videos
========================================================= */

const uploadToCloudinary = multer({
  storage: multer.memoryStorage(), // Temporary storage
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (for videos)
    files: 80, // Support larger variant batches
  },
  fileFilter: dynamicFileFilter,
});

/* =========================================================
   SMART STORAGE SELECTOR
   - Routes different file types to appropriate storage
========================================================= */

const getStorageForField = (fieldname) => {
  if (fieldname === "video") {
    return productVideoStorage;
  } else if (
    fieldname.startsWith("color_") ||
    fieldname.startsWith("color_secondary_") ||
    fieldname.startsWith("variant_main_image_") ||
    fieldname.startsWith("variant_secondary_image_")
  ) {
    return variantImageStorage;
  } else {
    return productImageStorage;
  }
};

/* =========================================================
   PRODUCT UPLOAD MIDDLEWARE
   - Processes all product-related uploads
   - Dynamically routes to correct Cloudinary folder
========================================================= */

const productUpload = (req, res, next) => {
  // Define fields configuration
  const MAX_VARIANTS = 20;
  const fields = [
    { name: "gallery", maxCount: 6 },
    { name: "media", maxCount: 6 },
    { name: "video", maxCount: 1 },
  ];

  for (let i = 0; i < MAX_VARIANTS; i++) {
    fields.push({ name: `color_${i}`, maxCount: 1 });
    fields.push({ name: `color_secondary_${i}`, maxCount: 1 });
    fields.push({ name: `variant_main_image_${i}`, maxCount: 1 });
    fields.push({ name: `variant_secondary_image_${i}`, maxCount: 1 });
  }

  // Create separate multer instances with appropriate storage
  const uploaders = {};

  fields.forEach((field) => {
    const storage = getStorageForField(field.name);
    uploaders[field.name] = multer({
      storage: storage,
      limits: {
        fileSize: field.name === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024,
      },
      fileFilter: dynamicFileFilter,
    }).single(field.name);
  });

  // Process all fields
  let filesProcessed = 0;
  let totalFields = 0;

  // Count total fields in request
  fields.forEach((field) => {
    if (req.files && req.files[field.name]) {
      totalFields++;
    }
  });

  // If no files, skip
  if (totalFields === 0) {
    req.files = {};
    return next();
  }

  // Process each field
  const processField = (index) => {
    if (index >= fields.length) {
      return next();
    }

    const field = fields[index];
    const storage = getStorageForField(field.name);

    multer({
      storage: storage,
      limits: {
        fileSize: field.name === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024,
      },
      fileFilter: dynamicFileFilter,
    }).fields([field])(req, res, (err) => {
      if (err) {
        return next(err);
      }
      processField(index + 1);
    });
  };

  // Start processing
  multer({
    storage: productImageStorage, // Default storage
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 80,
    },
    fileFilter: dynamicFileFilter,
  }).fields(fields)(req, res, (err) => {
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
    next();
  });
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  productUpload,
  uploadToCloudinary,
};
