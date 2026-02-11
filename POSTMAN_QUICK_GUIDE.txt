╔════════════════════════════════════════════════════════════════╗
║                   QUICK POSTMAN SETUP                          ║
║            (For Admin - Simple Copy-Paste Guide)               ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: SET UP REQUEST IN POSTMAN                             │
└─────────────────────────────────────────────────────────────────┘

URL: http://localhost:5000/api/v1/products
Method: POST
Body Type: form-data  ← IMPORTANT! Select this dropdown!


┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: ADD TEXT FIELDS (Copy these exact names)              │
└─────────────────────────────────────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━┳━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ KEY (Field Name)  ┃ TYPE ┃ VALUE (Your Data)               ┃
┣━━━━━━━━━━━━━━━━━━━╋━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ name              ┃ Text ┃ Luxury Lipstick                 ┃
┃ description       ┃ Text ┃ Premium matte lipstick          ┃
┃ base_price        ┃ Text ┃ 1299                            ┃
┃ subcategory_id    ┃ Text ┃ 1                               ┃
┃ product_model_no  ┃ Text ┃ LIP-2026-001                    ┃
┃ how_to_apply      ┃ Text ┃ Apply to lips                   ┃
┃ benefits          ┃ Text ┃ Long-lasting                    ┃
┃ key_features      ┃ Text ┃ Matte finish                    ┃
┃ ingredients       ┃ Text ┃ Shea butter                     ┃
┃ variants          ┃ Text ┃ (See format below ↓)            ┃
┗━━━━━━━━━━━━━━━━━━━┻━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┌─────────────────────────────────────────────────────────────────┐
│  VARIANTS FORMAT (Copy & Modify)                               │
└─────────────────────────────────────────────────────────────────┘

For 1 variant, copy this:
[{"color":"Ruby Red","color_type":"warm","stock":100,"price":1299,"discount_price":999,"variant_model_no":"LIP-001-RR"}]

For 2 variants, copy this:
[{"color":"Ruby Red","color_type":"warm","stock":100,"price":1299,"discount_price":999,"variant_model_no":"LIP-001-RR"},{"color":"Pink","color_type":"cool","stock":150,"price":1299,"discount_price":999,"variant_model_no":"LIP-001-PK"}]

For 3 variants, copy this:
[{"color":"Ruby Red","color_type":"neutral","stock":100,"price":1299},{"color":"Pink","color_type":"cool","stock":150,"price":1299},{"color":"Nude","stock":200,"price":1299}]

`color_type` is optional but recommended to describe undertones (warm/cool/neutral/etc.).


┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: ADD FILE FIELDS                                       │
└─────────────────────────────────────────────────────────────────┘

⚠️ IMPORTANT: Select "File" from dropdown, NOT "Text"!

┏━━━━━━━━━━━━━━━━━━━┳━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ KEY (Field Name)  ┃ TYPE ┃ ACTION                          ┃
┣━━━━━━━━━━━━━━━━━━━╋━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ gallery           ┃ File ┃ Click "Select Files" → Pick 1st ┃
┃ gallery           ┃ File ┃ Click "Select Files" → Pick 2nd ┃
┃ gallery           ┃ File ┃ Click "Select Files" → Pick 3rd ┃
┃ media             ┃ File ┃ Click "Select Files" → Pick 4th ┃
┃ video             ┃ File ┃ Click "Select Files" → Pick vid ┃
┃ color_0           ┃ File ┃ Primary image for Variant 0     ┃
┃ color_secondary_0 ┃ File ┃ Secondary image for Variant 0   ┃
┃ color_1           ┃ File ┃ Primary image for Variant 1     ┃
┃ color_secondary_1 ┃ File ┃ Secondary image for Variant 1   ┃
┃ color_2           ┃ File ┃ Primary image for Variant 2     ┃
┃ color_secondary_2 ┃ File ┃ Secondary image for Variant 2   ┃
┗━━━━━━━━━━━━━━━━━━━┻━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

NOTE: 
• gallery/media = Product photos (multiple allowed)
• video = Product video (only 1)
• color_0/color_secondary_0 = Variant 0 primary & optional secondary
• Repeat pattern for additional variants (color_1, color_secondary_1, etc.)


┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: CLICK "SEND" BUTTON                                   │
└─────────────────────────────────────────────────────────────────┘

✅ Success Response:
{
  "message": "Product Created Successfully",
  "product_id": 1
}

❌ Error Response:
{
  "message": "Missing required fields"
}
→ Check you added: name, base_price, subcategory_id, variants


