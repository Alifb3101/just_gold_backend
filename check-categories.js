const pool = require("./src/config/db");

const checkCategories = async () => {
  try {
    console.log("📊 Checking Categories & Subcategories...\n");

    // Get all categories
    const result = await pool.query(`
      SELECT id, name, parent_id, created_at
      FROM categories
      ORDER BY parent_id NULLS FIRST, id ASC
    `);

    if (result.rows.length === 0) {
      console.log("❌ No categories found in database!\n");
      pool.end();
      return;
    }

    // Separate parent categories and subcategories
    const parentCategories = result.rows.filter(cat => cat.parent_id === null);
    const subCategories = result.rows.filter(cat => cat.parent_id !== null);

    console.log(`✅ Total Categories: ${parentCategories.length}`);
    console.log(`✅ Total Subcategories: ${subCategories.length}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Display parent categories with their subcategories
    parentCategories.forEach(parent => {
      console.log(`📁 CATEGORY ID: ${parent.id}`);
      console.log(`   Name: ${parent.name}`);
      
      const subs = subCategories.filter(sub => sub.parent_id === parent.id);
      if (subs.length > 0) {
        console.log(`   Subcategories (${subs.length}):`);
        subs.forEach(sub => {
          console.log(`      ↳ ID: ${sub.id} - ${sub.name}`);
        });
      } else {
        console.log(`   Subcategories: None`);
      }
      console.log("");
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Show orphaned subcategories (subcategories without valid parent)
    const orphaned = subCategories.filter(sub => 
      !parentCategories.find(parent => parent.id === sub.parent_id)
    );

    if (orphaned.length > 0) {
      console.log("⚠️  Orphaned Subcategories (invalid parent_id):");
      orphaned.forEach(sub => {
        console.log(`   ID: ${sub.id} - ${sub.name} (parent_id: ${sub.parent_id})`);
      });
      console.log("");
    }

    pool.end();

  } catch (err) {
    console.error("❌ Error:", err.message);
    pool.end();
  }
};

checkCategories();
