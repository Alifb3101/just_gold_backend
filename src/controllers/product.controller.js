const pool = require("../config/db");

/* =========================================================
   GET PRODUCTS (WITH PAGINATION)
========================================================= */
exports.getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.base_price,
        p.description,
        p.created_at
      FROM products p
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
};


/* =========================================================
   GET SINGLE PRODUCT (FULL DETAILS)
========================================================= */
exports.getProductBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug;

    /* -------- Get Product -------- */

    const productResult = await pool.query(
      `SELECT * FROM products WHERE slug=$1`,
      [slug]
    );

    if (!productResult.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult.rows[0];

    /* -------- Get Variants -------- */

    const variantsResult = await pool.query(
      `
      SELECT 
        id,
        shade,
        stock,
        main_image,
        price,
        discount_price
      FROM product_variants
      WHERE product_id=$1
      `,
      [product.id]
    );

    /* -------- Get Media -------- */

    const mediaResult = await pool.query(
      `
      SELECT image_url, media_type
      FROM product_images
      WHERE product_id=$1
      `,
      [product.id]
    );

    res.json({
      ...product,
      variants: variantsResult.rows,
      media: mediaResult.rows
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
      (name, slug, description, base_price, category_id)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
      [name, slug, description, base_price, subcategory_id]
    );

    const productId = productResult.rows[0].id;

    /* =====================================================
       ORGANIZE FILES (multer .fields() returns object)
    ===================================================== */

    const galleryFiles = [
      ...(req.files?.gallery || []),
      ...(req.files?.media || [])
    ];
    const videoFiles = req.files?.video || [];

    /* -------- Save Gallery -------- */

    for (let file of galleryFiles) {
      await client.query(
        `
        INSERT INTO product_images
        (product_id, image_url, media_type)
        VALUES ($1,$2,$3)
        `,
        [productId, "/uploads/" + file.filename, "image"]
      );
    }

    /* -------- Save Product Video -------- */

    if (videoFiles.length > 0) {
      await client.query(
        `
        INSERT INTO product_images
        (product_id, image_url, media_type)
        VALUES ($1,$2,$3)
        `,
        [productId, "/uploads/" + videoFiles[0].filename, "video"]
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

      const colorKey = `color_${i}`;
      const colorFile = req.files?.[colorKey]?.[0] || null;

      const mainImagePath = colorFile
        ? "/uploads/" + colorFile.filename
        : null;

      await client.query(
        `
        INSERT INTO product_variants
        (product_id, shade, stock, main_image, price, discount_price)
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          productId,
          variant.color,
          variant.stock || 0,
          mainImagePath,
          variant.price || null,
          variant.discount_price || null
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
    console.error("Create Product Error:", err);
    res.status(500).json({
      message: err.message || "Error creating product"
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

    /* -------- Delete Variants (Cascade) -------- */

    await client.query(
      `DELETE FROM product_variants WHERE product_id = $1`,
      [id]
    );

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
