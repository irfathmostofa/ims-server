import pool from "../../config/db";

/**
 * Simple prefix ID generator using row count
 * @param table - Table name
 * @param prefix - Prefix string (e.g., "INV", "PRODUCT")
 * @param padLength - Minimum digit length (default 3 -> 001, 002...)
 */
export async function generatePrefixedId(
  table: string,
  prefix: string,
  padLength: number = 3
): Promise<string> {
  const { rows } = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
  const count = parseInt(rows[0].count, 10) + 1; // next number
  return `${prefix}-${String(count).padStart(padLength, "0")}`;
}
