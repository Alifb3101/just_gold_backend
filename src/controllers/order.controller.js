const pool = require("../config/db");

exports.createOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { items, total_amount } = req.body;

    const order = await client.query(
      "INSERT INTO orders (user_id,total_amount) VALUES ($1,$2) RETURNING id",
      [req.user.id, total_amount]
    );

    for (let item of items) {
      await client.query(
        "INSERT INTO order_items (order_id,product_variant_id,quantity,price) VALUES ($1,$2,$3,$4)",
        [order.rows[0].id, item.variant_id, item.quantity, item.price]
      );

      await client.query(
        "UPDATE product_variants SET stock = stock - $1 WHERE id=$2",
        [item.quantity, item.variant_id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({ message: "Order placed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};
