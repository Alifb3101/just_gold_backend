const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Just_gold",
  password: "Aliasgar1234@#",
  port: 5432,
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected Successfully"))
  .catch(err => console.error("❌ DB Connection Error:", err));

module.exports = pool;
