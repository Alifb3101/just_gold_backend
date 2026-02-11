# API Documentation - Just Gold Backend
**Base URL:** `http://localhost:5000`

---

## 1️⃣ HEALTH CHECK

### GET Health Status
```
GET /
```

**cURL:**
```bash
curl -X GET http://localhost:5000/
```

**Response:**
```json
{
  "status": "Backend_Just_gold API Running 🚀"
}
```

---

## 2️⃣ AUTHENTICATION

### POST Register User
```
POST /api/v1/auth/register
Content-Type: application/json
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
  }'
```

---

### POST Login User
```
POST /api/v1/auth/login
Content-Type: application/json
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

---

## 3️⃣ PRODUCTS

### GET All Products (Paginated)
```
GET /api/v1/products?page=1&limit=12
```

**Query Params:**
- `page` (default `1`, min `1`)
- `limit` (default `12`, max `50`)

**cURL:**
```bash
curl -X GET "http://localhost:5000/api/v1/products?page=1&limit=12"
```

**Response:**
```json
{
  "page": 1,
  "limit": 12,
  "count": 1,
  "products": [
    {
      "id": 1,
      "name": "Skin Gloss",
      "slug": "skin-gloss",
      "base_price": "25.00",
      "description": "Liquid illuminator with squalane",
      "product_model_no": "SKG-2026-001",
      "thumbnail": "https://res.cloudinary.com/.../images/skin-gloss-thumb.jpg",
      "afterimage": "https://res.cloudinary.com/.../images/skin-gloss-after.jpg",
      "created_at": "2026-02-07T12:00:00.000Z"
    }
  ]
}
```

---

### GET Product Detail (Canonical SEO URL)
```
GET /api/v1/product/:id-:slug
```

**How it works:**
- `id` drives the lookup (fast, indexed)
- `slug` is validated for SEO-friendly URLs
- If the slug mismatches, the API returns **301** with `Location` + `redirect` field so clients can follow the canonical URL

**cURL:**
```bash
curl -X GET http://localhost:5000/api/v1/product/1-skin-gloss
```

**Response:**
```json
{
  "id": 1,
  "name": "Skin Gloss",
  "slug": "skin-gloss",
  "base_price": "25.00",
  "description": "Liquid illuminator with squalane",
  "product_model_no": "SKG-2026-001",
  "thumbnail": "https://res.cloudinary.com/.../images/skin-gloss-thumb.jpg",
  "afterimage": "https://res.cloudinary.com/.../images/skin-gloss-after.jpg",
  "how_to_apply": "Apply a small amount to cheekbones...",
  "benefits": "Provides instant radiant glow...",
  "key_features": "Lightweight, water-resistant...",
  "ingredients": "Squalane, Vitamin E...",
  "variants": [
    {
      "id": 1,
      "shade": "sugar drip",
      "color_type": "warm",
      "stock": 20,
      "main_image": "https://res.cloudinary.com/dvagrhc2w/image/upload/v1234567890/just_gold/products/variants/abc123.jpg",
      "secondary_image": "https://res.cloudinary.com/dvagrhc2w/image/upload/v1234567890/just_gold/products/variants/abc123-alt.jpg",
      "price": "25.00",
      "discount_price": "50.00",
      "variant_model_no": "SKG-2026-001-SD"
    }
  ],
  "media": [
    {
      "id": 20,
      "image_url": "https://res.cloudinary.com/dvagrhc2w/image/upload/v1234567890/just_gold/products/images/def456.jpg",
      "media_type": "image"
    },
    {
      "id": 21,
      "image_url": "https://res.cloudinary.com/dvagrhc2w/video/upload/v1234567890/just_gold/products/videos/vid789.mp4",
      "media_type": "video"
    }
  ]
}
```

**Slug mismatch example:**
```json
{
  "message": "Slug mismatch. Use canonical URL.",
  "redirect": "/api/v1/product/1-skin-gloss"
}
```

---

### POST Create Product
```
POST /api/v1/product
Content-Type: multipart/form-data
```

**Form Fields:**
- `name` (text)
- `description` (text)
- `base_price` (number)
- `subcategory_id` (number)
- `product_model_no` (text)
- `how_to_apply` (text)
- `benefits` (text)
- `key_features` (text)
- `ingredients` (text)
- `thumbnail` (text) - Cloudinary URL for default product image
- `afterimage` (text) - Optional alternate/default image URL
- `gallery` (file) - up to 6 files
- `media` (file) - up to 6 files
- `video` (file) - 1 file
- `color_0, color_1, color_2...` (files) - variant images
- `color_secondary_0, color_secondary_1...` (files) - optional secondary images per variant
- `variants` (JSON string)

**Variant JSON Schema (per entry):**
```
{
  "color": "Shade name",            // required
  "color_type": "warm/cool/...",     // optional descriptive tag
  "stock": 25,
  "price": 1299,
  "discount_price": 999,
  "variant_model_no": "SKU-001"
}
```
Both `color_type` and file-based secondary images are nullable/optional.

**cURL with Files:**
```bash
curl -X POST http://localhost:5000/api/v1/product \
  -F "name=Skin Gloss Deluxe" \
  -F "description=Premium liquid illuminator" \
  -F "base_price=35.00" \
  -F "subcategory_id=5" \
  -F "product_model_no=SKG-DLX-2026" \
  -F "how_to_apply=Apply to cheekbones for glow" \
  -F "benefits=Instant radiance, long-lasting shine" \
  -F "key_features=Water-resistant, all skin types" \
  -F "ingredients=Squalane, Vitamin E, Gold particles" \
  -F "thumbnail=https://res.cloudinary.com/.../skin-gloss-thumb.jpg" \
  -F "afterimage=https://res.cloudinary.com/.../skin-gloss-after.jpg" \
  -F "gallery=@/path/to/image1.jpg" \
  -F "gallery=@/path/to/image2.jpg" \
  -F "color_secondary_0=@/path/to/color_alt_image.jpg" \
  -F "color_0=@/path/to/color_image.jpg" \
  -F "variants=[{\"color\":\"sugar drip\",\"stock\":20,\"price\":25,\"discount_price\":50,\"variant_model_no\":\"SKG-DLX-2026-SD\"},{\"color\":\"golden hour\",\"stock\":20,\"price\":25,\"discount_price\":50,\"variant_model_no\":\"SKG-DLX-2026-GH\"}]"
