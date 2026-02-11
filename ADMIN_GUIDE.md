# 📖 ADMIN GUIDE - How to Upload Products

## ⚠️ IMPORTANT: Nothing Changed for You!

You send product data **exactly the same way** as before. The only difference is:
- ❌ Before: Files saved in `/uploads` folder on server
- ✅ Now: Files automatically saved to Cloudinary (cloud storage)

**You don't need to do anything different!** Just follow the same process.

---

## 🚀 How to Create a Product (Step by Step)

### **Method 1: Using Postman** (Recommended)

#### Step 1: Set Up Request
```
POST http://localhost:5000/api/v1/products
```

#### Step 2: Select "Body" → "form-data"

#### Step 3: Add These Fields:

| KEY | TYPE | VALUE (Example) |
|-----|------|-----------------|
| `name` | Text | "Luxury Lipstick" |
| `description` | Text | "Premium matte finish lipstick" |
| `base_price` | Text | 1299 |
| `subcategory_id` | Text | 1 |
| `product_model_no` | Text | "LIP-2026-001" |
| `how_to_apply` | Text | "Apply directly to lips" |
| `benefits` | Text | "Long-lasting, moisturizing" |
| `key_features` | Text | "Matte finish, 12-hour wear" |
| `ingredients` | Text | "Shea butter, Vitamin E" |
| `variants` | Text | `[{"color":"Ruby Red","color_type":"warm","stock":100,"price":1299,"discount_price":999,"variant_model_no":"LIP-001-RR"}]` |

#### Step 4: Add Image/Video Files:

| KEY | TYPE | FILE |
|-----|------|------|
| `gallery` | File | Select image 1 |
| `gallery` | File | Select image 2 |
| `gallery` | File | Select image 3 |
| `media` | File | Select image 4 |
| `video` | File | Select video file |
| `color_0` | File | Select variant image for color 0 |
| `color_1` | File | Select variant image for color 1 (if you have 2nd variant) |

#### Step 5: Click "Send"

**Response:**
```json
{
  "message": "Product Created Successfully",
  "product_id": 1
}
```

✅ **Done!** Your images/videos are now on Cloudinary (not in uploads folder).

---

## 📝 Important Notes for Variants

The `variants` field is **JSON format**. Here's the structure:

### Single Variant:
```json
[
  {
    "color": "Ruby Red",
    "color_type": "warm",
    "stock": 100,
    "price": 1299,
    "discount_price": 999,
    "variant_model_no": "LIP-001-RR"
  }
]
```

### Multiple Variants:
```json
[
  {
    "color": "Ruby Red",
    "color_type": "warm",
    "stock": 100,
    "price": 1299,
    "discount_price": 999,
    "variant_model_no": "LIP-001-RR"
  },
  {
    "color": "Pink Blush",
    "color_type": "cool",
    "stock": 150,
    "price": 1299,
    "discount_price": 999,
    "variant_model_no": "LIP-001-PB"
  },
  {
    "color": "Nude Beige",
    "stock": 200,
    "price": 1299,
    "discount_price": 999,
    "variant_model_no": "LIP-001-NB"
  }
]
```

**Matching variant images:**
- Variant 0 (Ruby Red) → `color_0` file (primary) + optional `color_secondary_0` (secondary)
- Variant 1 (Pink Blush) → `color_1` (primary) + optional `color_secondary_1`
- Variant 2 (Nude Beige) → `color_2` (primary) + optional `color_secondary_2`

If you prefer alternative names, you can also use `variant_main_image_0` and `variant_secondary_image_0`, etc.

---

## 🖼️ File Field Names (Copy-Paste Ready)

### For Product Gallery/Media:
- `gallery` - Main product images (up to 6)
- `media` - Additional images (up to 6)
- `video` - Product video (1 video max)

### For Variant Images:
- `color_0` - Primary image for Variant 0
- `color_secondary_0` - Secondary image for Variant 0 (optional)
- `color_1`, `color_secondary_1` - Repeat pattern per variant index (up to 6)

**Alternative names (also work):**
- `variant_main_image_0`, `variant_secondary_image_0`
- `variant_main_image_1`, `variant_secondary_image_1`
- etc.

---

## 🎯 Quick Checklist Before Clicking "Send"

- [ ] Set request type to **POST**
- [ ] URL is correct: `http://localhost:5000/api/v1/products`
- [ ] Body type is **form-data** (not JSON!)
- [ ] All required fields filled: `name`, `base_price`, `subcategory_id`, `variants`
- [ ] `variants` is valid JSON (use JSON validator if unsure)
- [ ] Images selected as **File** type (not Text!)
- [ ] Variant images match variant order (color_0 for first variant, etc.)

---

## ❌ Common Mistakes

### ❌ Mistake 1: Sending variants as text instead of JSON
**Wrong:**
```
variants: Ruby Red, Pink Blush
```

**Correct:**
```
variants: [{"color":"Ruby Red","stock":100,"price":1299}]
```

### ❌ Mistake 2: Selecting "Text" instead of "File" for images
In Postman, make sure dropdown says **"File"** not "Text"

