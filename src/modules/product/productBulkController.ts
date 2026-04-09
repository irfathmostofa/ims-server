import { FastifyRequest, FastifyReply } from "fastify";
import { parse } from "papaparse";
import XLSX from "xlsx";
import pool from "../../config/db";
import {
  generatePrefixedId,
  generateRandomBarcode,
  slugify,
} from "../../core/models/idGenerator";
import {
  productModel,
  productCategoryModel,
  productVariantModel,
  productBarcodeModel,
  productImageModel,
} from "./product.model";

type Variant = {
  name: string;
  additional_price: number;
  SKU?: string;
  weight?: number;
  weight_unit?: string;
  is_replaceable?: boolean;
  status?: string;
  images?: { url: string; alt_text?: string; is_primary?: boolean }[];
};

type ProductData = {
  name: string;
  slug: string;
  code?: string;
  status?: string;
  uom_id?: number;
  cost_price?: number;
  regular_price?: number; // Added regular_price
  selling_price?: number;
  categories?: { name: string; is_primary?: boolean }[];
  variants?: Variant[];
  created_by?: number;
};

type ProductPreview = {
  row: number;
  product_name: string;
  category: string;
  variant: Variant;
  uom_name?: string;
  cost_price?: number | null;
  regular_price?: number | null; // Added regular_price
  selling_price?: number | null;
  stock_quantity?: number;
};

// ------------------- HELPER: parse CSV / XLSX -------------------
async function parseFile(file: any): Promise<any[]> {
  const buffer = await file.toBuffer();
  const filename = file.filename || file.filepath;

  if (filename.endsWith(".csv")) {
    const csvString = buffer.toString("utf-8");
    const parsed = parse(csvString, { header: true, skipEmptyLines: true });
    return parsed.data as any[];
  } else if (filename.endsWith(".xlsx")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
  } else {
    throw new Error("Unsupported file type. Only CSV or XLSX allowed.");
  }
}

// ------------------- HELPER: GET OR CREATE UOM (Case-Insensitive) -------------------
async function getOrCreateUOM(nameOrSymbol: string, userId: number) {
  if (!nameOrSymbol || nameOrSymbol.trim() === "") return null;

  const trimmedValue = nameOrSymbol.trim().toUpperCase();
  const client = await pool.connect();

  try {
    const findQuery = `
      SELECT * FROM uom 
      WHERE LOWER(name) = LOWER($1) OR LOWER(symbol) = LOWER($1)
      LIMIT 1
    `;
    const findResult = await client.query(findQuery, [trimmedValue]);

    if (findResult.rows.length > 0) {
      return findResult.rows[0];
    }

    const code = await generatePrefixedId("uom", "UOM");
    const insertQuery = `
      INSERT INTO uom (code, name, symbol, created_by) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      code,
      trimmedValue,
      trimmedValue,
      userId,
    ]);

    return insertResult.rows[0];
  } catch (error) {
    console.error(`Error getting/creating UOM "${trimmedValue}":`, error);
    return null;
  } finally {
    client.release();
  }
}

// ------------------- HELPER: GET OR CREATE CATEGORY (Case-Insensitive) -------------------
async function getOrCreateCategory(name: string, userId: number) {
  if (!name || name.trim() === "") return null;

  const trimmedName = name.trim();
  const client = await pool.connect();

  try {
    const findQuery =
      "SELECT * FROM category WHERE LOWER(name) = LOWER($1) LIMIT 1";
    const findResult = await client.query(findQuery, [trimmedName]);

    if (findResult.rows.length > 0) {
      return findResult.rows[0];
    }

    const code = await generatePrefixedId("category", "PCAT");
    const slug = slugify(trimmedName);
    const insertQuery = `
      INSERT INTO category (code, name, slug, created_by) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      code,
      trimmedName,
      slug,
      userId,
    ]);

    return insertResult.rows[0];
  } catch (error) {
    console.error(`Error getting/creating category "${trimmedName}":`, error);
    return null;
  } finally {
    client.release();
  }
}