```

---

### PUT Update Product
```
PUT /api/v1/product/:id
Content-Type: multipart/form-data
```

**Description:** Updates an existing product. All fields are optional - only provided fields will be updated.

**Form Fields (all optional):**
- `name` (text) - Updates product name and regenerates slug
- `description` (text)
- `base_price` (number)
- `subcategory_id` (number)
- `product_model_no` (text)
- `how_to_apply` (text)
- `benefits` (text)
- `key_features` (text)
- `ingredients` (text)
- `thumbnail` (text)
- `afterimage` (text)
- `gallery` (file) - Add new gallery images
- `media` (file) - Add new media images
- `video` (file) - Add new video
- `delete_media_ids` (JSON array) - IDs of media to delete: `[1, 2, 3]`
- `delete_variant_ids` (JSON array) - IDs of variants to delete: `[1, 2]`
- `variants` (JSON string) - Update/Add variants

**Variant JSON Schema:**
```json
[
  {
    "id": 1,                          // Include ID to UPDATE existing variant
    "color": "Updated Shade Name",
    "color_type": "warm",
    "stock": 30,
    "price": 1499,
    "discount_price": 1199,
    "variant_model_no": "SKU-001-UPD"
  },
  {
    "color": "New Shade",             // No ID = ADD new variant
    "stock": 20,
    "price": 1299
  }
]
```

**cURL Example - Update Product Info:**
```bash
curl -X PUT http://localhost:5000/api/v1/product/1 \
  -F "name=Updated Skin Gloss" \
  -F "base_price=45.00" \
  -F "description=Updated premium illuminator"