### ❌ Mistake 3: Wrong variant image mapping
If you have 3 variants, you need:
- `color_0` for variant 0
- `color_1` for variant 1
- `color_2` for variant 2

Don't skip numbers!

### ❌ Mistake 4: Trying to send file paths as text
**Wrong:**
```
gallery: "C:/Users/Admin/Desktop/image.jpg"
```

**Correct:**
Select the actual file using the "File" option in Postman

---

## 🔍 How to Check if Upload Worked

### Method 1: Check Database
Query your database:
```sql
SELECT * FROM products ORDER BY id DESC LIMIT 1;
SELECT * FROM product_images WHERE product_id = 1;
SELECT * FROM product_variants WHERE product_id = 1;
```

### Method 2: Check Cloudinary Dashboard
1. Go to: https://cloudinary.com/console
2. Login with credentials
3. Go to "Media Library"
4. Look for folder: `just_gold/products/`
5. You should see your uploaded images there

### Method 3: Get Product via API
```
GET http://localhost:5000/api/v1/products
```

Response will show Cloudinary URLs:
```json
{
  "id": 1,
  "name": "Luxury Lipstick",
  "variants": [
    {
      "main_image": "https://res.cloudinary.com/dvagrhc2w/image/upload/v1234567890/just_gold/products/variants/abc123.jpg"
    }
  ],
  "media": [
    {
      "image_url": "https://res.cloudinary.com/dvagrhc2w/image/upload/v1234567890/just_gold/products/images/def456.jpg"
    }
  ]
}
```

**✅ If URLs start with `https://res.cloudinary.com/` = SUCCESS!**

---

## 🛠️ Complete Example (Copy This!)

### Postman Setup:

**URL:** `POST http://localhost:5000/api/v1/products`  
**Body Type:** `form-data`

**Fields:**
```
name: Radiant Glow Serum
description: Brightening facial serum with vitamin C
base_price: 2499
subcategory_id: 2
product_model_no: SER-2026-001
how_to_apply: Apply 2-3 drops on clean face
benefits: Brightens skin, reduces dark spots
key_features: Vitamin C enriched, lightweight formula
ingredients: Vitamin C, Hyaluronic Acid, Niacinamide
variants: [{"color":"30ml","stock":50,"price":2499,"discount_price":1999,"variant_model_no":"SER-001-30"},{"color":"50ml","stock":30,"price":3499,"discount_price":2999,"variant_model_no":"SER-001-50"}]

FILES:
gallery: [Select image file 1]
gallery: [Select image file 2]
gallery: [Select image file 3]
video: [Select video file]
color_0: [Select image for 30ml variant]
color_1: [Select image for 50ml variant]
```

---

## 📱 Method 2: Using Thunder Client (VS Code Extension)

Same process as Postman:
1. Install Thunder Client in VS Code
2. Create New Request
3. Set to POST
4. Enter URL
5. Go to "Body" → "Form"
6. Add fields and files
7. Click "Send"

---

## 🆘 Troubleshooting

### "Missing required fields"
Make sure you have: `name`, `base_price`, `subcategory_id`, `variants`

### "File upload error"
- Check file size (max 10MB for images, 100MB for videos)
- Make sure field type is "File" not "Text"
- Supported formats: JPG, PNG, WebP, GIF (images) | MP4, MOV, AVI (videos)

### "Invalid credentials" or "Cloudinary error"
Contact developer - backend configuration issue

### "Product created but no images"
- Check if you selected files correctly
- Make sure files are under 10MB
- Try uploading fewer files at once

---

## ✅ Success Indicators

You did it right if:
1. ✅ API returns `"message": "Product Created Successfully"`
2. ✅ You get a `product_id` in response
3. ✅ Images appear in Cloudinary dashboard
4. ✅ GET request shows URLs starting with `https://res.cloudinary.com/`
5. ✅ Image URLs open in browser and show your image

---

## 🎓 Training Example

### Create Your First Test Product:

**Product:** Test Lipstick  
**Price:** 100  
**Category ID:** 1 (make sure this category exists!)  
**Variant:** `[{"color":"Test Red","stock":10,"price":100}]`  
**Files:** Any 1 image as `gallery`, any 1 image as `color_0`

If this works, you understand the system! 🎉

---

## 📞 Need Help?

1. **Can't find category IDs?**
   ```
   GET http://localhost:5000/api/v1/categories
   ```

2. **Want to see all products?**
   ```
   GET http://localhost:5000/api/v1/products
   ```

3. **Want to delete a test product?**
   ```
   DELETE http://localhost:5000/api/v1/products/{product_id}
   ```

---

## 🎯 TL;DR (Too Long; Didn't Read)

1. Open Postman
2. POST to `http://localhost:5000/api/v1/products`
3. Select "form-data" in Body
4. Add text fields: name, base_price, subcategory_id, variants (as JSON)
5. Add file fields: gallery, video, color_0, color_1, etc.
6. Click Send
7. Check response for success message
8. Images are now on Cloudinary (not in uploads folder)

**You're done! Nothing complicated. Same process as before.** 🎉

---

**Last Updated:** February 9, 2026  
**Backend Version:** 1.0.0 with Cloudinary
