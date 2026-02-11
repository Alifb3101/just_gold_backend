const pool = require("../src/config/db");

/* =========================================================
   DATABASE PATCH: product_variants enhancements
   - Adds secondary_image (nullable)
   - Adds color_type (nullable)
========================================================= */

const run = async () => {
  const client = await pool.connect();

  try {
    console.log("🔧 Updating product_variants schema...\n");

    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS secondary_image VARCHAR(500);
    `);
    console.log("✅ Ensured column: secondary_image");

    await client.query(`
      ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS color_type VARCHAR(150);
    `);
    console.log("✅ Ensured column: color_type\n");

    await client.query("COMMIT");

    console.log("✨ Schema updated successfully. Variants can now store two images and a color type.\n");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to update schema:", error.message);
  } finally {
    client.release();
    pool.end();
  }
};

run();
