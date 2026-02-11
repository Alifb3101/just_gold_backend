const pool = require("../config/db");
const { deleteMultipleFromCloudinary } = require("../config/cloudinary");

const DEFAULT_PAGE_LIMIT = 12;
const MAX_PAGE_LIMIT = 50;

/* =========================================================
   GET PRODUCTS (WITH PAGINATION)
========================================================= */
exports.getProducts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(
      Math.max(requestedLimit || DEFAULT_PAGE_LIMIT, 1),
      MAX_PAGE_LIMIT
    );
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.base_price,
        p.description,
        p.product_model_no,
        p.thumbnail,
        p.afterimage,
        p.created_at
      FROM products p
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({
      page,
      limit,
      count: result.rows.length,
      products: result.rows,
    });
  } catch (err) {
    next(err);
  }
};


/* =========================================================
   GET SINGLE PRODUCT (ID + SLUG VALIDATION)
========================================================= */
exports.getProductDetail = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const requestedSlug = req.params.slug;

    const productResult = await pool.query(
      `
      SELECT 
        id,
        name,
        slug,
        description,
        base_price,
        category_id,
        product_model_no,
        how_to_apply,
        benefits,
        key_features,
        ingredients,
        thumbnail,
        afterimage,
        created_at
      FROM products
      WHERE id = $1
      `,
      [productId]
    );

    if (!productResult.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult.rows[0];

    const variantsResult = await pool.query(
      `
      SELECT 
        id,
        shade,
        color_type,
        stock,
        main_image,
        secondary_image,
        price,
        discount_price,
        variant_model_no
      FROM product_variants
      WHERE product_id = $1
      ORDER BY id ASC
      `,
      [product.id]
    );

    const mediaResult = await pool.query(
      `
      SELECT id, image_url, media_type
      FROM product_images
      WHERE product_id = $1
      ORDER BY id ASC
      `,
      [product.id]
    );

    const normalizedRequestedSlug = (requestedSlug || "").trim().toLowerCase();
    const normalizedProductSlug = (product.slug || "").trim().toLowerCase();
    const canonicalUrl = `/api/v1/product/${product.id}-${product.slug}`;
    const requestedPath = `${req.baseUrl}${req.path}`;

    if (requestedSlug && normalizedRequestedSlug !== normalizedProductSlug) {
      if (requestedPath === canonicalUrl) {
        // Prevent redirect loops if the request already targets canonical path
        return res.json({
          ...product,
          variants: variantsResult.rows,
          media: mediaResult.rows,
        });
      }
      return res.redirect(301, canonicalUrl);
    }

    res.json({
      ...product,
      variants: variantsResult.rows,
      media: mediaResult.rows,
    });
  } catch (err) {
    next(err);
  }
};



