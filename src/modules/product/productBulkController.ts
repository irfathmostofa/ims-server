import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import pool from "../../config/db";
import {
  generatePrefixedId,
  generateRandomBarcode,
} from "../../core/models/idGenerator";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { PoolClient } from "pg";

// ---------- Types ----------

interface BulkRow {
  row_group: string;
  product_name: string;
  brand_name: string;
  uom_name: string;
  cost_price: string;
  selling_price: string;
  regular_price: string;
  description?: string;
  category_names?: string;
  variant_name: string;
  weight?: string;
  weight_unit?: string;
  is_replaceable?: string;
  additional_price?: string;
  image_url?: string;
  is_primary_image?: string;
}

interface RowIssue {
  row_index: number;
  field: string;
  message: string;
}

interface GroupPreview {
  row_group: string;
  product_name: string;
  row_count: number;
  status: "valid" | "error";
  issues: RowIssue[];
  brand_status: "existing" | "new" | "unknown";
  uom_status: "existing" | "new" | "unknown";
  category_status: { name: string; status: "existing" | "new" }[];
  rows: BulkRow[];
}

interface GroupResult {
  row_group: string;
  product_name: string;
  status: "success" | "failed";
  product_id?: number;
  error?: string;
}

// ---------- Shared helpers ----------
/**
 * Creates a per-transaction code generator. Queries the DB once per table
 * (using the SAME client/transaction, so it sees the transaction's own
 * uncommitted inserts is irrelevant — we never re-query; we just increment
 * in memory after the first lookup). This avoids the pool.query() visibility
 * bug where a fresh connection can't see uncommitted rows from this transaction,
 * which caused duplicate codes when multiple new rows of the same table were
 * created within a single confirm.
 */
function createCodeGenerator(client: PoolClient) {
  const counters = new Map<string, number>();

  return async function nextCode(
    table: string,
    prefix: string,
    padLength = 3,
  ): Promise<string> {
    const cacheKey = `${table}:${prefix}`;

    if (!counters.has(cacheKey)) {
      const { rows } = await client.query(
        `SELECT MAX(CAST(SPLIT_PART(code, '-', 2) AS INTEGER)) AS max_id
         FROM ${table}
         WHERE code LIKE $1`,
        [`${prefix}-%`],
      );
      counters.set(cacheKey, rows[0].max_id ?? 0);
    }

    const next = counters.get(cacheKey)! + 1;
    counters.set(cacheKey, next);
    return `${prefix}-${String(next).padStart(padLength, "0")}`;
  };
}
function toBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return ["true", "1", "yes"].includes(String(value).trim().toLowerCase());
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Row-level field validation. Returns a list of issues (empty = valid). */
function validateRow(row: BulkRow, rowIndex: number): RowIssue[] {
  const issues: RowIssue[] = [];
  const required: (keyof BulkRow)[] = [
    "row_group",
    "product_name",
    "brand_name",
    "uom_name",
    "variant_name",
    "cost_price",
    "selling_price",
    "regular_price",
  ];

  for (const field of required) {
    const val = row[field];
    if (val === undefined || val === null || val.toString().trim() === "") {
      issues.push({
        row_index: rowIndex,
        field,
        message: `${field} is required`,
      });
    }
  }

  for (const numField of [
    "cost_price",
    "selling_price",
    "regular_price",
    "weight",
    "additional_price",
  ] as const) {
    const raw = row[numField];
    if (raw !== undefined && raw !== "" && toNumber(raw as string) === null) {
      issues.push({
        row_index: rowIndex,
        field: numField,
        message: `${numField} must be a valid number`,
      });
    }
  }

  return issues;
}

/**
 * Parses an uploaded file buffer into rows. Detects .xlsx/.xls vs .csv
 * by filename extension and branches to SheetJS or Papaparse accordingly.
 *
 * IMPORTANT: papaparse "FieldMismatch" errors (extra/missing columns on a
 * single row — usually caused by an unquoted comma inside a value like
 * category_names) are NOT treated as fatal. They're recorded per-row in
 * rowLevelErrors so that ONE bad row doesn't block the whole file. Only
 * genuinely fatal parser errors (bad delimiter, unterminated quote, etc.)
 * go into parseErrors and fail the whole upload.
 */
