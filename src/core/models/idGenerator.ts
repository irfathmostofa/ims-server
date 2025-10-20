import pool from "../../config/db";

export async function generatePrefixedId(
  table: string,
  prefix: string,
  padLength: number = 3
): Promise<string> {
  const { rows } = await pool.query(
    `SELECT MAX(CAST(SPLIT_PART(code, '-', 2) AS INTEGER)) AS max_id
     FROM ${table}
     WHERE code LIKE $1`,
    [`${prefix}-%`]
  );

  const maxId = rows[0].max_id ?? 0;
  return `${prefix}-${String(maxId + 1).padStart(padLength, "0")}`;
}

export function generateRandomBarcode(prefix = "EAN") {
  // EAN13 usually has 13 digits
  const randomNumber = Math.floor(100000000000 + Math.random() * 900000000000);
  return `${prefix}${randomNumber}`;
}
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateOrderId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // Generate random alphanumeric string
  const randomStr = generateRandomString(6);

  return `ORD-${dateStr}-${randomStr}`;
}