/* =========================================================
   CREATE PRODUCT (FULL PROFESSIONAL VERSION)
========================================================= */
exports.createProduct = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      name,
      description,
      base_price,
      subcategory_id,
      product_model_no,
      how_to_apply,
      benefits,
      key_features,
      ingredients,
      thumbnail,
      afterimage,
      variants
    } = req.body;

    /* -------- Basic Validation -------- */

    if (!name || !base_price || !subcategory_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");

    /* -------- Insert Product -------- */

    const productResult = await client.query(
      `
      INSERT INTO products 
      (name, slug, description, base_price, category_id, product_model_no, how_to_apply, benefits, key_features, ingredients, thumbnail, afterimage)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id
      `,
      [
        name,
        slug,
        description,
        base_price,
        subcategory_id,
        product_model_no,
        how_to_apply,
        benefits,
        key_features,
        ingredients,
        thumbnail || null,
        afterimage || null,
      ]
    );

    const productId = productResult.rows[0].id;

    /* =====================================================
       ORGANIZE FILES (Cloudinary URLs)
    ===================================================== */

    const galleryFiles = [
      ...(req.files?.gallery || []),
      ...(req.files?.media || [])
    ];
    const videoFiles = req.files?.video || [];

    /* -------- Save Gallery (Cloudinary URLs) -------- */

    for (let file of galleryFiles) {
      await client.query(
        `
        INSERT INTO product_images
        (product_id, image_url, media_type)
        VALUES ($1,$2,$3)
        `,
        [productId, file.path || file.cloudinary?.secure_url, "image"]
      );
    }

    /* -------- Save Product Video (Cloudinary URL) -------- */

    if (videoFiles.length > 0) {
      await client.query(
        `
        INSERT INTO product_images
        (product_id, image_url, media_type)
        VALUES ($1,$2,$3)
        `,
        [productId, videoFiles[0].path || videoFiles[0].cloudinary?.secure_url, "video"]
      );
    }

    /* =====================================================
       SAVE VARIANTS
    ===================================================== */

    const parsedVariants = JSON.parse(variants || "[]");

    if (!parsedVariants.length) {
      throw new Error("At least one variant is required");
    }

    for (let i = 0; i < parsedVariants.length; i++) {

      const variant = parsedVariants[i];

      // Check both naming conventions: color_X and variant_main_image_X
      const colorKey = `color_${i}`;
      const variantImageKey = `variant_main_image_${i}`;
      const secondaryColorKey = `color_secondary_${i}`;
      const secondaryVariantImageKey = `variant_secondary_image_${i}`;
      
      const colorFile = req.files?.[colorKey]?.[0] || req.files?.[variantImageKey]?.[0] || null;
      const secondaryColorFile =
        req.files?.[secondaryColorKey]?.[0] ||
        req.files?.[secondaryVariantImageKey]?.[0] ||
        null;

      // Get Cloudinary URLs instead of local paths
      const mainImagePath = colorFile
        ? (colorFile.path || colorFile.cloudinary?.secure_url)
        : null;

      const secondaryImagePath = secondaryColorFile
        ? (secondaryColorFile.path || secondaryColorFile.cloudinary?.secure_url)
        : null;

      const colorType = variant.color_type || variant.colorType || null;

      await client.query(
        `
        INSERT INTO product_variants
        (product_id, shade, color_type, stock, main_image, secondary_image, price, discount_price, variant_model_no)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          productId,
          variant.color,
          colorType,
          variant.stock || 0,
          mainImagePath,
          secondaryImagePath,
          variant.price || null,
          variant.discount_price || null,
          variant.variant_model_no || null
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Product Created Successfully",
      product_id: productId
    });

  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ message: "Product slug already exists" });
    }
    console.error("Create Product Error:", err);
    res.status(500).json({
      message: err.message || "Error creating product"
    });
  } finally {
    client.release();
  }
};


/* =========================================================
   UPDATE PRODUCT (FULL PROFESSIONAL VERSION)
   - PUT method for complete resource update
   - Handles product info, variants, and media updates
   - Deletes old media from Cloudinary when replaced
========================================================= */
exports.updateProduct = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    /* -------- Validate Product Exists -------- */

    const existingProduct = await client.query(
      `SELECT * FROM products WHERE id = $1`,
      [id]
    );

    if (!existingProduct.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      name,
      description,
      base_price,
      subcategory_id,
      product_model_no,
      how_to_apply,
      benefits,
      key_features,
      ingredients,
      thumbnail,
      afterimage,
      variants,
      delete_media_ids,
      delete_variant_ids,
    } = req.body;

    /* -------- Update Product Basic Info -------- */

    const slug = name
      ? name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "")
      : existingProduct.rows[0].slug;

    await client.query(
      `
      UPDATE products SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        base_price = COALESCE($4, base_price),
        category_id = COALESCE($5, category_id),
        product_model_no = COALESCE($6, product_model_no),
        how_to_apply = COALESCE($7, how_to_apply),
        benefits = COALESCE($8, benefits),
        key_features = COALESCE($9, key_features),
        ingredients = COALESCE($10, ingredients),
        thumbnail = COALESCE($11, thumbnail),
        afterimage = COALESCE($12, afterimage)
      WHERE id = $13
      `,
      [
        name || null,
        name ? slug : null,
        description || null,
        base_price || null,
        subcategory_id || null,
        product_model_no || null,
        how_to_apply || null,
        benefits || null,
        key_features || null,
        ingredients || null,
        thumbnail || null,
        afterimage || null,
        id,
      ]
    );

    /* =====================================================
       DELETE SPECIFIED MEDIA (if requested)
    ===================================================== */

    const parsedDeleteMediaIds = delete_media_ids
      ? JSON.parse(delete_media_ids)
      : [];

    if (parsedDeleteMediaIds.length > 0) {
      // Get URLs for Cloudinary deletion
      const mediaToDelete = await client.query(
        `SELECT image_url FROM product_images WHERE id = ANY($1) AND product_id = $2`,
        [parsedDeleteMediaIds, id]
      );

      const urlsToDelete = mediaToDelete.rows.map((row) => row.image_url).filter(Boolean);

      // Delete from database
      await client.query(
        `DELETE FROM product_images WHERE id = ANY($1) AND product_id = $2`,
        [parsedDeleteMediaIds, id]
      );

      // Delete from Cloudinary
      if (urlsToDelete.length > 0) {
        await deleteMultipleFromCloudinary(urlsToDelete);
      }
    }

    /* =====================================================
       ADD NEW MEDIA (Gallery/Video)
    ===================================================== */

    const galleryFiles = [
      ...(req.files?.gallery || []),
      ...(req.files?.media || []),
    ];
    const videoFiles = req.files?.video || [];

    // Save new gallery images
    for (let file of galleryFiles) {
      await client.query(
        `
        INSERT INTO product_images
        (product_id, image_url, media_type)
        VALUES ($1, $2, $3)
        `,
        [id, file.path || file.cloudinary?.secure_url, "image"]
      );
    }

    // Save new video
    if (videoFiles.length > 0) {
      await client.query(
        `
        INSERT INTO product_images
        (product_id, image_url, media_type)
        VALUES ($1, $2, $3)
        `,
        [id, videoFiles[0].path || videoFiles[0].cloudinary?.secure_url, "video"]
      );
    }

    /* =====================================================
       DELETE SPECIFIED VARIANTS (if requested)
    ===================================================== */

    const parsedDeleteVariantIds = delete_variant_ids
      ? JSON.parse(delete_variant_ids)
      : [];

    if (parsedDeleteVariantIds.length > 0) {
      // Get variant images for Cloudinary deletion
      const variantsToDelete = await client.query(
        `SELECT main_image, secondary_image FROM product_variants WHERE id = ANY($1) AND product_id = $2`,
        [parsedDeleteVariantIds, id]
      );

      const variantUrlsToDelete = variantsToDelete.rows
        .map((row) => [row.main_image, row.secondary_image])
        .flat()
        .filter(Boolean);

      // Delete from database
      await client.query(
        `DELETE FROM product_variants WHERE id = ANY($1) AND product_id = $2`,
        [parsedDeleteVariantIds, id]
      );

      // Delete from Cloudinary
      if (variantUrlsToDelete.length > 0) {
        await deleteMultipleFromCloudinary(variantUrlsToDelete);
      }
    }

    /* =====================================================
       UPDATE/ADD VARIANTS
    ===================================================== */

    const parsedVariants = variants ? JSON.parse(variants) : [];

    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];

      // Check for variant images in request
      const colorKey = `color_${i}`;
      const variantImageKey = `variant_main_image_${i}`;
      const secondaryColorKey = `color_secondary_${i}`;
      const secondaryVariantImageKey = `variant_secondary_image_${i}`;

      const colorFile =
        req.files?.[colorKey]?.[0] || req.files?.[variantImageKey]?.[0] || null;
      const secondaryColorFile =
        req.files?.[secondaryColorKey]?.[0] ||
        req.files?.[secondaryVariantImageKey]?.[0] ||
        null;

      const mainImagePath = colorFile
        ? colorFile.path || colorFile.cloudinary?.secure_url
        : null;

      const secondaryImagePath = secondaryColorFile
        ? secondaryColorFile.path || secondaryColorFile.cloudinary?.secure_url
        : null;

      const colorType = variant.color_type || variant.colorType || null;

      if (variant.id) {
        /* -------- UPDATE EXISTING VARIANT -------- */

        // Get old images for potential Cloudinary deletion
        const oldVariant = await client.query(
          `SELECT main_image, secondary_image FROM product_variants WHERE id = $1 AND product_id = $2`,
          [variant.id, id]
        );

        if (oldVariant.rows.length > 0) {
          const oldUrls = [];

          // If new main image uploaded, delete old one
          if (mainImagePath && oldVariant.rows[0].main_image) {
            oldUrls.push(oldVariant.rows[0].main_image);
          }

          // If new secondary image uploaded, delete old one
          if (secondaryImagePath && oldVariant.rows[0].secondary_image) {
            oldUrls.push(oldVariant.rows[0].secondary_image);
          }

          if (oldUrls.length > 0) {
            await deleteMultipleFromCloudinary(oldUrls);
          }

          // Update variant
          await client.query(
            `
            UPDATE product_variants SET
              shade = COALESCE($1, shade),
              color_type = COALESCE($2, color_type),
              stock = COALESCE($3, stock),
              main_image = COALESCE($4, main_image),
              secondary_image = COALESCE($5, secondary_image),
              price = COALESCE($6, price),
              discount_price = COALESCE($7, discount_price),
              variant_model_no = COALESCE($8, variant_model_no)
            WHERE id = $9 AND product_id = $10
            `,
            [
              variant.color || null,
              colorType,
              variant.stock !== undefined ? variant.stock : null,
              mainImagePath,
              secondaryImagePath,
              variant.price || null,
              variant.discount_price || null,
              variant.variant_model_no || null,
              variant.id,
              id,
            ]
          );
        }
      } else {
        /* -------- ADD NEW VARIANT -------- */

        await client.query(
          `
          INSERT INTO product_variants
          (product_id, shade, color_type, stock, main_image, secondary_image, price, discount_price, variant_model_no)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            id,
            variant.color,
            colorType,
            variant.stock || 0,
            mainImagePath,
            secondaryImagePath,
            variant.price || null,
            variant.discount_price || null,
            variant.variant_model_no || null,
          ]
        );
      }
    }

    await client.query("COMMIT");

    /* -------- Fetch Updated Product -------- */

    const updatedProduct = await pool.query(
      `SELECT * FROM products WHERE id = $1`,
      [id]
    );

    const updatedVariants = await pool.query(
      `SELECT * FROM product_variants WHERE product_id = $1`,
      [id]
    );

    const updatedMedia = await pool.query(
      `SELECT * FROM product_images WHERE product_id = $1`,
      [id]
    );

    res.json({
      message: "Product updated successfully",
      product: {
        ...updatedProduct.rows[0],
        variants: updatedVariants.rows,
        media: updatedMedia.rows,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update Product Error:", err);
    if (err.code === "23505") {
      return res.status(409).json({
        message: "Product slug already exists",
      });
    }
    res.status(500).json({
      message: err.message || "Error updating product",
    });
  } finally {
    client.release();
  }
};


/* =========================================================
   DELETE PRODUCT (CASCADE DELETE WITH SAFETY)
========================================================= */
exports.deleteProduct = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    /* -------- Validate Product Exists -------- */

    const productCheck = await client.query(
      `SELECT id, name FROM products WHERE id = $1`,
      [id]
    );

    if (!productCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Product not found" });
    }

    const productName = productCheck.rows[0].name;

    /* -------- Get All Image/Video URLs for Cloudinary Deletion -------- */

    const mediaResult = await client.query(
      `SELECT image_url FROM product_images WHERE product_id = $1`,
      [id]
    );

    const variantResult = await client.query(
      `SELECT main_image, secondary_image FROM product_variants WHERE product_id = $1`,
      [id]
    );

    const allMediaUrls = [
      ...mediaResult.rows.map(row => row.image_url).filter(Boolean),
      ...variantResult.rows
        .map(row => [row.main_image, row.secondary_image])
        .flat()
        .filter(Boolean)
    ];

    /* -------- Delete Variants (Cascade) -------- */

    await client.query(
      `DELETE FROM product_variants WHERE product_id = $1`,
      [id]
    );
/* -------- Delete Files from Cloudinary -------- */

    if (allMediaUrls.length > 0) {
      await deleteMultipleFromCloudinary(allMediaUrls);
    }

    
    /* -------- Delete Images/Media (Cascade) -------- */

    await client.query(
      `DELETE FROM product_images WHERE product_id = $1`,
      [id]
    );

    /* -------- Delete Product -------- */

    await client.query(
      `DELETE FROM products WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      message: `Product "${productName}" deleted successfully`,
      product_id: id
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete Product Error:", err);
    next(err);
  } finally {
    client.release();
  }
};
