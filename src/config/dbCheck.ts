import pool from "./db";

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully:", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
})();