┌─────────────────────────────────────────────────────────────────┐
│  VISUAL GUIDE - POSTMAN SCREENSHOT DESCRIPTION                 │
└─────────────────────────────────────────────────────────────────┘

In Postman window, you should see:

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ POST ▼  http://localhost:5000/api/v1/products         [Send]┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Params   Authorization   Headers   Body ✓   ...              ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ( ) none  ( ) form-data ✓  ( ) x-www-form-urlencoded         ┃
┃ ( ) raw   ( ) binary   ( ) GraphQL                           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ KEY              ▼  VALUE                        DESCRIPTION ┃
┃ name             Text   Luxury Lipstick                      ┃
┃ base_price       Text   1299                                 ┃  
┃ subcategory_id   Text   1                                    ┃
┃ variants         Text   [{"color":"Red","stock":100...}]     ┃
┃ gallery          File   image1.jpg                           ┃
┃ color_0          File   variant1.jpg                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┌─────────────────────────────────────────────────────────────────┐
│  COMMON MISTAKES TO AVOID                                      │
└─────────────────────────────────────────────────────────────────┘

❌ DON'T: Select "Text" for images
✅ DO: Select "File" from dropdown for all images/videos

❌ DON'T: Write file paths like "C:/Desktop/image.jpg"
✅ DO: Use "Select Files" button to pick actual files

❌ DON'T: Send variants as: "Red, Blue, Green"
✅ DO: Use JSON format: [{"color":"Red","stock":100,"price":999}]

❌ DON'T: Use body type "raw" or "JSON"
✅ DO: Use body type "form-data"

❌ DON'T: Worry about /uploads folder
✅ DO: Just send files - backend handles Cloudinary automatically


┌─────────────────────────────────────────────────────────────────┐
│  WHERE DO FILES GO?                                            │
└─────────────────────────────────────────────────────────────────┘

🌩️ Files are automatically uploaded to CLOUDINARY (cloud storage)

Old way: Files → Server /uploads folder
New way: Files → Cloudinary cloud → Returns URL

You don't need to do anything different!
Just send files like before. Backend handles everything.


┌─────────────────────────────────────────────────────────────────┐
│  HOW TO CHECK IF IT WORKED                                     │
└─────────────────────────────────────────────────────────────────┘

Method 1: Check API Response
→ If you see "Product Created Successfully" = ✅ SUCCESS

Method 2: Get Product
→ GET http://localhost:5000/api/v1/products
→ Look for URLs starting with: https://res.cloudinary.com/
→ If you see Cloudinary URLs = ✅ SUCCESS

Method 3: Check Cloudinary Dashboard
→ Go to: https://cloudinary.com/console
→ Login and check Media Library
→ Look for just_gold/products/ folder
→ If you see your images there = ✅ SUCCESS


┌─────────────────────────────────────────────────────────────────┐
│  TROUBLESHOOTING                                               │
└─────────────────────────────────────────────────────────────────┘

Problem: "Missing required fields"
Solution: Add name, base_price, subcategory_id, variants

Problem: "File too large"
Solution: Image must be under 10MB, video under 100MB

Problem: "Invalid variant format"
Solution: Check variants JSON - use online JSON validator

Problem: Product created but no images showing
Solution: 
  1. Check you selected "File" not "Text"
  2. Check file size is under limits
  3. Check file format (JPG, PNG, WebP only)


┌─────────────────────────────────────────────────────────────────┐
│  QUICK TEST - DO THIS FIRST                                    │
└─────────────────────────────────────────────────────────────────┘

Create a simple test product:

name: Test Product
base_price: 100
subcategory_id: 1
variants: [{"color":"Test","stock":10,"price":100}]
gallery: (any image file)
color_0: (any image file)

Click Send.

If this works → You understand the system! 🎉
If this fails → Check the troubleshooting section above.


┌─────────────────────────────────────────────────────────────────┐
│  NEED CATEGORY IDs?                                            │
└─────────────────────────────────────────────────────────────────┘

GET http://localhost:5000/api/v1/categories

This will show all categories with their IDs.
Use the subcategory_id in your product creation.


╔════════════════════════════════════════════════════════════════╗
║  REMEMBER: Nothing changed for you!                            ║
║  Send files the same way. Backend handles Cloudinary.          ║
║  You don't see /uploads anymore because files are in cloud.    ║
╚════════════════════════════════════════════════════════════════╝

Questions? Check ADMIN_GUIDE.md for detailed explanations.
