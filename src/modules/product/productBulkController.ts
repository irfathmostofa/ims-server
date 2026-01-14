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
  productCatModel,
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
  uom_id?: number | null;
  cost_price?: number | string | null;
  selling_price?: number | string | null;
};

// ------------------- HELPER: parse CSV / XLSX -------------------
async function parseFile(file: any): Promise<any[]> {
  const buffer = await file.toBuffer();
  const filename = file.filename || file.filepath;

  if (filename.endsWith(".csv")) {
    const csvString = buffer.toString("utf-8");
    const parsed = parse(csvString, { header: true });
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

// ------------------- HELPER: GET OR CREATE CATEGORY -------------------
// ------------------- HELPER: GET OR CREATE CATEGORY -------------------
// Alternative if findByField has issues:
async function getOrCreateCategory(name: string, userId: number) {
  if (!name || name.trim() === "") return null;

  const trimmedName = name.trim();
  const client = await pool.connect();

  try {
    // Use raw query to find category
    const findQuery = "SELECT * FROM category WHERE name = $1 LIMIT 1";
    const findResult = await client.query(findQuery, [trimmedName]);

    if (findResult.rows.length > 0) {
      return findResult.rows[0];
    }

    // Create new category
    const code = await generatePrefixedId("category", "PCAT");
    const insertQuery = `
      INSERT INTO category (code, name, created_by) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      code,
      trimmedName,
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
  if (data.selling_price === undefined || data.selling_price === null)
    errors.push("Selling price is required");

  return errors;
}

// ------------------- CREATE PRODUCT (USED INTERNALLY) -------------------
export async function createProductInternal(
  productData: ProductData,
  userId: number
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
              `Skipping category "${cat.name}" - could not get/create`
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
          // Continue with other categories
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
        weight: v.weight || null,
        weight_unit: v.weight_unit || null,
        is_replaceable: v.is_replaceable || false,
        SKU: v.SKU || null,
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

      // ------------------- IMAGES -------------------
      for (const img of v.images || []) {
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
// Add UOM validation and category ID resolution
export async function bulkProductPreview(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const file = await req.file();
    if (!file) throw new Error("No file uploaded");

    const rows = await parseFile(file);

    const preview: ProductPreview[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.product_name)
        errors.push({ row: rowNum, error: "Product name required" });
      if (!row.variant_name)
        errors.push({ row: rowNum, error: "Variant name required" });
      if (!row.uom_id && row.uom_id !== 0)
        errors.push({ row: rowNum, error: "UOM ID required" });
      if (!row.cost_price && row.cost_price !== 0)
        errors.push({ row: rowNum, error: "Cost price required" });
      if (!row.selling_price && row.selling_price !== 0)
        errors.push({ row: rowNum, error: "Selling price required" });

      // Check if UOM exists
      if (row.uom_id) {
        const uomExists = await pool.query("SELECT id FROM uom WHERE id = $1", [
          parseInt(row.uom_id),
        ]);
        if (uomExists.rows.length === 0) {
          errors.push({
            row: rowNum,
            error: `UOM ID ${row.uom_id} does not exist`,
          });
        }
      }

      // Parse numeric values
      const uom_id = row.uom_id ? parseInt(row.uom_id) : null;
      const cost_price = row.cost_price ? parseFloat(row.cost_price) : null;
      const selling_price = row.selling_price
        ? parseFloat(row.selling_price)
        : null;
      const additional_price = parseFloat(row.additional_price) || 0;
      const weight = row.weight ? parseFloat(row.weight) : null;

      // Parse images
      const images = row.images
        ? (row.images as string).split(",").map((url: string) => ({
            url: url.trim(),
            alt_text: `Image ${url.trim().substring(0, 10)}...`,
            is_primary: false,
          }))
        : [];

      // Add first image as primary if exists
      if (images.length > 0) {
        images[0].is_primary = true;
      }

      preview.push({
        row: rowNum,
        product_name: row.product_name,
        category: row.category || "",
        uom_id,
        cost_price,
        selling_price,
        variant: {
          name: row.variant_name,
          additional_price,
          SKU: row.SKU || undefined,
          weight: row.weight,
          weight_unit: row.weight_unit || undefined,
          images,
        },
      });
    }

    reply.send({
      preview,
      errors,
      total: rows.length,
      valid: preview.length - errors.length,
    });
  } catch (err: any) {
    console.error("Preview error:", err);
    reply.status(400).send({
      success: false,
      message: err.message || "Error processing file",
    });
  }
}

// productBulkController.ts - Update bulkProductConfirm function

// productBulkController.ts - Updated bulkProductConfirm function

export async function bulkProductConfirm(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const body = req.body as { products: any[] };

    if (!body) {
      console.error("ERROR: No request body");
      return reply.status(400).send({
        success: false,
        message: "Request body is required",
      });
    }

    if (!body.products || !Array.isArray(body.products)) {
      console.error("ERROR: Invalid products array", body.products);
      return reply.status(400).send({
        success: false,
        message: "Invalid request body. Expected { products: [] }",
      });
    }

    if (body.products.length === 0) {
      console.error("ERROR: Empty products array");
      return reply.status(400).send({
        success: false,
        message: "No products to create",
      });
    }

    const createdProducts: any[] = [];
    const failedProducts: { product: string; error: string; row?: number }[] =
      [];

    // Get user ID from request
    const userId = (req.user as { id: number } | null)?.id;

    if (!userId) {
      return reply.status(400).send({
        success: false,
        message: "User ID is required",
      });
    }

    for (let i = 0; i < body.products.length; i++) {
      const prod = body.products[i];

      try {
        // Validate product data
        if (!prod.name && !prod.product_name) {
          throw new Error("Product name is required");
        }

        const productName = prod.name || prod.product_name;

        if (prod.uom_id === undefined || prod.uom_id === null) {
          throw new Error(`UOM ID is required for product "${productName}"`);
        }

        // Check if UOM exists
        const uomExists = await client.query(
          "SELECT id FROM uom WHERE id = $1",
          [Number(prod.uom_id)]
        );

        if (uomExists.rows.length === 0) {
          throw new Error(
            `UOM ID ${prod.uom_id} does not exist for product "${productName}"`
          );
        }

        if (prod.cost_price === undefined || prod.cost_price === null) {
          throw new Error(
            `Cost price is required for product "${productName}"`
          );
        }

        if (prod.selling_price === undefined || prod.selling_price === null) {
          throw new Error(
            `Selling price is required for product "${productName}"`
          );
        }

        // Resolve categories
        const categories = [];
        if (prod.categories && Array.isArray(prod.categories)) {
          for (const cat of prod.categories) {
            if (cat.name && cat.name.trim() !== "") {
              const categoryRecord = await getOrCreateCategory(
                cat.name,
                userId
              );
              if (categoryRecord) {
                categories.push({
                  name: cat.name,
                  is_primary: cat.is_primary || false,
                });
              }
            }
          }
        } else if (prod.category && prod.category.trim() !== "") {
          const categoryRecord = await getOrCreateCategory(
            prod.category,
            userId
          );
          if (categoryRecord) {
            categories.push({
              name: prod.category,
              is_primary: true,
            });
          }
        }

        const productData: ProductData = {
          name: productName,
          slug: slugify(productName),
          uom_id: Number(prod.uom_id),
          cost_price: Number(prod.cost_price),
          selling_price: Number(prod.selling_price),
          categories: categories,
          variants:
            prod.variants || (prod.variant ? [prod.variant] : undefined),
          status: prod.status || "A",
        };

        const product = await createProductInternal(productData, userId);

        createdProducts.push({
          id: product.id,
          code: product.code,
          name: product.name,
        });
      } catch (err: any) {
        console.error(`Error creating product ${i + 1}:`, err);
        failedProducts.push({
          product: prod.name || prod.product_name || `Product ${i + 1}`,
          error: err.message,
          row: i + 1,
        });
      }
    }

    await client.query("COMMIT");

    reply.send({
      success: true,
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
