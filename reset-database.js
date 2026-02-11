const pool = require("./src/config/db");

/* =========================================================
   DATABASE RESET SCRIPT
   - Truncates all tables
   - Resets all auto-increment sequences to 1
   - Clears all data but keeps table structure
========================================================= */

const resetDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log("🔄 Starting database reset...\n");

    // Disable foreign key checks temporarily
    await client.query("SET session_replication_role = 'replica';");

    // List of tables to reset (in order to handle dependencies)
    const tables = [
      'order_items',
      'orders',
      'product_images',
      'product_variants',
      'products',
      'categories',
      'users'
    ];

    for (const table of tables) {
      try {
        // Truncate table and restart identity (reset sequence to 1)
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
        console.log(`✅ Reset table: ${table}`);
      } catch (err) {
        if (err.code === '42P01') {
          console.log(`⚠️  Table ${table} does not exist - skipping`);
        } else {
          console.error(`❌ Error resetting ${table}:`, err.message);
        }
      }
    }

    // Re-enable foreign key checks
    await client.query("SET session_replication_role = 'origin';");

    console.log("\n✨ Database reset complete! All IDs will start from 1.\n");

  } catch (err) {
    console.error("❌ Database reset failed:", err.message);
  } finally {
    client.release();
    pool.end();
  }
};

// Run the reset
resetDatabase();
