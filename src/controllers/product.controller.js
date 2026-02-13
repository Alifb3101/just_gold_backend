const pool = require("../config/db");
const { deleteMultipleFromCloudinary } = require("../config/cloudinary");
const { getMediaUrl } = require("../services/media.service");
const {
  buildProductsQuery,
  buildCacheKey,
  normalizeFilters,
} = require("../services/product.service");
const { getRedisClient } = require("../config/redis");

const COLOR_PANEL_TYPES = ["hex", "gradient", "image"];

const resolveMediaUrl = (key, url) => {
  if (key) return getMediaUrl(key);
  return url || null;
};

const isValidHexColor = (value) => {
  if (typeof value !== "string") return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(
    value.trim()
  );
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

const isValidGradient = (value) => {
  if (typeof value !== "string") return false;
  return /(linear|radial|conic|repeating-linear|repeating-radial)-gradient\s*\(.+\)/i.test(
    value.trim()
  );
};

const validateColorPanel = (rawType, rawValue, { requireValue, uploadedUrl }) => {
  const hasType = rawType !== undefined && rawType !== null;
  const hasValue = rawValue !== undefined && rawValue !== null;
  const hasUploadedUrl = !!uploadedUrl;

  if (requireValue && hasUploadedUrl && !hasType) {
    return {
      error: "color_panel_type is required when uploading color panel image",
    };
  }

  if (!requireValue && !hasType && !hasValue && !hasUploadedUrl) {
    return { shouldUpdate: false, colorPanelType: null, colorPanelValue: null };
  }

  if (!requireValue && (hasValue || hasUploadedUrl) && !hasType) {
    return {
      error: "color_panel_type is required when updating color_panel_value",
    };
  }

  if (!requireValue && hasType && !(hasValue || hasUploadedUrl)) {
    return {
      error: "color_panel_value is required when updating color_panel_type",
    };
  }

  const colorPanelType = (rawType || "hex").toString().trim().toLowerCase();
  const colorPanelValue = (rawValue || "").toString().trim();
  const finalValue = uploadedUrl || colorPanelValue;

  if (hasUploadedUrl && colorPanelType !== "image") {
    return {
      error: "color_panel_type must be image when uploading color panel image",
    };
  }

  if (!COLOR_PANEL_TYPES.includes(colorPanelType)) {
    return {
      error: "color_panel_type must be one of: hex, gradient, image",
    };
  }

  if (!finalValue) {
    return {
      error: "color_panel_value is required for color panel configuration",
    };
  }

  if (
    (colorPanelType === "hex" && !isValidHexColor(finalValue)) ||
    (colorPanelType === "image" && !hasUploadedUrl && !isValidHttpUrl(finalValue)) ||
    (colorPanelType === "gradient" && !isValidGradient(finalValue))
  ) {
    return {
      error: `color_panel_value is not valid for type ${colorPanelType}`,
    };
  }

  return { shouldUpdate: true, colorPanelType, colorPanelValue: finalValue };
};

/* =========================================================
   GET PRODUCTS (WITH PAGINATION)
========================================================= */
exports.getProducts = async (req, res, next) => {
  try {
    const filters = normalizeFilters({
      categoryId: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      color: req.query.color,
      size: req.query.size,
      sort: req.query.sort,
      cursor: req.query.cursor,
    });

    // Temporary debug logging to diagnose empty result issues
    try {
      const countResult = await pool.query("SELECT COUNT(*) AS cnt FROM products");
      const sampleResult = await pool.query(
        "SELECT id, name, is_active FROM products ORDER BY id ASC LIMIT 10"
      );
      console.log("[DEBUG products] total products:", countResult.rows[0]?.cnt);
      console.log("[DEBUG products] sample rows:", sampleResult.rows);
      console.log("[DEBUG products] filters:", filters);
      console.log(
        "[DEBUG products] db target:",
        process.env.DATABASE_URL || `${process.env.PGUSER || "postgres"}@${process.env.PGHOST || "localhost"}/${process.env.PGDATABASE || "Just_gold"}`
      );
    } catch (dbgErr) {
      console.warn("[DEBUG products] logging failed:", dbgErr.message);
    }

    const cacheKey = buildCacheKey(filters);
    const redis = await getRedisClient();

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const { text, values, limit } = buildProductsQuery(filters);

    console.log("[DEBUG products] final SQL:\n", text);
    console.log("[DEBUG products] params:", values);

    const result = await pool.query({ text, values });

    const hasMore = result.rows.length > limit;
    const trimmed = hasMore ? result.rows.slice(0, limit) : result.rows;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;
    const products = trimmed.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.effective_price),
      base_price: Number(row.base_price),
      base_stock: row.base_stock,
      category_id: row.category_id,
      created_at: row.created_at,
      thumbnail: resolveMediaUrl(row.thumbnail_key, row.thumbnail),
      afterimage: resolveMediaUrl(row.afterimage_key, row.afterimage),
    }));

    const payload = {
      products,
      nextCursor,
      hasMore,
    };

    if (redis) {
      await redis.set(cacheKey, JSON.stringify(payload), { EX: 60 });
    }

    res.json(payload);
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
        base_stock,
        category_id,
        product_model_no,
        how_to_apply,
        benefits,
        key_features,
        ingredients,
        thumbnail,
        thumbnail_key,
        afterimage,
        afterimage_key,
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
        color_panel_type,
        color_panel_value,
        stock,
        main_image,
        main_image_key,
        secondary_image,
        secondary_image_key,
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
        , image_key
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

    const productPayload = {
      ...product,
      thumbnail: resolveMediaUrl(product.thumbnail_key, product.thumbnail),
      afterimage: resolveMediaUrl(product.afterimage_key, product.afterimage),
      variants: variantsResult.rows.map((variant) => ({
        ...variant,
        main_image: resolveMediaUrl(variant.main_image_key, variant.main_image),
        secondary_image: resolveMediaUrl(variant.secondary_image_key, variant.secondary_image),
      })),
      media: mediaResult.rows.map((media) => ({
        ...media,
        image_url: resolveMediaUrl(media.image_key, media.image_url),
      })),
    };

    if (requestedSlug && normalizedRequestedSlug !== normalizedProductSlug) {
      if (requestedPath === canonicalUrl) {
        // Prevent redirect loops if the request already targets canonical path
        return res.json(productPayload);
      }
      return res.redirect(301, canonicalUrl);
    }

    res.json(productPayload);
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
      base_stock,
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
      (name, slug, description, base_price, base_stock, category_id, product_model_no, how_to_apply, benefits, key_features, ingredients, thumbnail, afterimage)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
      `,
      [
        name,
        slug,
        description,
        base_price,
        Number.isFinite(parseInt(base_stock, 10)) ? parseInt(base_stock, 10) : 30,
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

    for (let i = 0; i < parsedVariants.length; i++) {

      const variant = parsedVariants[i];

      // Check both naming conventions: color_X and variant_main_image_X
      const colorKey = `color_${i}`;
      const variantImageKey = `variant_main_image_${i}`;
      const secondaryColorKey = `color_secondary_${i}`;
      const secondaryVariantImageKey = `variant_secondary_image_${i}`;
      const colorPanelImageKey = `color_panel_image_${i}`;
      
      const colorFile = req.files?.[colorKey]?.[0] || req.files?.[variantImageKey]?.[0] || null;
      const secondaryColorFile =
        req.files?.[secondaryColorKey]?.[0] ||
        req.files?.[secondaryVariantImageKey]?.[0] ||
        null;
      const colorPanelFile = req.files?.[colorPanelImageKey]?.[0] || null;

      // Get Cloudinary URLs instead of local paths
      const mainImagePath = colorFile
        ? (colorFile.path || colorFile.cloudinary?.secure_url)
        : null;

      const secondaryImagePath = secondaryColorFile
        ? (secondaryColorFile.path || secondaryColorFile.cloudinary?.secure_url)
        : null;

      const colorType = variant.color_type || variant.colorType || null;

      const colorPanelUploadedUrl = colorPanelFile
        ? colorPanelFile.path || colorPanelFile.cloudinary?.secure_url
        : null;

      const colorPanelValidation = validateColorPanel(
        variant.color_panel_type || variant.colorPanelType,
        variant.color_panel_value || variant.colorPanelValue,
        { requireValue: true, uploadedUrl: colorPanelUploadedUrl }
      );

      if (colorPanelValidation.error) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: colorPanelValidation.error,
          variant_index: i,
        });
      }

      const { colorPanelType, colorPanelValue } = colorPanelValidation;

      await client.query(
        `
        INSERT INTO product_variants
        (product_id, shade, color_type, color_panel_type, color_panel_value, stock, main_image, secondary_image, price, discount_price, variant_model_no)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
          productId,
          variant.color,
          colorType,
          colorPanelType,
          colorPanelValue,
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
      base_stock,
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
        base_stock = COALESCE($5, base_stock),
        category_id = COALESCE($6, category_id),
        product_model_no = COALESCE($7, product_model_no),
        how_to_apply = COALESCE($8, how_to_apply),
        benefits = COALESCE($9, benefits),
        key_features = COALESCE($10, key_features),
        ingredients = COALESCE($11, ingredients),
        thumbnail = COALESCE($12, thumbnail),
        afterimage = COALESCE($13, afterimage)
      WHERE id = $14
      `,
      [
        name || null,
        name ? slug : null,
        description || null,
        base_price || null,
        base_stock !== undefined ? parseInt(base_stock, 10) : null,
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
      const colorPanelImageKey = `color_panel_image_${i}`;

      const colorFile =
        req.files?.[colorKey]?.[0] || req.files?.[variantImageKey]?.[0] || null;
      const secondaryColorFile =
        req.files?.[secondaryColorKey]?.[0] ||
        req.files?.[secondaryVariantImageKey]?.[0] ||
        null;
      const colorPanelFile = req.files?.[colorPanelImageKey]?.[0] || null;

      const mainImagePath = colorFile
        ? colorFile.path || colorFile.cloudinary?.secure_url
        : null;

      const secondaryImagePath = secondaryColorFile
        ? secondaryColorFile.path || secondaryColorFile.cloudinary?.secure_url
        : null;

      const colorType = variant.color_type || variant.colorType || null;

      const colorPanelUploadedUrl = colorPanelFile
        ? colorPanelFile.path || colorPanelFile.cloudinary?.secure_url
        : null;

      const colorPanelValidation = validateColorPanel(
        variant.color_panel_type || variant.colorPanelType,
        variant.color_panel_value || variant.colorPanelValue,
        { requireValue: !variant.id, uploadedUrl: colorPanelUploadedUrl }
      );

      if (colorPanelValidation.error) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: colorPanelValidation.error,
          variant_index: i,
        });
      }

      const colorPanelType = colorPanelValidation.shouldUpdate
        ? colorPanelValidation.colorPanelType
        : null;

      const colorPanelValue = colorPanelValidation.shouldUpdate
        ? colorPanelValidation.colorPanelValue
        : null;

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
              color_panel_type = COALESCE($3, color_panel_type),
              color_panel_value = COALESCE($4, color_panel_value),
              stock = COALESCE($5, stock),
              main_image = COALESCE($6, main_image),
              secondary_image = COALESCE($7, secondary_image),
              price = COALESCE($8, price),
              discount_price = COALESCE($9, discount_price),
              variant_model_no = COALESCE($10, variant_model_no)
            WHERE id = $11 AND product_id = $12
            `,
            [
              variant.color || null,
              colorType,
              colorPanelType,
              colorPanelValue,
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
          (product_id, shade, color_type, color_panel_type, color_panel_value, stock, main_image, secondary_image, price, discount_price, variant_model_no)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            id,
            variant.color,
            colorType,
            colorPanelType,
            colorPanelValue,
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

    const responseProduct = {
      ...updatedProduct.rows[0],
      thumbnail: resolveMediaUrl(updatedProduct.rows[0]?.thumbnail_key, updatedProduct.rows[0]?.thumbnail),
      afterimage: resolveMediaUrl(updatedProduct.rows[0]?.afterimage_key, updatedProduct.rows[0]?.afterimage),
    };

    const responseVariants = updatedVariants.rows.map((variant) => ({
      ...variant,
      main_image: resolveMediaUrl(variant.main_image_key, variant.main_image),
      secondary_image: resolveMediaUrl(variant.secondary_image_key, variant.secondary_image),
    }));

    const responseMedia = updatedMedia.rows.map((media) => ({
      ...media,
      image_url: resolveMediaUrl(media.image_key, media.image_url),
    }));

    res.json({
      message: "Product updated successfully",
      product: {
        ...responseProduct,
        variants: responseVariants,
        media: responseMedia,
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