function parseFileToRows(
  buffer: Buffer,
  filename: string,
): {
  rows: BulkRow[];
  parseErrors: string[];
  rowLevelErrors: Map<number, string>;
} {
  const isExcel = /\.xlsx?$/i.test(filename);
  const rowLevelErrors = new Map<number, string>();

  if (isExcel) {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          rows: [],
          parseErrors: ["Excel file has no sheets"],
          rowLevelErrors,
        };
      }
      const sheet = workbook.Sheets[firstSheetName];
      // defval: "" ensures blank cells come through as empty string, not undefined
      // raw: false ensures numeric cells are stringified consistently (matches CSV behavior)
      const rows = XLSX.utils.sheet_to_json<BulkRow>(sheet, {
        defval: "",
        raw: false,
      });
      return { rows, parseErrors: [], rowLevelErrors };
    } catch (err: any) {
      return {
        rows: [],
        parseErrors: [`Failed to read Excel file: ${err.message}`],
        rowLevelErrors,
      };
    }
  }

  // CSV / TSV path — papaparse
  const parsed = Papa.parse<BulkRow>(buffer.toString("utf-8"), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });

  const fatalErrors: string[] = [];

  for (const e of parsed.errors) {
    if (e.type === "FieldMismatch") {
      // Row-level issue only — do not fail the whole file.
      if (typeof e.row === "number") {
        rowLevelErrors.set(
          e.row,
          `Column count mismatch on this row — check for an unquoted comma inside a value (e.g. category_names must be wrapped in quotes like "Rice,Grocery" if it contains a comma). Raw parser message: ${e.message}`,
        );
      }
    } else {
      // Delimiter detection failure, unterminated quote, etc. — these mean
      // the file structure itself is broken and can't be trusted at all.
      fatalErrors.push(`Row ${e.row ?? "?"}: ${e.message}`);
    }
  }

  return { rows: parsed.data, parseErrors: fatalErrors, rowLevelErrors };
}

/** Read-only check: does a brand/uom/category with this name already exist? */
async function checkExistsByName(
  client: PoolClient,
  table: "brand" | "uom" | "category",
  name: string,
): Promise<boolean> {
  const result = await client.query(
    `SELECT id FROM ${table} WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name.trim()],
  );
  return result.rows.length > 0;
}

/**
 * Lookup-or-create by name. Used only in the CONFIRM step (writes).
 * Preview uses checkExistsByName instead (read-only).
 */
async function getOrCreateByName(
  client: PoolClient,
  table: "brand" | "uom" | "category",
  name: string,
  prefix: string,
  createdBy: number,
  nextCode: (
    table: string,
    prefix: string,
    padLength?: number,
  ) => Promise<string>,
): Promise<number> {
  const existing = await client.query(
    `SELECT id FROM ${table} WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name.trim()],
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const code = await nextCode(table, prefix);
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

  const insertQuery =
    table === "uom"
      ? `INSERT INTO uom (code, name, created_by) VALUES ($1,$2,$3) RETURNING id`
      : `INSERT INTO ${table} (code, name, slug, created_by) VALUES ($1,$2,$3,$4) RETURNING id`;

  const params =
    table === "uom"
      ? [code, name.trim(), createdBy]
      : [code, name.trim(), slug, createdBy];
  const inserted = await client.query(insertQuery, params);
  return inserted.rows[0].id;
}

// ==========================================================
// PREVIEW — parse + validate only, NO database writes
// ==========================================================

