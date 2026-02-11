# 🌩️ CLOUDINARY INTEGRATION GUIDE

## Overview
This application uses **Cloudinary** for enterprise-grade cloud storage of all product images and videos. This solution is scalable for 1000+ products with automatic optimization and CDN delivery.

---

## 📁 File Structure

```
src/
├── config/
│   └── cloudinary.js          # Cloudinary configuration & utilities
├── middlewares/
│   └── upload.middleware.js   # File upload handling
├── controllers/
│   └── product.controller.js  # Uses Cloudinary URLs
└── routes/
    └── product.routes.js      # Upload endpoint with Cloudinary
```

---

## ⚙️ Configuration

### Environment Variables (.env)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

These are already configured in your `.env` file.

---

## 🗂️ Cloudinary Folder Structure

All files are automatically organized in Cloudinary:

```
just_gold/
├── products/
│   ├── images/        # Product gallery images
│   ├── videos/        # Product videos
│   └── variants/      # Product variant/shade images
```

---

## 🚀 Key Features

### 1. **Automatic Image Optimization**
- Images are automatically converted to WebP/AVIF for modern browsers
- Quality is auto-optimized for best performance
- Maximum dimensions: 1500x1500px (auto-scaled)

### 2. **Video Optimization**
- Videos compressed and optimized for streaming
- Supports MP4, MOV, AVI, MKV, WebM formats
- Maximum file size: 100MB

### 3. **CDN Delivery**
- All media served through Cloudinary's global CDN
- Fast loading times worldwide
- No server bandwidth consumption

### 4. **Automatic Cleanup**
- When products are deleted, associated media is removed from Cloudinary
- Prevents storage bloat and unnecessary costs

---

## 📝 How It Works

### **Upload Flow:**

1. **Client** sends multipart/form-data with images/videos
2. **Multer** receives files in memory
3. **Upload Handler** (in product.routes.js) streams files to Cloudinary
4. **Cloudinary** processes, optimizes, and stores files
5. **Secure URLs** are returned and saved to database
6. **Database** stores full Cloudinary URLs (e.g., `https://res.cloudinary.com/...`)

### **Delete Flow:**

1. **Product deletion** triggered
2. **Controller** fetches all media URLs from database
3. **Cloudinary helper** extracts public_ids from URLs
4. **Batch delete** removes all files from Cloudinary
5. **Database records** are deleted

---

## 🛠️ API Usage

### **Create Product with Images/Videos**

**Endpoint:** `POST /api/v1/products`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `gallery` - Up to 6 product images
- `media` - Up to 6 additional media files
- `video` - 1 product video
- `color_0` to `color_5` - Variant/shade images
- `variant_main_image_0` to `variant_main_image_5` - Alternative naming

**Example Response:**
```json
{
  "message": "Product Created Successfully",
  "product_id": 123
}
```

**Database Storage:**
Images are stored as full Cloudinary URLs:
```
https://res.cloudinary.com/dvagrhc2w/image/upload/v1234567890/just_gold/products/images/abc123.jpg
```

---

## 🔧 Cloudinary Utilities

### Available Functions (in `src/config/cloudinary.js`)

#### 1. **deleteFromCloudinary(fileUrl)**
Deletes a single file from Cloudinary.

```javascript
const { deleteFromCloudinary } = require('./config/cloudinary');
await deleteFromCloudinary('https://res.cloudinary.com/.../image.jpg');
```

#### 2. **deleteMultipleFromCloudinary(fileUrls)**
Batch deletes multiple files (used in product deletion).

```javascript
const { deleteMultipleFromCloudinary } = require('./config/cloudinary');
await deleteMultipleFromCloudinary([
  'https://res.cloudinary.com/.../image1.jpg',
  'https://res.cloudinary.com/.../image2.jpg'
]);
```

#### 3. **getOptimizedUrl(publicId, options)**
Generates transformed image URLs for different sizes.

```javascript
const { getOptimizedUrl } = require('./config/cloudinary');

// Get thumbnail
const thumbnail = getOptimizedUrl('just_gold/products/images/abc123', {
  width: 200,
  height: 200,
  crop: 'fill'
});

// Get mobile-optimized
const mobile = getOptimizedUrl('just_gold/products/images/abc123', {
  width: 800,
  quality: 'auto'
});
```

---

## 📊 Storage Limits & Pricing

### Cloudinary Free Tier:
- ✅ 25 GB storage
- ✅ 25 GB monthly bandwidth
- ✅ Unlimited transformations

### For 1000+ Products:
- Average image size: ~500KB
- Average 5 images per product: **2.5MB per product**
- **1000 products = ~2.5GB** (well within free tier)

### Upgrade Options:
If you exceed free tier, consider:
- **Plus Plan**: 100GB storage, $99/month
- **Advanced Plan**: 200GB storage, custom pricing

---

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit `.env` file
2. **API Secrets**: Keep `CLOUDINARY_API_SECRET` private
3. **File Validation**: Already implemented (file type & size checks)
4. **Signed URLs**: For private content, use signed URLs

---

## 🐛 Troubleshooting

### **Error: "Invalid credentials"**
- Check `.env` file has correct Cloudinary credentials
- Ensure no extra spaces in environment variables

### **Error: "File too large"**
- Images: Max 10MB
- Videos: Max 100MB
- Adjust in `src/middlewares/upload.middleware.js`

### **Error: "Upload failed"**
- Check Cloudinary account is active
- Verify internet connection
- Check Cloudinary dashboard for quota limits

### **Images not displaying**
- Ensure URLs in database start with `https://res.cloudinary.com/`
- Check Cloudinary dashboard to verify files uploaded
- Test URL directly in browser

---

## 🔄 Migration from Local Storage

### Already Completed:
✅ Created Cloudinary config file  
✅ Created upload middleware  
✅ Updated product routes  
✅ Updated product controller  
✅ Removed local uploads serving  

### If You Have Existing Products:
Run a migration script to:
1. Upload existing `/uploads` files to Cloudinary
2. Update database URLs
3. Delete local files

---

## 📞 Support

### Cloudinary Documentation:
- [Main Docs](https://cloudinary.com/documentation)
- [Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)

### Application Support:
Contact your development team for integration questions.

---

## ✅ Testing Checklist

- [ ] Upload product with images
- [ ] Upload product with video
- [ ] Upload product with variants
- [ ] Delete product (verify Cloudinary cleanup)
- [ ] Check product display on frontend
- [ ] Test with 10+ file uploads
- [ ] Verify CDN URLs are working

---

**Last Updated**: February 9, 2026  
**Version**: 1.0.0
