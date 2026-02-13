const pool = require("../src/config/db");

/* =========================================================
   DATABASE PATCH: media key columns
   - Adds *_key columns (nullable)
   - Backfills keys from existing URLs without touching originals
   - Keeps all existing data intact (no drops/overwrites)
========================================================= */

const extractKey = (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    const noQuery = url.split("?")[0];
    const marker = "/upload/";
    const idx = noQuery.indexOf(marker);
    if (idx === -1) return null;

    const after = noQuery.slice(idx + marker.length);
    // Remove version segment like v123/ if present
    const parts = after.split("/");
    const withoutVersion = parts[0]?.match(/^v\d+$/) ? parts.slice(1) : parts;
    const key = withoutVersion.join("/");
    return key || null;
  } catch (_) {
    return null;
  }
};

const ensureColumns = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS thumbnail_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS afterimage_key VARCHAR(500);
  `);

  await client.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS main_image_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS secondary_image_key VARCHAR(500);
  `);

  await client.query(`
    ALTER TABLE product_images
    ADD COLUMN IF NOT EXISTS image_key VARCHAR(500);
  `);
};

const backfillProducts = async (client) => {
  const { rows } = await client.query(
    `SELECT id, thumbnail, afterimage FROM products`
  );

  for (const row of rows) {
    const thumbKey = extractKey(row.thumbnail);
    const afterKey = extractKey(row.afterimage);

    if (thumbKey || afterKey) {
      await client.query(
        `UPDATE products SET thumbnail_key = COALESCE(thumbnail_key, $1), afterimage_key = COALESCE(afterimage_key, $2) WHERE id = $3`,
        [thumbKey, afterKey, row.id]
      );
    }
  }
};

const backfillVariants = async (client) => {
  const { rows } = await client.query(
    `SELECT id, main_image, secondary_image FROM product_variants`
  );

  for (const row of rows) {
    const mainKey = extractKey(row.main_image);
    const secondaryKey = extractKey(row.secondary_image);

    if (mainKey || secondaryKey) {
      await client.query(
        `UPDATE product_variants SET main_image_key = COALESCE(main_image_key, $1), secondary_image_key = COALESCE(secondary_image_key, $2) WHERE id = $3`,
        [mainKey, secondaryKey, row.id]
      );
    }
  }
};

const backfillImages = async (client) => {
  const { rows } = await client.query(
    `SELECT id, image_url FROM product_images`
  );

  for (const row of rows) {
    const imageKey = extractKey(row.image_url);
    if (imageKey) {
      await client.query(
        `UPDATE product_images SET image_key = COALESCE(image_key, $1) WHERE id = $2`,
        [imageKey, row.id]
      );
    }
  }
};

const run = async () => {
  const client = await pool.connect();

  try {
    console.log("🔧 Applying media key migration...\n");
    await client.query("BEGIN");

    await ensureColumns(client);
    console.log("✅ Ensured *_key columns exist");

    await backfillProducts(client);
    console.log("✅ Backfilled product keys");

    await backfillVariants(client);
    console.log("✅ Backfilled variant keys");

    await backfillImages(client);
    console.log("✅ Backfilled product image keys\n");

    await client.query("COMMIT");
    console.log("✨ Migration complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error.message);
  } finally {
    client.release();
    pool.end();
  }
};

run();