```

**cURL Example - Update with New Images & Variants:**
```bash
curl -X PUT http://localhost:5000/api/v1/product/1 \
  -F "name=Skin Gloss Pro" \
  -F "thumbnail=https://res.cloudinary.com/.../skin-gloss-pro-thumb.jpg" \
  -F "afterimage=https://res.cloudinary.com/.../skin-gloss-pro-after.jpg" \
  -F "gallery=@/path/to/new_image.jpg" \
  -F "delete_media_ids=[5, 6]" \
  -F "delete_variant_ids=[3]" \
  -F "color_0=@/path/to/updated_color.jpg" \
  -F "variants=[{\"id\":1,\"color\":\"Updated Sugar Drip\",\"stock\":50},{\"color\":\"New Shade\",\"stock\":25,\"price\":35}]"
```

**Response:**
```json
{
  "message": "Product updated successfully",
  "product": {
    "id": 1,
    "name": "Skin Gloss Pro",
    "slug": "skin-gloss-pro",
    "base_price": "45.00",
    "description": "Updated premium illuminator",
    "variants": [
      {
        "id": 1,
        "shade": "Updated Sugar Drip",
        "stock": 50
      },
      {
        "id": 5,
        "shade": "New Shade",
        "stock": 25,
        "price": "35.00"
      }
    ],
    "media": [...]
  }
}
```

---

### DELETE Product
```
DELETE /api/v1/product/:id
```

**cURL:**
```bash
curl -X DELETE http://localhost:5000/api/v1/product/1
```

**Response:**
```json
{
  "message": "Product \"Skin Gloss\" deleted successfully",
  "product_id": 1
}
```

---

## 4️⃣ CATEGORIES

### GET All Categories with Subcategories
```
GET /api/v1/categories
```

**cURL:**
```bash
curl -X GET http://localhost:5000/api/v1/categories
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Face",
    "subcategories": [
      {
        "id": 2,
        "name": "Highlighter"
      },
      {
        "id": 3,
        "name": "Foundation"
      }
    ]
  }
]
```

---

## 5️⃣ ORDERS

*Currently no endpoints implemented*

---

## 📌 TESTING IN POSTMAN

1. **Import the endpoints** above into Postman
2. **Set base URL** as `http://localhost:5000`
3. **Test each endpoint** in order:
   - ✅ Health Check
   - ✅ Categories (GET)
   - ✅ Create Product (POST)
   - ✅ Get All Products (GET)
   - ✅ Get Single Product (GET)
   - ✅ Delete Product (DELETE)

---

## 🖼️ IMAGE UPLOAD & DISPLAY (CLOUDINARY)

### ☁️ Cloud Storage:
All images and videos are now stored in **Cloudinary** cloud storage with automatic optimization and CDN delivery.

### Cloudinary URL Format:
```
https://res.cloudinary.com/dvagrhc2w/image/upload/v1234567890/just_gold/products/images/abc123.jpg
https://res.cloudinary.com/dvagrhc2w/video/upload/v1234567890/just_gold/products/videos/video123.mp4
```

### Folder Structure in Cloudinary:
```
just_gold/
├── products/
│   ├── images/     # Gallery images & media
│   ├── videos/     # Product videos
│   └── variants/   # Variant/shade images
```

### View Images:
All URLs returned by the API are direct Cloudinary URLs that can be used immediately in your frontend.

### Image Transformations:
You can request different sizes/formats by modifying the URL:
```
# Original
https://res.cloudinary.com/dvagrhc2w/image/upload/just_gold/products/images/abc123.jpg

# Thumbnail (200x200)
https://res.cloudinary.com/dvagrhc2w/image/upload/w_200,h_200,c_fill/just_gold/products/images/abc123.jpg

# Mobile optimized (800px width)
https://res.cloudinary.com/dvagrhc2w/image/upload/w_800,q_auto/just_gold/products/images/abc123.jpg

# WebP format
https://res.cloudinary.com/dvagrhc2w/image/upload/f_webp,q_auto/just_gold/products/images/abc123.jpg
```

---

## ⚙️ SERVER INFO

- **Port:** 5000
- **Database:** PostgreSQL (Just_gold)
- **Environment:** Check `.env` file for configuration