// ------------------- VALIDATE PRODUCT DATA -------------------
function validateProductData(data: Partial<ProductData>): string[] {
  const errors: string[] = [];

  if (!data.name) errors.push("Product name is required");
  if (data.uom_id === undefined || data.uom_id === null)
    errors.push("UOM ID is required");
  if (data.cost_price === undefined || data.cost_price === null)
    errors.push("Cost price is required");
  if (data.regular_price === undefined || data.regular_price === null)
    errors.push("Regular price is required");
  if (data.selling_price === undefined || data.selling_price === null)
    errors.push("Selling price is required");

  return errors;
}

// ------------------- CREATE PRODUCT (USED INTERNALLY) -------------------
export async function createProductInternal(
  productData: ProductData,
  userId: number,
  branchId?: number,
  stockQuantity: number = 0,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Validate required fields
    const validationErrors = validateProductData(productData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    // ------------------- PRODUCT -------------------
    productData.code =
      productData.code || (await generatePrefixedId("product", "PROD"));
    productData.created_by = userId;
    productData.status = productData.status || "A";

    const productInfo = {
      code: productData.code,
      name: productData.name,
      slug: slugify(productData.name),
      uom_id: productData.uom_id!,
      cost_price: productData.cost_price!,
      regular_price: productData.regular_price!, // Added regular_price from Excel
      selling_price: productData.selling_price!,
      status: productData.status,
      created_by: productData.created_by,
    };

    const product = await productModel.create(productInfo);

    // ------------------- CATEGORIES -------------------
    if (productData.categories && productData.categories.length > 0) {
      for (const cat of productData.categories) {
        try {
          const catRecord = await getOrCreateCategory(cat.name, userId);

          if (!catRecord || !catRecord.id) {
            console.warn(
              `Skipping category "${cat.name}" - could not get/create`,
            );
            continue;
          }

          await productCategoryModel.create({
            product_id: product.id,
            category_id: catRecord.id,
            is_primary: cat.is_primary || false,
            created_by: userId,
          });
        } catch (catError) {
          console.error(`Error processing category "${cat.name}":`, catError);
        }
      }
    }

    // ------------------- VARIANTS -------------------
    const variantsToCreate =
      productData.variants && productData.variants.length > 0
        ? productData.variants
        : [
            {
              name: productData.name,
              additional_price: 0,
              images: [],
            },
          ];

    for (const v of variantsToCreate) {
      const variantData = {
        code: await generatePrefixedId("product_variant", "VAR"),
        product_id: product.id,
        name: v.name,
        additional_price: v.additional_price || 0,
        status: v.status || "A",
        created_by: userId,
        weight: v.weight ?? null,
        weight_unit: v.weight_unit ?? null,
        is_replaceable: v.is_replaceable ?? false,
        SKU: v.SKU ?? null,
      };

      const variant = await productVariantModel.create(variantData);

      // ------------------- BARCODE -------------------
      const barcode = await generateRandomBarcode(variantData.code);
      await productBarcodeModel.create({
        product_variant_id: variant.id,
        barcode,
        type: "EAN13",
        is_primary: true,
        status: "A",
        created_by: userId,
      });

      // ------------------- INVENTORY STOCK -------------------
      if (branchId && stockQuantity > 0) {
        const stockCheck = await client.query(
          `SELECT id FROM inventory_stock 
           WHERE branch_id = $1 AND product_variant_id = $2`,
          [branchId, variant.id],
        );

        if (stockCheck.rows.length > 0) {
          await client.query(
            `UPDATE inventory_stock 
             SET quantity = quantity + $1 
             WHERE branch_id = $2 AND product_variant_id = $3`,
            [stockQuantity, branchId, variant.id],
          );
        } else {
          await client.query(
            `INSERT INTO inventory_stock (branch_id, product_variant_id, quantity) 
             VALUES ($1, $2, $3)`,
            [branchId, variant.id, stockQuantity],
          );
        }
      }

      // ------------------- IMAGES -------------------
      if (v.images && v.images.length > 0) {
        for (const img of v.images) {
          await productImageModel.create({
            code: await generatePrefixedId("product_image", "IMG"),
            product_variant_id: variant.id,
            url: img.url,
            alt_text: img.alt_text || "Product Image",
            is_primary: img.is_primary || false,
            status: "A",
            created_by: userId,
          });
        }
      }
    }

    await client.query("COMMIT");
    return product;
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ------------------- BULK PREVIEW -------------------
export async function bulkProductPreview(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const file = await req.file();
    if (!file) throw new Error("No file uploaded");

    const rows = await parseFile(file);

    const validRows = rows.filter(
      (row) =>
        row &&
        Object.keys(row).length > 0 &&
        (row.product_name || row.variant_name || row.uom),
    );

    const preview: ProductPreview[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.product_name)
        errors.push({ row: rowNum, error: "Product name required" });
      if (!row.variant_name)
        errors.push({ row: rowNum, error: "Variant name required" });
      if (!row.uom)
        errors.push({
          row: rowNum,
          error: "UOM (Unit of Measurement) required",
        });
      if (
        (!row.cost_price && row.cost_price !== 0) ||
        isNaN(parseFloat(row.cost_price))
      )
        errors.push({ row: rowNum, error: "Valid cost price required" });
      if (
        (!row.regular_price && row.regular_price !== 0) ||
        isNaN(parseFloat(row.regular_price))
      )
        errors.push({ row: rowNum, error: "Valid regular price required" });
      if (
        (!row.selling_price && row.selling_price !== 0) ||
        isNaN(parseFloat(row.selling_price))
      )
        errors.push({ row: rowNum, error: "Valid selling price required" });

      // Parse numeric values
      const cost_price = row.cost_price ? parseFloat(row.cost_price) : null;
      const regular_price = row.regular_price
        ? parseFloat(row.regular_price)
        : null;
      const selling_price = row.selling_price
        ? parseFloat(row.selling_price)
        : null;
      const additional_price = parseFloat(row.additional_price) || 0;
      const weight = row.weight ? parseFloat(row.weight) : undefined;
      const stock_quantity = row.stock_quantity
        ? parseFloat(row.stock_quantity)
        : 0;

      // Parse images
      const images =
        row.images && typeof row.images === "string"
          ? (row.images as string)
              .split(",")
              .map((url: string, idx: number) => ({
                url: url.trim(),
                alt_text: `Image ${idx + 1}`,
                is_primary: idx === 0,
              }))
          : [];

      preview.push({
        row: rowNum,
        product_name: String(row.product_name).trim(),
        category: row.category ? String(row.category).trim() : "",
        uom_name: String(row.uom).trim(),
        cost_price,
        regular_price,
        selling_price,
        stock_quantity,
        variant: {
          name: String(row.variant_name).trim(),
          additional_price,
          SKU: row.SKU ? String(row.SKU).trim() : undefined,
          weight: weight,
          weight_unit: row.weight_unit
            ? String(row.weight_unit).trim()
            : undefined,
          images,
        },
      });
    }

    reply.send({
      preview,
      errors,
      total: validRows.length,
      valid: preview.length - errors.length,
      message:
        errors.length > 0
          ? "Some rows have validation errors"
          : "All rows valid",
    });
  } catch (err: any) {
    console.error("Preview error:", err);
    reply.status(400).send({
      success: false,
      message: err.message || "Error processing file",
    });
  }
}

