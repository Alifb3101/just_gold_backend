const pool = require("../src/config/db");

/* =========================================================
   DATABASE PATCH: base_stock on products
   - Adds base_stock integer with default 30
   - Backfills existing products to base_stock = 30
========================================================= */

const run = async () => {
  const client = await pool.connect();

  try {
    console.log("🔧 Adding base_stock column to products...\n");
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS base_stock INTEGER NOT NULL DEFAULT 30;
    `);
    console.log("✅ Ensured column: base_stock (default 30)");

    await client.query(`
      UPDATE products
      SET base_stock = 30
      WHERE base_stock IS NULL;
    `);
    console.log("✅ Backfilled existing products to base_stock = 30\n");

    await client.query("COMMIT");
    console.log("✨ Schema patch complete.\n");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to add base_stock:", error.message);
  } finally {
    client.release();
    pool.end();
  }
};

run();
