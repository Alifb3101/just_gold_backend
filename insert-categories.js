const pool = require("./src/config/db");

/* =========================================================
   HELPERS
========================================================= */

const makeSlug = (name) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `category-${Date.now()}`;
};

const insertCategory = async (client, name, parentId = null) => {
  const slug = makeSlug(name);
  const result = await client.query(
    `INSERT INTO categories (name, slug, parent_id) VALUES ($1, $2, $3) RETURNING id`,
    [name, slug, parentId]
  );
  return result.rows[0].id;
};

/* =========================================================
   INSERT CATEGORIES & SUBCATEGORIES
   Based on Just Gold cosmetics store structure
========================================================= */

const insertCategories = async () => {
  const client = await pool.connect();

  try {
    console.log("🚀 Inserting Categories & Subcategories...\n");

    await client.query("BEGIN");

    /* =====================================================
       MAIN CATEGORIES (parent_id = NULL)
    ===================================================== */

    const newInId = await insertCategory(client, "NEW IN");
    console.log(`✅ Created Category: NEW IN (ID: ${newInId})`);

    const makeupId = await insertCategory(client, "MAKEUP");
    console.log(`✅ Created Category: MAKEUP (ID: ${makeupId})`);

    const faceId = await insertCategory(client, "FACE");
    console.log(`✅ Created Category: FACE (ID: ${faceId})`);

    const eyesId = await insertCategory(client, "EYES");
    console.log(`✅ Created Category: EYES (ID: ${eyesId})`);

    const lipsId = await insertCategory(client, "LIPS");
    console.log(`✅ Created Category: LIPS (ID: ${lipsId})`);

    const toolsId = await insertCategory(client, "TOOLS & BRUSHES");
    console.log(`✅ Created Category: TOOLS & BRUSHES (ID: ${toolsId})`);

    const kitsId = await insertCategory(client, "KITS & SETS");
    console.log(`✅ Created Category: KITS & SETS (ID: ${kitsId})`);

    const bestSellersId = await insertCategory(client, "BEST SELLERS");
    console.log(`✅ Created Category: BEST SELLERS (ID: ${bestSellersId})`);

    const giftsId = await insertCategory(client, "GIFTS");
    console.log(`✅ Created Category: GIFTS (ID: ${giftsId})`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    /* =====================================================
       FACE SUBCATEGORIES
    ===================================================== */

    const faceSubcategories = [
      "All Face",
      "Foundation",
      "Concealer",
      "Powder",
      "Primer",
      "Bronzer",
      "Highlighter",
      "Setting Spray"
    ];

    console.log(`📁 FACE Subcategories:`);
    for (const subcat of faceSubcategories) {
      const subId = await insertCategory(client, subcat, faceId);
      console.log(`   ↳ ${subcat} (ID: ${subId})`);
    }

    /* =====================================================
       EYES SUBCATEGORIES
    ===================================================== */

    const eyesSubcategories = [
      "All Eyes",
      "Eyeshadow Palettes",
      "Eyeliner",
      "Mascara",
      "Eyebrow",
      "Eye Primer",
      "False Lashes"
    ];

    console.log(`\n📁 EYES Subcategories:`);
    for (const subcat of eyesSubcategories) {
      const subId = await insertCategory(client, subcat, eyesId);
      console.log(`   ↳ ${subcat} (ID: ${subId})`);
    }

    /* =====================================================
       LIPS SUBCATEGORIES
    ===================================================== */

    const lipsSubcategories = [
      "All Lips",
      "Lipstick",
      "Lip Gloss",
      "Lip Liner",
      "Lip Balm",
      "Lip Stain",
      "Lip Sets"
    ];

    console.log(`\n📁 LIPS Subcategories:`);
    for (const subcat of lipsSubcategories) {
      const subId = await insertCategory(client, subcat, lipsId);
      console.log(`   ↳ ${subcat} (ID: ${subId})`);
    }

    /* =====================================================
       TOOLS & BRUSHES SUBCATEGORIES
    ===================================================== */

    const toolsSubcategories = [
      "All Tools",
      "Face Brushes",
      "Eye Brushes",
      "Lip Brushes",
      "Sponges",
      "Brush Sets",
      "Applicators"
    ];

    console.log(`\n📁 TOOLS & BRUSHES Subcategories:`);
    for (const subcat of toolsSubcategories) {
      const subId = await insertCategory(client, subcat, toolsId);
      console.log(`   ↳ ${subcat} (ID: ${subId})`);
    }

    console.log(`\n📁 NEW IN: No subcategories`);
    console.log(`📁 MAKEUP: No subcategories`);
    console.log(`📁 KITS & SETS: No subcategories`);
    console.log(`📁 BEST SELLERS: No subcategories`);
    console.log(`📁 GIFTS: No subcategories`);

    await client.query("COMMIT");

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("✨ Categories & Subcategories inserted successfully!\n");

    // Show summary
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories WHERE parent_id IS NULL) as main_categories,
        (SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL) as subcategories,
        (SELECT COUNT(*) FROM categories) as total
    `);

    console.log("📊 Summary:");
    console.log(`   Main Categories: ${summary.rows[0].main_categories}`);
    console.log(`   Subcategories: ${summary.rows[0].subcategories}`);
    console.log(`   Total: ${summary.rows[0].total}\n`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", err.message);
  } finally {
    client.release();
    pool.end();
  }
};

insertCategories();