// ------------------- BULK CONFIRM -------------------
export async function bulkProductConfirm(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const body = req.body as { products: any[]; branch_code?: string };

    if (!body || !body.products || !Array.isArray(body.products)) {
      return reply.status(400).send({
        success: false,
        message: "Invalid request body. Expected { products: [] }",
      });
    }

    if (body.products.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "No products to create",
      });
    }

    const createdProducts: any[] = [];
    const failedProducts: { product: string; error: string; row?: number }[] =
      [];

    const userId = (req.user as { id: number } | null)?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: "User not authenticated",
      });
    }

    let branchId = null;
    const branchCode = body.branch_code || (req.user as any)?.branch_code;

    if (branchCode) {
      const branchResult = await client.query(
        "SELECT id FROM branch WHERE code = $1 AND status = 'A'",
        [branchCode],
      );
      if (branchResult.rows.length === 0) {
        return reply.status(400).send({
          success: false,
          message: `Branch with code "${branchCode}" not found`,
        });
      }
      branchId = branchResult.rows[0].id;
    } else {
      const defaultBranch = await client.query(
        "SELECT id FROM branch WHERE is_default = true AND status = 'A' LIMIT 1",
      );
      if (defaultBranch.rows.length === 0) {
        return reply.status(400).send({
          success: false,
          message: "No branch specified and no default branch found",
        });
      }
      branchId = defaultBranch.rows[0].id;
    }

    for (let i = 0; i < body.products.length; i++) {
      const prod = body.products[i];
      const rowNum = prod.row || i + 1;

      try {
        if (!prod.product_name) {
          throw new Error("Product name is required");
        }

        if (!prod.uom_name) {
          throw new Error(
            `UOM (Unit of Measurement) is required for product "${prod.product_name}"`,
          );
        }

        if (
          prod.cost_price === undefined ||
          prod.cost_price === null ||
          isNaN(parseFloat(prod.cost_price))
        ) {
          throw new Error(
            `Valid cost price is required for product "${prod.product_name}"`,
          );
        }

        if (
          prod.regular_price === undefined ||
          prod.regular_price === null ||
          isNaN(parseFloat(prod.regular_price))
        ) {
          throw new Error(
            `Valid regular price is required for product "${prod.product_name}"`,
          );
        }

        if (
          prod.selling_price === undefined ||
          prod.selling_price === null ||
          isNaN(parseFloat(prod.selling_price))
        ) {
          throw new Error(
            `Valid selling price is required for product "${prod.product_name}"`,
          );
        }

        const uomRecord = await getOrCreateUOM(prod.uom_name, userId);
        if (!uomRecord) {
          throw new Error(`Could not find or create UOM "${prod.uom_name}"`);
        }

        const categories = [];
        if (prod.category && prod.category.trim() !== "") {
          const categoryRecord = await getOrCreateCategory(
            prod.category,
            userId,
          );
          if (categoryRecord) {
            categories.push({
              name: prod.category,
              is_primary: true,
            });
          }
        }

        const stockQuantity = parseFloat(prod.stock_quantity) || 0;

        const variant: Variant = {
          name: prod.variant_name || prod.product_name,
          additional_price: parseFloat(prod.additional_price) || 0,
          SKU: prod.SKU || undefined,
          weight: prod.weight ? parseFloat(prod.weight) : undefined,
          weight_unit: prod.weight_unit || undefined,
          images: prod.images || [],
        };

        const productData: ProductData = {
          name: prod.product_name,
          slug: slugify(prod.product_name),
          uom_id: uomRecord.id,
          cost_price: parseFloat(prod.cost_price),
          regular_price: parseFloat(prod.regular_price), // Added regular_price
          selling_price: parseFloat(prod.selling_price),
          categories: categories,
          variants: [variant],
          status: "A",
        };

        const product = await createProductInternal(
          productData,
          userId,
          branchId,
          stockQuantity,
        );

        createdProducts.push({
          id: product.id,
          code: product.code,
          name: product.name,
          variant: variant.name,
          cost_price: productData.cost_price,
          regular_price: productData.regular_price,
          selling_price: productData.selling_price,
          stock_added: stockQuantity,
          branch: branchCode || "default",
        });
      } catch (err: any) {
        console.error(`Error creating product row ${rowNum}:`, err);
        failedProducts.push({
          product: prod.product_name || `Row ${rowNum}`,
          error: err.message,
          row: rowNum,
        });
      }
    }

    await client.query("COMMIT");

    reply.send({
      success: true,
      message: `Successfully created ${createdProducts.length} products`,
      created_count: createdProducts.length,
      failed_count: failedProducts.length,
      createdProducts,
      failedProducts,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Unexpected error in bulkProductConfirm:", err);
    reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    client.release();
  }
}
