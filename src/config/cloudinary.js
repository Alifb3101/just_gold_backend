const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

/* =========================================================
   CLOUDINARY CONFIGURATION
   - Handles image & video uploads for 1000+ products
   - Auto-optimizes media for performance
   - Generates transformations for different sizes
========================================================= */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS
});

/* =========================================================
   CLOUDINARY STORAGE FOR PRODUCT IMAGES
   - Organized folder structure: just_gold/products/
   - Auto-format: Converts to optimal format (WebP, AVIF)
   - Quality: Auto-optimized for web performance
========================================================= */

const productImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "just_gold/products/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [
      { width: 1500, height: 1500, crop: "limit" }, // Max dimensions
      { quality: "auto:best" }, // Auto quality optimization
      { fetch_format: "auto" }, // Auto format (WebP/AVIF)
    ],
    resource_type: "image",
  },
});

/* =========================================================
   CLOUDINARY STORAGE FOR PRODUCT VIDEOS
   - Organized folder: just_gold/products/videos/
   - Supports MP4, MOV, AVI formats
   - Auto-optimized for streaming
========================================================= */

const productVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "just_gold/products/videos",
    allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
    resource_type: "video",
    transformation: [
      { quality: "auto" }, // Auto quality
      { fetch_format: "auto" }, // Auto format
    ],
  },
});

/* =========================================================
   CLOUDINARY STORAGE FOR VARIANT IMAGES
   - Separate folder for product variants/shades
   - Higher quality for main product images
========================================================= */

const variantImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "just_gold/products/variants",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto:best" },
      { fetch_format: "auto" },
    ],
    resource_type: "image",
  },
});

/* =========================================================
   DELETE FILE FROM CLOUDINARY
   - Used when deleting products or updating images
   - Extracts public_id from Cloudinary URL
========================================================= */

const deleteFromCloudinary = async (fileUrl) => {
  try {
    // Extract public_id from URL
    // Example: https://res.cloudinary.com/.../just_gold/products/images/abc123.jpg
    const urlParts = fileUrl.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    
    if (uploadIndex === -1) return null;

    // Get everything after 'upload/v123456789/'
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join("/");
    
    // Remove file extension
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");

    // Determine resource type
    const resourceType = fileUrl.includes("/videos/") ? "video" : "image";

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return null;
  }
};

/* =========================================================
   DELETE MULTIPLE FILES FROM CLOUDINARY
   - Batch delete for performance
   - Used when deleting entire products
========================================================= */

const deleteMultipleFromCloudinary = async (fileUrls) => {
  try {
    const deletePromises = fileUrls.map((url) => deleteFromCloudinary(url));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error("Error batch deleting from Cloudinary:", error);
    return null;
  }
};

/* =========================================================
   GENERATE CLOUDINARY URL WITH TRANSFORMATIONS
   - For frontend to request different sizes/formats
========================================================= */

const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width = 800,
    height = 800,
    crop = "limit",
    quality = "auto",
    format = "auto",
  } = options;

  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop },
      { quality },
      { fetch_format: format },
    ],
  });
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  cloudinary,
  productImageStorage,
  productVideoStorage,
  variantImageStorage,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getOptimizedUrl,
};