export async function bulkProductPreview(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const file = await req.file();
  if (!file) {
    return reply
      .status(400)
      .send({ success: false, message: "No file uploaded" });
  }

  const buffer = await file.toBuffer();
  const { rows, parseErrors, rowLevelErrors } = parseFileToRows(
    buffer,
    file.filename,
  );

  // Only genuinely fatal parse errors block the whole file now.
  if (parseErrors.length > 0) {
    return reply.status(400).send({
      success: false,
      message: "Failed to parse file",
      errors: parseErrors,
    });
  }
  if (rows.length === 0) {
    return reply.status(400).send({ success: false, message: "File is empty" });
  }

  // Group rows by row_group, tracking original index for error reporting
  const groups = new Map<string, { row: BulkRow; index: number }[]>();
  rows.forEach((row, index) => {
    const key = row.row_group || `__missing_${index}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ row, index });
  });

  const client = await pool.connect();
  const previews: GroupPreview[] = [];

  try {
    for (const [rowGroup, entries] of groups) {
      const issues: RowIssue[] = [];

      for (const { row, index } of entries) {
        issues.push(...validateRow(row, index));

        // Fold in any row-level CSV structure issue (e.g. unquoted comma)
        if (rowLevelErrors.has(index)) {
          issues.push({
            row_index: index,
            field: "_row",
            message: rowLevelErrors.get(index)!,
          });
        }
      }

      const first = entries[0].row;
      let brandStatus: "existing" | "new" | "unknown" = "unknown";
      let uomStatus: "existing" | "new" | "unknown" = "unknown";
      const categoryStatus: { name: string; status: "existing" | "new" }[] = [];

      // Only do existence checks if the basic required fields are present
      if (issues.length === 0) {
        brandStatus = (await checkExistsByName(
          client,
          "brand",
          first.brand_name,
        ))
          ? "existing"
          : "new";
        uomStatus = (await checkExistsByName(client, "uom", first.uom_name))
          ? "existing"
          : "new";

        const categoryNames = (first.category_names ?? "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);

        for (const catName of categoryNames) {
          const exists = await checkExistsByName(client, "category", catName);
          categoryStatus.push({
            name: catName,
            status: exists ? "existing" : "new",
          });
        }
      }

      previews.push({
        row_group: rowGroup,
        product_name: first.product_name || "(missing)",
        row_count: entries.length,
        status: issues.length > 0 ? "error" : "valid",
        issues,
        brand_status: brandStatus,
        uom_status: uomStatus,
        category_status: categoryStatus,
        rows: entries.map((e) => e.row),
      });
    }
  } finally {
    client.release();
  }

  const validCount = previews.filter((p) => p.status === "valid").length;
  const errorCount = previews.length - validCount;

  return reply.send(
    successResponse(
      {
        total_groups: previews.length,
        valid_groups: validCount,
        error_groups: errorCount,
        groups: previews,
      },
      "Preview generated",
    ),
  );
}

// ==========================================================
// CONFIRM — takes validated JSON, performs actual inserts
// ==========================================================

async function processProductGroup(
  client: PoolClient,
  rowGroup: string,
  rows: BulkRow[],
  createdBy: number,
): Promise<GroupResult> {
  const nextCode = createCodeGenerator(client); // ← scoped to this transaction

  const first = rows[0];

  const brandId = await getOrCreateByName(
    client,
    "brand",
    first.brand_name,
    "BRAND",
    createdBy,
    nextCode,
  );
  const uomId = await getOrCreateByName(
    client,
    "uom",
    first.uom_name,
    "UOM",
    createdBy,
    nextCode,
  );

  const productCode = await nextCode("product", "PRD");
  const productSlug = first.product_name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  const productResult = await client.query(
    `INSERT INTO product
      (code, uom_id, name, slug, description, brand_id, cost_price, selling_price, regular_price, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      productCode,
      uomId,
      first.product_name.trim(),
      productSlug,
      first.description ?? null,
      brandId,
      toNumber(first.cost_price),
      toNumber(first.selling_price),
      toNumber(first.regular_price),
      createdBy,
    ],
  );
  const productId = productResult.rows[0].id;

  const categoryNames = (first.category_names ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  for (const catName of categoryNames) {
    const categoryId = await getOrCreateByName(
      client,
      "category",
      catName,
      "PCAT",
      createdBy,
      nextCode,
    );
    await client.query(
      `INSERT INTO product_categories (product_id, category_id, is_primary, created_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_id, category_id) DO NOTHING`,
      [productId, categoryId, categoryNames.indexOf(catName) === 0, createdBy],
    );
  }

  const variantMap = new Map<string, BulkRow[]>();
  for (const row of rows) {
    const key = row.variant_name.trim();
    if (!variantMap.has(key)) variantMap.set(key, []);
    variantMap.get(key)!.push(row);
  }

  for (const [variantName, variantRows] of variantMap) {
    const vFirst = variantRows[0];
    const variantCode = await nextCode("product_variant", "PVAR");
    const sku = await nextCode("product_variant", "SKU");

    const variantResult = await client.query(
      `INSERT INTO product_variant
        (code, product_id, name, weight, sku, weight_unit, is_replaceable, additional_price, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        variantCode,
        productId,
        variantName,
        toNumber(vFirst.weight),
        sku,
        vFirst.weight_unit ?? "kg",
        toBool(vFirst.is_replaceable, false),
        toNumber(vFirst.additional_price) ?? 0,
        createdBy,
      ],
    );
    const variantId = variantResult.rows[0].id;

    const barcode = generateRandomBarcode("EAN");
    await client.query(
      `INSERT INTO product_barcode (product_variant_id, barcode, is_primary, created_by)
       VALUES ($1,$2,$3,$4)`,
      [variantId, barcode, true, createdBy],
    );

    for (const row of variantRows) {
      if (!row.image_url) continue;
      const imageCode = await nextCode("product_image", "IMG");
      await client.query(
        `INSERT INTO product_image (code, product_variant_id, url, is_primary, created_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          imageCode,
          variantId,
          row.image_url,
          toBool(row.is_primary_image, false),
          createdBy,
        ],
      );
    }
  }

  return {
    row_group: rowGroup,
    product_name: first.product_name,
    status: "success",
    product_id: productId,
  };
}

export async function bulkProductConfirm(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = (req.user as { id: number }).id;
  const body = req.body as {
    groups: { row_group: string; rows: BulkRow[] }[];
  };

  if (!body?.groups || body.groups.length === 0) {
    return reply
      .status(400)
      .send({ success: false, message: "No validated groups provided" });
  }

  const results: GroupResult[] = [];

  for (const group of body.groups) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await processProductGroup(
        client,
        group.row_group,
        group.rows,
        userId,
      );
      await client.query("COMMIT");
      results.push(result);
    } catch (err: any) {
      await client.query("ROLLBACK");
      results.push({
        row_group: group.row_group,
        product_name: group.rows[0]?.product_name ?? "unknown",
        status: "failed",
        error: err.message ?? "Unknown error",
      });
    } finally {
      client.release();
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;

  return reply.send(
    successResponse(
      {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
        results,
      },
      "Bulk product upload completed",
    ),
  );
}
