const router = require("express").Router();
const pool = require("../config/db");

/* -------- GET ALL CATEGORIES WITH SUBCATEGORIES -------- */

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c1.id, c1.name,
      COALESCE(
        json_agg(
          json_build_object('id', c2.id, 'name', c2.name)
        ) FILTER (WHERE c2.id IS NOT NULL),
        '[]'
      ) AS subcategories
      FROM categories c1
      LEFT JOIN categories c2 ON c2.parent_id = c1.id
      WHERE c1.parent_id IS NULL
      GROUP BY c1.id
      ORDER BY c1.id
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

module.exports = router;
                           