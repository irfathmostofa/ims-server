import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import {
  generatePrefixedId,
  generateRandomBarcode,
  slugify,
} from "../../core/models/idGenerator";
import {
  brandModel,
  productBarcodeModel,
  productCategoryModel,
  productCatModel,
  productEnquiriesModel,
  productImageModel,
  productModel,
  productReviewImageModel,
  productReviewModel,
  productVariantModel,
  UomModel,
} from "./product.model";
import pool from "../../config/db";
import { EmailService } from "../../core/services/emailService";

// ========== Product Category ==========
export async function createProductCat(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const fields = req.body as Record<string, any>;
    fields.created_by = (req.user as { id: number }).id;

    fields.code = await generatePrefixedId("category", "PCAT");
    if (!fields.slug || fields.slug.trim() === "") {
      fields.slug = slugify(fields.name);
    }
    const newData = await productCatModel.create(fields);
    reply.send(
      successResponse(newData, "Product Category created successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductCat(req: FastifyRequest, reply: FastifyReply) {
  try {
    // 1️⃣ Get all categories
    const categories = await productCatModel.findAll("id ASC");

    // 2️⃣ Create a map to store categories by id
    const map: Record<number, any> = {};
    categories.forEach((cat: any) => {
      map[cat.id] = { ...cat, children: [] };
    });

    // 3️⃣ Build the nested structure
    const tree: any[] = [];
    categories.forEach((cat: any) => {
      if (cat.parent_id) {
        if (map[cat.parent_id]) {
          map[cat.parent_id].children.push(map[cat.id]);
        }
      } else {
        tree.push(map[cat.id]);
      }
    });

    // 4️⃣ Send response
    reply.send(successResponse(tree));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getFilterCategories(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { category_ids } = req.body as {
      category_ids?: number[];
    };

    // Validate category_ids
    if (
      !category_ids ||
      !Array.isArray(category_ids) ||
      category_ids.length === 0
    ) {
      return reply.status(400).send({
        success: false,
        message: "category_ids must be a non-empty array",
      });
    }

    // Remove duplicates
    const uniqueCategoryIds = [...new Set(category_ids)];

    // Simple query to get categories with their products
    const query = `
      SELECT 
        c.id,
        c.code,
        c.name,
        c.slug,
        c.image,
        c.status,
        c.parent_id,
        c.created_at,
        c.updated_at,
        (
          SELECT json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'slug', p.slug,
              'code', p.code,
              'selling_price', p.selling_price,
              'regular_price', p.regular_price,
              'status', p.status
            )
          )
          FROM product_categories pc
          JOIN product p ON pc.product_id = p.id
          WHERE pc.category_id = c.id
            AND p.status = 'A'
        ) AS products,
        (
          SELECT COUNT(DISTINCT pc.product_id)
          FROM product_categories pc
          WHERE pc.category_id = c.id
        ) AS total_products
      FROM category c
      WHERE c.id = ANY($1::int[])
        AND c.status = 'A'
      ORDER BY c.name;
    `;

    const result = await pool.query(query, [uniqueCategoryIds]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "No categories found with the provided IDs",
      });
    }

    reply.send(
      successResponse(
        {
          categories: result.rows,
          summary: {
            total_categories: result.rows.length,
            total_products: result.rows.reduce(
              (sum, cat) => sum + parseInt(cat.total_products),
              0,
            ),
          },
        },
        "Filter categories retrieved successfully",
      ),
    );
  } catch (err: any) {
    console.error("Error in getFilterCategories:", err);
    reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
export async function updateProductCat(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    fields.updated_by = (req.user as { id: number }).id;
    const updated = await productCatModel.update(id, fields);
    reply.send(
      successResponse(updated, "Product Category updated successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductCat(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await productCatModel.delete(id);
    reply.send(
      successResponse(deleted, "Product Category deleted successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function CreateBrand(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.created_by = (req.user as { id: number }).id;

    fields.code = await generatePrefixedId("brand", "BRAND");
    if (!fields.slug || fields.slug.trim() === "") {
      fields.slug = slugify(fields.name);
    }
    const newData = await brandModel.create(fields);
    reply.send(successResponse(newData, "Brand created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getBrand(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await brandModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateBrand(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    fields.updated_by = (req.user as { id: number }).id;
    const updated = await brandModel.update(id, fields);
    reply.send(successResponse(updated, "Brand updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteBrand(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await brandModel.delete(id);
    reply.send(successResponse(deleted, "Brand deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
// ==========  UOM ==========
export async function createUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("uom", "UOM");
    fields.created_by = (req.user as { id: number }).id;
    const newData = await UomModel.create(fields);
    reply.send(
      successResponse(newData, "Unit Of masurement created successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await UomModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    fields.updated_by = (req.user as { id: number }).id;
    const updated = await UomModel.update(id, fields);
    reply.send(
      successResponse(updated, "Unit Of masurement updated successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await UomModel.delete(id);
    reply.send(
      successResponse(deleted, "Unit Of masurement deleted successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PRODUCT CRUD ==========

export async function createProduct(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      categories = [],
      variants = [],
      ...productData
    } = req.body as Record<string, any>;

    // Get user ID safely
    const userId = (req.user as { id: number } | null)?.id;

    // Create product
    productData.code = await generatePrefixedId("product", "PROD");
    productData.slug = slugify(productData.name);
    productData.created_by = userId;
    if (!productData.status) productData.status = "A";

    const product = await productModel.create(productData);

    // Create categories
    for (const cat of categories) {
      await productCategoryModel.create({
        product_id: product.id,
        category_id: cat.id,
        is_primary: cat.is_primary || false,
        created_by: userId,
      });
    }

    // Create variants + auto barcodes
    const variantsToCreate =
      variants && variants.length > 0
        ? variants
        : [
            {
              name: productData.name,
              additional_price: 0,
              images: [],
            },
          ];

    for (const v of variantsToCreate) {
      // Prepare variant data
      const variantData = {
        code: await generatePrefixedId("product_variant", "VAR"),
        product_id: product.id,
        name: v.name || productData.name,
        additional_price: v.additional_price ?? 0,
        status: v.status || "A",
        created_by: userId,
        weight: v.weight || null,
        weight_unit: v.weight_unit || null,
        is_replaceable: v.is_replaceable || false,
        SKU: v.SKU || null,
      };

      const variant = await productVariantModel.create(variantData);

      // Auto-generate barcode for this variant
      const generatedBarcode = await generateRandomBarcode(variantData.code);
      await productBarcodeModel.create({
        product_variant_id: variant.id,
        barcode: generatedBarcode,
        type: "EAN13",
        is_primary: true,
        status: "A",
        created_by: userId,
      });

      // Create images for THIS SPECIFIC variant
      const variantImages = v.images || [];
      for (const img of variantImages) {
        const imgData = {
          code: await generatePrefixedId("product_image", "IMG"),
          product_variant_id: variant.id,
          url: img.url,
          alt_text: img.alt_text || "Product Image",
          is_primary: img.is_primary || false,
          status: "A",
          created_by: userId,
        };
        await productImageModel.create(imgData);
      }
    }

    await client.query("COMMIT");
    reply.send(successResponse(product, "Product created successfully"));
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function bulkCreateProducts(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { products } = req.body as { products: Record<string, any>[] };
    const created: any[] = [];

    for (const p of products) {
      p.code = await generatePrefixedId("product", "PROD");
      p.slug = slugify(p.name);
      // if (req.user?.id) p.created_by = req.user.id;
      p.created_by = (req.user as { id: number }).id;

      const product = await productModel.create(p);
      created.push(product);
    }

    await client.query("COMMIT");
    reply.send(successResponse(created, "Bulk products created successfully"));
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function getAllProducts(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { page, limit, status, price_min, price_max, category_id, search } =
      req.body as {
        page?: number;
        limit?: number;
        status?: string;
        category_id?: number;
        search?: string;
        price_min?: number;
        price_max?: number;
      };

    // Validate price range if both are provided
    if (
      price_min !== undefined &&
      price_max !== undefined &&
      price_min > price_max
    ) {
      return reply.status(400).send({
        success: false,
        message: "price_min cannot be greater than price_max",
      });
    }

    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.max(1, Math.min(limit || 10, 100)); // Limit to max 100 per page
    const offset = (pageNum - 1) * limitNum;

    // Main query with CTE for better performance and filtering
    let query = `
      WITH product_aggregates AS (
        SELECT 
          p.id,
          p.code,
          p.name,
           p.slug,
          p.description,
          p.cost_price,
          p.selling_price,
          p.regular_price,
          p.status,
          p.uom_id,
          p.created_at,
          COALESCE(SUM(DISTINCT inv.quantity), 0) AS total_stock,
          COALESCE(SUM(oio.subtotal), 0) AS total_sales
        FROM product p
        LEFT JOIN product_variant pv ON p.id = pv.product_id AND pv.status = 'A'
        LEFT JOIN inventory_stock inv ON pv.id = inv.product_variant_id
        LEFT JOIN order_item_online oio ON pv.id = oio.product_variant_id
        WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (status && status !== "") {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Price filters (can be used independently)
    if (price_min !== undefined) {
      query += ` AND p.selling_price >= $${paramIndex}`;
      params.push(price_min);
      paramIndex++;
    }

    if (price_max !== undefined) {
      query += ` AND p.selling_price <= $${paramIndex}`;
      params.push(price_max);
      paramIndex++;
    }

    // Apply category filter if needed
    if (category_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM product_categories pc 
        WHERE pc.product_id = p.id AND pc.category_id = $${paramIndex}
      )`;
      params.push(category_id);
      paramIndex++;
    }

    // Search filter
    if (search && search !== "") {
      query += ` AND (
        p.name ILIKE $${paramIndex} 
        OR p.description ILIKE $${paramIndex}
        OR p.code ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
        GROUP BY p.id
      ),
      filtered_products AS (
        SELECT DISTINCT pa.*
        FROM product_aggregates pa
        WHERE 1=1
    `;

    // Apply category filter again if search was used (to maintain consistency)
    if (category_id && search && search !== "") {
      query += ` AND EXISTS (
        SELECT 1 FROM product_categories pc 
        WHERE pc.product_id = pa.id AND pc.category_id = $${paramIndex}
      )`;
      params.push(category_id);
      paramIndex++;
    }

    query += `
      )
      SELECT 
        fp.id,
        fp.code,
        fp.name,
        fp.slug,
        fp.description,
        fp.cost_price,
        fp.selling_price,
        fp.regular_price,
        fp.status,
        u.name AS uom_name,
        pi.images,
        cat.categories,
        fp.total_stock,
        CASE 
          WHEN fp.created_at >= NOW() - INTERVAL '10 days' THEN 'New'
          ELSE NULL
        END AS badge,
        r.rating,
        r.review_count,
        fp.total_sales,
        pv.primary_variant_id
      FROM filtered_products fp
      LEFT JOIN uom u ON fp.uom_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (product_id)
          product_id,
          id AS primary_variant_id
        FROM product_variant
        WHERE status = 'A'
        ORDER BY product_id, id ASC
      ) pv ON fp.id = pv.product_id
      LEFT JOIN (
        SELECT 
          pv.product_id,
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'variant_id', pi.product_variant_id
            ) ORDER BY pi.is_primary DESC, pi.id
          ) AS images
        FROM product_image pi
        JOIN product_variant pv ON pi.product_variant_id = pv.id
        WHERE pi.status = 'A' AND pv.status = 'A'
        GROUP BY pv.product_id
      ) pi ON fp.id = pi.product_id
      LEFT JOIN (
        SELECT 
          pc.product_id,
          json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'code', c.code,
              'image', c.image,
              'is_primary', pc.is_primary
            ) ORDER BY pc.is_primary DESC, c.id
          ) AS categories
        FROM product_categories pc
        JOIN category c ON pc.category_id = c.id
        WHERE c.status = 'A'
        GROUP BY pc.product_id
      ) cat ON fp.id = cat.product_id
      LEFT JOIN (
        SELECT 
          product_id,
          ROUND(COALESCE(AVG(rating), 0)::NUMERIC, 1) AS rating,
          COUNT(DISTINCT id) AS review_count
        FROM product_review
        GROUP BY product_id
      ) r ON fp.id = r.product_id
      ORDER BY fp.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitNum, offset);

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM product p
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    // Apply same filters to count query
    if (status && status !== "") {
      countQuery += ` AND p.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (price_min !== undefined) {
      countQuery += ` AND p.selling_price >= $${countParamIndex}`;
      countParams.push(price_min);
      countParamIndex++;
    }

    if (price_max !== undefined) {
      countQuery += ` AND p.selling_price <= $${countParamIndex}`;
      countParams.push(price_max);
      countParamIndex++;
    }

    if (category_id) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM product_categories pc 
        WHERE pc.product_id = p.id AND pc.category_id = $${countParamIndex}
      )`;
      countParams.push(category_id);
      countParamIndex++;
    }

    if (search && search !== "") {
      countQuery += ` AND (
        p.name ILIKE $${countParamIndex} 
        OR p.description ILIKE $${countParamIndex}
        OR p.code ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    // Execute both queries in parallel
    const [productsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const products = productsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    reply.send(
      successResponse(
        {
          data: products,
          pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
        },
        "Products retrieved successfully",
      ),
    );
  } catch (err: any) {
    console.error("Error in getAllProducts:", err);
    reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
export async function getAllProductsCategory(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const {
      page,
      limit,
      status,
      price_min,
      price_max,
      category_ids,
      category_match_type,
      search,
    } = req.body as {
      page?: number;
      limit?: number;
      status?: string;
      category_ids?: number[];
      category_match_type?: "ANY" | "ALL"; // ANY: product in any category, ALL: product in all categories
      search?: string;
      price_min?: number;
      price_max?: number;
    };

    // Validate price range if both are provided
    if (
      price_min !== undefined &&
      price_max !== undefined &&
      price_min > price_max
    ) {
      return reply.status(400).send({
        success: false,
        message: "price_min cannot be greater than price_max",
      });
    }

    // Validate category_ids if provided
    if (category_ids && !Array.isArray(category_ids)) {
      return reply.status(400).send({
        success: false,
        message: "category_ids must be an array",
      });
    }

    // Remove duplicates from category_ids
    const uniqueCategoryIds = category_ids
      ? [...new Set(category_ids)].filter((id) => !isNaN(id) && id > 0)
      : [];

    // Validate category_match_type
    const matchType = category_match_type || "ANY";
    if (!["ANY", "ALL"].includes(matchType)) {
      return reply.status(400).send({
        success: false,
        message: "category_match_type must be either 'ANY' or 'ALL'",
      });
    }

    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.max(1, Math.min(limit || 10, 100));
    const offset = (pageNum - 1) * limitNum;

    // Main query with CTE for better performance
    let query = `
      WITH product_aggregates AS (
        SELECT 
          p.id,
          p.code,
          p.name,
          p.slug,
          p.description,
          p.cost_price,
          p.selling_price,
          p.regular_price,
          p.status,
          p.uom_id,
          p.created_at,
          COALESCE(SUM(DISTINCT inv.quantity), 0) AS total_stock,
          COALESCE(SUM(oio.subtotal), 0) AS total_sales,
          ARRAY_AGG(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL) AS category_ids
        FROM product p
        LEFT JOIN product_variant pv ON p.id = pv.product_id AND pv.status = 'A'
        LEFT JOIN inventory_stock inv ON pv.id = inv.product_variant_id
        LEFT JOIN order_item_online oio ON pv.id = oio.product_variant_id
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (status && status !== "") {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Price filters
    if (price_min !== undefined) {
      query += ` AND p.selling_price >= $${paramIndex}`;
      params.push(price_min);
      paramIndex++;
    }

    if (price_max !== undefined) {
      query += ` AND p.selling_price <= $${paramIndex}`;
      params.push(price_max);
      paramIndex++;
    }

    // Category filter - handle multiple category IDs
    if (uniqueCategoryIds.length > 0) {
      if (matchType === "ALL") {
        // Product must be in ALL specified categories
        query += ` AND NOT EXISTS (
          SELECT 1
          FROM unnest($${paramIndex}::int[]) required_cat_id
          WHERE NOT EXISTS (
            SELECT 1 
            FROM product_categories pc2 
            WHERE pc2.product_id = p.id 
            AND pc2.category_id = required_cat_id
          )
        )`;
        params.push(uniqueCategoryIds);
        paramIndex++;
      } else {
        // Product must be in ANY of the specified categories (default)
        query += ` AND EXISTS (
          SELECT 1 
          FROM product_categories pc2 
          WHERE pc2.product_id = p.id 
          AND pc2.category_id = ANY($${paramIndex}::int[])
        )`;
        params.push(uniqueCategoryIds);
        paramIndex++;
      }
    }

    // Search filter
    if (search && search !== "") {
      query += ` AND (
        p.name ILIKE $${paramIndex} 
        OR p.description ILIKE $${paramIndex}
        OR p.code ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
        GROUP BY p.id, p.code, p.name, p.slug, p.description, 
                 p.cost_price, p.selling_price, p.regular_price, 
                 p.status, p.uom_id, p.created_at
      ),
      filtered_products AS (
        SELECT *
        FROM product_aggregates
        WHERE 1=1
    `;

    // Additional filtering for category_ids if needed
    if (uniqueCategoryIds.length > 0 && matchType === "ALL") {
      // This is already handled in the CTE for ALL case, but we can add a safeguard
      query += ` AND category_ids IS NOT NULL`;
    }

    query += `
      )
      SELECT 
        fp.id,
        fp.code,
        fp.name,
        fp.slug,
        fp.description,
        fp.cost_price,
        fp.selling_price,
        fp.regular_price,
        fp.status,
        u.name AS uom_name,
        COALESCE(pi.images, '[]'::json) AS images,
        COALESCE(cat.categories, '[]'::json) AS categories,
        fp.total_stock,
        CASE 
          WHEN fp.created_at >= NOW() - INTERVAL '10 days' THEN 'New'
          ELSE NULL
        END AS badge,
        COALESCE(r.rating, 0) AS rating,
        COALESCE(r.review_count, 0) AS review_count,
        fp.total_sales,
        pv.primary_variant_id
      FROM filtered_products fp
      LEFT JOIN uom u ON fp.uom_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (product_id)
          product_id,
          id AS primary_variant_id
        FROM product_variant
        WHERE status = 'A'
        ORDER BY product_id, id ASC
      ) pv ON fp.id = pv.product_id
      LEFT JOIN (
        SELECT 
          pv.product_id,
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'variant_id', pi.product_variant_id
            ) ORDER BY pi.is_primary DESC, pi.id
          ) AS images
        FROM product_image pi
        JOIN product_variant pv ON pi.product_variant_id = pv.id
        WHERE pi.status = 'A' AND pv.status = 'A'
        GROUP BY pv.product_id
      ) pi ON fp.id = pi.product_id
      LEFT JOIN (
        SELECT 
          pc.product_id,
          json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'code', c.code,
              'image', c.image,
              'is_primary', pc.is_primary
            ) ORDER BY pc.is_primary DESC, c.id
          ) AS categories
        FROM product_categories pc
        JOIN category c ON pc.category_id = c.id
        WHERE c.status = 'A'
        GROUP BY pc.product_id
      ) cat ON fp.id = cat.product_id
      LEFT JOIN (
        SELECT 
          product_id,
          ROUND(COALESCE(AVG(rating), 0)::NUMERIC, 1) AS rating,
          COUNT(DISTINCT id) AS review_count
        FROM product_review
        GROUP BY product_id
      ) r ON fp.id = r.product_id
      ORDER BY fp.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitNum, offset);

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM product p
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    // Apply same filters to count query
    if (status && status !== "") {
      countQuery += ` AND p.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (price_min !== undefined) {
      countQuery += ` AND p.selling_price >= $${countParamIndex}`;
      countParams.push(price_min);
      countParamIndex++;
    }

    if (price_max !== undefined) {
      countQuery += ` AND p.selling_price <= $${countParamIndex}`;
      countParams.push(price_max);
      countParamIndex++;
    }

    // Category filter for count query
    if (uniqueCategoryIds.length > 0) {
      if (matchType === "ALL") {
        countQuery += ` AND NOT EXISTS (
          SELECT 1
          FROM unnest($${countParamIndex}::int[]) required_cat_id
          WHERE NOT EXISTS (
            SELECT 1 
            FROM product_categories pc2 
            WHERE pc2.product_id = p.id 
            AND pc2.category_id = required_cat_id
          )
        )`;
        countParams.push(uniqueCategoryIds);
        countParamIndex++;
      } else {
        countQuery += ` AND EXISTS (
          SELECT 1 
          FROM product_categories pc2 
          WHERE pc2.product_id = p.id 
          AND pc2.category_id = ANY($${countParamIndex}::int[])
        )`;
        countParams.push(uniqueCategoryIds);
        countParamIndex++;
      }
    }

    if (search && search !== "") {
      countQuery += ` AND (
        p.name ILIKE $${countParamIndex} 
        OR p.description ILIKE $${countParamIndex}
        OR p.code ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    // Execute both queries in parallel
    const [productsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const products = productsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    // Add category filter info to response metadata
    const filterMetadata: any = {};
    if (uniqueCategoryIds.length > 0) {
      filterMetadata.categories = {
        ids: uniqueCategoryIds,
        matchType: matchType,
      };
    }

    reply.send(
      successResponse(
        {
          data: products,
          pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
          filters:
            Object.keys(filterMetadata).length > 0 ? filterMetadata : undefined,
        },
        "Products retrieved successfully",
      ),
    );
  } catch (err: any) {
    console.error("Error in getAllProducts:", err);
    reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
export async function getRecentProducts(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { page, limit, days } = req.body as {
      page?: number;
      limit?: number;
      days?: number;
    };

    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.max(1, Math.min(limit || 10, 100));
    const offset = (pageNum - 1) * limitNum;
    const daysFilter = Math.max(1, days || 30); // Default to last 30 days

    // Optimized query for recent products
    const query = `
      WITH recent_products AS (
        SELECT 
          p.id,
          p.code,
          p.name,
          p.slug,
          p.description,
          p.cost_price,
          p.selling_price,
          p.regular_price,
          p.status,
          p.uom_id,
          p.created_at,
          EXTRACT(DAY FROM (NOW() - p.created_at)) AS days_ago,
          COALESCE(SUM(DISTINCT inv.quantity), 0) AS total_stock,
          (
            SELECT pv.id 
            FROM product_variant pv 
            WHERE pv.product_id = p.id 
              AND pv.status = 'A' 
            ORDER BY pv.id 
            LIMIT 1
          ) AS primary_variant_id
        FROM product p
        LEFT JOIN product_variant pv ON p.id = pv.product_id AND pv.status = 'A'
        LEFT JOIN inventory_stock inv ON pv.id = inv.product_variant_id
        WHERE p.status = 'A'
          AND p.created_at >= NOW() - ($1::int || ' days')::interval
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      ),
      product_images AS (
        SELECT 
          pv.product_id,
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary
            ) ORDER BY pi.is_primary DESC, pi.id
          ) AS images
        FROM product_image pi
        JOIN product_variant pv ON pi.product_variant_id = pv.id
        WHERE pi.status = 'A' AND pv.status = 'A'
        GROUP BY pv.product_id
      )
      SELECT 
        rp.*,
        u.name AS uom_name,
        COALESCE(pi.images, '[]'::json) AS images,
        CASE 
          WHEN rp.days_ago <= 10 THEN 'New'
          ELSE NULL
        END AS badge
      FROM recent_products rp
      LEFT JOIN uom u ON rp.uom_id = u.id
      LEFT JOIN product_images pi ON rp.id = pi.product_id
      ORDER BY rp.created_at DESC;
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM product p
      WHERE p.status = 'A'
        AND p.created_at >= NOW() - ($1::int || ' days')::interval;
    `;

    const [productsResult, countResult] = await Promise.all([
      pool.query(query, [daysFilter, limitNum, offset]),
      pool.query(countQuery, [daysFilter]),
    ]);

    const products = productsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    reply.send(
      successResponse(
        {
          data: products,
          pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
        },
        "Recent products retrieved successfully",
      ),
    );
  } catch (err: any) {
    console.error("Error in getRecentProducts:", err);
  }
}
export async function getBestSellingProducts(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { page, limit } = req.body as {
      page?: number;
      limit?: number;
    };

    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.max(1, Math.min(limit || 10, 100));
    const offset = (pageNum - 1) * limitNum;

    // Optimized query for all-time best-selling products
    const query = `
      WITH sales_data AS (
        SELECT 
          p.id,
          p.code,
          p.name,
          p.slug,
          p.description,
          p.cost_price,
          p.selling_price,
          p.regular_price,
          p.status,
          p.uom_id,
          p.created_at,
          (
            SELECT pv.id 
            FROM product_variant pv 
            WHERE pv.product_id = p.id 
              AND pv.status = 'A' 
            ORDER BY pv.id 
            LIMIT 1
          ) AS primary_variant_id,
          COUNT(DISTINCT oio.id) AS total_orders,
          COALESCE(SUM(oio.quantity), 0) AS total_quantity_sold,
          COALESCE(SUM(oio.subtotal), 0) AS total_revenue,
          COALESCE(SUM(DISTINCT inv.quantity), 0) AS total_stock,
          
          RANK() OVER (ORDER BY COALESCE(SUM(oio.quantity), 0) DESC, COALESCE(SUM(oio.subtotal), 0) DESC) AS sales_rank
        FROM product p
        LEFT JOIN product_variant pv ON p.id = pv.product_id AND pv.status = 'A'
        LEFT JOIN order_item_online oio ON pv.id = oio.product_variant_id
        LEFT JOIN order_online oo ON oio.order_id = oo.id AND oo.order_status NOT IN ('CANCELLED', 'REFUNDED')
        LEFT JOIN inventory_stock inv ON pv.id = inv.product_variant_id
        WHERE p.status = 'A'
        GROUP BY p.id
        HAVING COALESCE(SUM(oio.quantity), 0) > 0
        ORDER BY total_quantity_sold DESC, total_revenue DESC
        LIMIT $1 OFFSET $2
      ),
      product_images AS (
        SELECT 
          pv.product_id,
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary
            ) ORDER BY pi.is_primary DESC, pi.id
          ) AS images
        FROM product_image pi
        JOIN product_variant pv ON pi.product_variant_id = pv.id
        WHERE pi.status = 'A' AND pv.status = 'A'
        GROUP BY pv.product_id
      ),
      product_categories_agg AS (
        SELECT 
          pc.product_id,
          json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug
            ) ORDER BY c.id
          ) AS categories
        FROM product_categories pc
        JOIN category c ON pc.category_id = c.id
        WHERE c.status = 'A'
        GROUP BY pc.product_id
      )
      SELECT 
  sd.id,
  sd.code,
  sd.name,
  sd.slug,
  sd.description,
  sd.cost_price,
  sd.selling_price,
  sd.regular_price,
  sd.status,
  sd.primary_variant_id,
  u.name AS uom_name,
  COALESCE(pi.images, '[]'::json) AS images,
  COALESCE(pc.categories, '[]'::json) AS categories,
  sd.total_orders,
  sd.total_quantity_sold,
  sd.total_revenue,
  sd.total_stock,
  sd.sales_rank,
  CASE 
    WHEN sd.total_stock > 0 
    THEN ROUND((sd.total_quantity_sold::DECIMAL / NULLIF(sd.total_stock, 0)) * 100, 2)
    ELSE 0 
  END AS sell_through_rate,
  ROUND(
    CASE 
      WHEN sd.total_quantity_sold > 0 
      THEN (sd.total_revenue / sd.total_quantity_sold)
      ELSE 0 
    END, 2
  ) AS avg_selling_price
FROM sales_data sd
LEFT JOIN uom u ON sd.uom_id = u.id
LEFT JOIN product_images pi ON sd.id = pi.product_id
LEFT JOIN product_categories_agg pc ON sd.id = pc.product_id
ORDER BY sd.sales_rank
    `;

    // Count query for pagination - only products that have been sold
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM product p
      WHERE p.status = 'A'
        AND EXISTS (
          SELECT 1 
          FROM product_variant pv 
          JOIN order_item_online oio ON pv.id = oio.product_variant_id
          JOIN order_online oo ON oio.order_id = oo.id
          WHERE pv.product_id = p.id
            AND oo.order_status NOT IN ('CANCELLED', 'REFUNDED')
        );
    `;

    const [productsResult, countResult] = await Promise.all([
      pool.query(query, [limitNum, offset]),
      pool.query(countQuery),
    ]);

    const products = productsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    reply.send(
      successResponse(
        {
          data: products,
          pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
        },
        "Best-selling products retrieved successfully",
      ),
    );
  } catch (err: any) {
    console.error("Error in getBestSellingProducts:", err);
  }
}

export async function getProductsPOS(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { category_id, search, branch_id } = req.body as {
      category_id?: string;
      search?: string;
      branch_id?: number;
    };

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    conditions.push("p.status = 'A'");
    conditions.push("(pv.status = 'A' OR pv.status IS NULL)");

    if (branch_id) {
      conditions.push(`EXISTS (
        SELECT 1 FROM inventory_stock st 
        WHERE st.product_variant_id = pv.id 
        AND st.branch_id = $${paramIndex}
      )`);
      params.push(branch_id);
      paramIndex++;
    }

    if (category_id && category_id.trim() !== "" && category_id !== "All") {
      const categoryIdNum = parseInt(category_id);
      if (!isNaN(categoryIdNum)) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_categories pc
          WHERE pc.product_id = p.id 
          AND pc.category_id = $${paramIndex}
        )`);
        params.push(categoryIdNum);
        paramIndex++;
      }
    }

    if (search && search.trim() !== "") {
      conditions.push(`(
        p.name ILIKE $${paramIndex} OR
        p.code ILIKE $${paramIndex} OR
        pv.name ILIKE $${paramIndex} OR
        pv.code ILIKE $${paramIndex} OR
        (p.name || ' (' || COALESCE(pv.name, '') || ')') ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM product_barcode pb
          WHERE pb.product_variant_id = pv.id
          AND pb.barcode ILIKE $${paramIndex}
          AND pb.status = 'A'
        )
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        p.id AS product_id,
        pv.id AS variant_id,
        COALESCE(pv.code, p.code) AS code,
        p.name AS product_name,
        pv.name AS variant_name,
        pv.sku,
        pv.weight,
        pv.weight_unit,
        pv.is_replaceable,
        pi_agg.images,
        bc_agg.barcodes,
        bc_agg.primary_barcode,
        CASE
          WHEN pv.name IS NOT NULL AND pv.name != ''
          THEN p.name || ' (' || pv.name || ')'
          ELSE p.name
        END AS display_name,
        p.description,
        (p.selling_price + COALESCE(pv.additional_price, 0)) AS selling_price,
        p.cost_price,
        COALESCE(pv.additional_price, 0) AS additional_price,
        u.symbol AS uom_symbol,
        u.name AS uom_name,
        (
          SELECT STRING_AGG(c.name, ', ')
          FROM product_categories pc
          LEFT JOIN category c ON c.id = pc.category_id
          WHERE pc.product_id = p.id
        ) AS category_name,
        (
          SELECT COALESCE(SUM(st.quantity), 0)
          FROM inventory_stock st
          WHERE st.product_variant_id = pv.id
          ${branch_id ? `AND st.branch_id = $1` : ""}
        ) AS stock_qty,
        p.status,
        pv.status AS variant_status,
        ${
          branch_id
            ? `(SELECT b.name FROM branch b WHERE b.id = $1) AS branch_name,
               $1 AS branch_id`
            : `'All Branches' AS branch_name, NULL AS branch_id`
        }
      FROM product p
      LEFT JOIN uom u ON u.id = p.uom_id
      LEFT JOIN product_variant pv ON pv.product_id = p.id

      -- Images aggregated per product
      LEFT JOIN (
        SELECT
          pv2.product_id,
          json_agg(
            json_build_object(
              'id',         pi.id,
              'url',        pi.url,
              'alt_text',   pi.alt_text,
              'is_primary', pi.is_primary,
              'variant_id', pi.product_variant_id
            ) ORDER BY pi.is_primary DESC, pi.id
          ) AS images
        FROM product_image pi
        JOIN product_variant pv2 ON pi.product_variant_id = pv2.id
        WHERE pi.status = 'A' AND pv2.status = 'A'
        GROUP BY pv2.product_id
      ) pi_agg ON pi_agg.product_id = p.id

      -- Barcodes aggregated per variant
      LEFT JOIN (
        SELECT
          pb.product_variant_id,
          json_agg(
            json_build_object(
              'id',         pb.id,
              'barcode',    pb.barcode,
              'type',       pb.type,
              'is_primary', pb.is_primary
            ) ORDER BY pb.is_primary DESC, pb.id
          ) AS barcodes,
          MAX(CASE WHEN pb.is_primary THEN pb.barcode END) AS primary_barcode
        FROM product_barcode pb
        WHERE pb.status = 'A'
        GROUP BY pb.product_variant_id
      ) bc_agg ON bc_agg.product_variant_id = pv.id

      ${whereClause}
      ORDER BY p.name, pv.name NULLS FIRST
    `;

    const { rows } = await pool.query(query, params);

    return reply.send({
      success: true,
      data: rows,
      count: rows.length,
      filters: {
        category_id: category_id || null,
        branch_id: branch_id || null,
        search: search || null,
      },
    });
  } catch (error) {
    console.error("getProductsPOS error:", error);
    return reply.status(500).send({
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function getProductById(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };

    const query = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.slug,
        p.description,
        p.cost_price,
        p.selling_price,
        p.regular_price,
        p.status,
        p.brand_id,
        u.id AS uom_id,
        u.name AS uom_name,
        u.symbol AS uom_symbol,
        brand.name AS brand_name,

        -- Categories
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', c.id,
              'name', c.name,
              'code', c.code,
              'is_primary', pc.is_primary
            ) ORDER BY pc.is_primary DESC
          )
          FROM product_categories pc
          JOIN category c ON pc.category_id = c.id
          WHERE pc.product_id = p.id AND c.status = 'A'
        ), '[]') AS categories,

        -- Variants with barcodes, images, and stock
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', v.id,
              'code', v.code,
              'name', v.name,
              'additional_price', v.additional_price,
              'status', v.status,
              'barcodes', (
                SELECT COALESCE(JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', b.id,
                    'barcode', b.barcode,
                    'type', b.type,
                    'is_primary', b.is_primary
                  ) ORDER BY b.is_primary DESC
                ), '[]')
                FROM product_barcode b
                WHERE b.product_variant_id = v.id AND b.status = 'A'
              ),
              'images', (
                SELECT COALESCE(JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', i.id,
                    'code', i.code,
                    'url', i.url,
                    'alt_text', i.alt_text,
                    'is_primary', i.is_primary
                  ) ORDER BY i.is_primary DESC, i.id
                ), '[]')
                FROM product_image i
                WHERE i.product_variant_id = v.id AND i.status = 'A'
              ),
              'stock', (
                SELECT COALESCE(SUM(s.quantity), 0)
                FROM inventory_stock s
                WHERE s.product_variant_id = v.id
              )
            ) ORDER BY v.id
          )
          FROM product_variant v
          WHERE v.product_id = p.id AND v.status = 'A'
        ), '[]') AS variants,

        -- Reviews
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', r.id,
              'customer_name', c.full_name,
              'rating', r.rating,
              'title', r.title,
              'comment', r.comment,
              'helpful', r.helpful_count,
              'created_at', r.created_at
            ) ORDER BY r.created_at DESC
          )
          FROM product_review r
          JOIN customer c ON r.customer_id = c.id
          WHERE r.product_id = p.id
        ), '[]') AS reviews,

        -- Review summary
        COALESCE((
          SELECT JSON_BUILD_OBJECT(
            'average_rating', ROUND(AVG(r.rating)::numeric, 1),
            'total_reviews', COUNT(*)
          )
          FROM product_review r
          WHERE r.product_id = p.id
        ), JSON_BUILD_OBJECT('average_rating', 0, 'total_reviews', 0)) AS review_summary,

        -- Total stock across all variants
        COALESCE((
          SELECT SUM(s.quantity)
          FROM inventory_stock s
          JOIN product_variant v ON s.product_variant_id = v.id
          WHERE v.product_id = p.id AND v.status = 'A'
        ), 0) AS total_stock

      FROM product p
      LEFT JOIN uom u ON u.id = p.uom_id
      LEFT JOIN brand ON brand.id = p.brand_id
      WHERE p.id = $1;
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    return reply.send({
      success: true,
      message: "Product retrieved successfully",
      data: rows[0],
    });
  } catch (err: any) {
    console.error(err);
    return reply.status(500).send({
      success: false,
      message: err.message,
    });
  }
}
export async function getProductBySlug(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { slug } = req.params as { slug: string };

    const query = `
      SELECT 
        p.id,
        p.code,
        p.slug,
        p.name,
        p.description,
        p.cost_price,
        p.selling_price,
        p.regular_price,
        p.status,
        u.id AS uom_id,
        u.name AS uom_name,
        u.symbol AS uom_symbol,

        -- Categories
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', c.id,
              'name', c.name,
              'code', c.code,
              'is_primary', pc.is_primary
            ) ORDER BY pc.is_primary DESC
          )
          FROM product_categories pc
          JOIN category c ON pc.category_id = c.id
          WHERE pc.product_id = p.id AND c.status = 'A'
        ), '[]'::json) AS categories,

        -- Variants with barcodes, images, and stock
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', v.id,
              'code', v.code,
              'name', v.name,
              'additional_price', v.additional_price,
              'status', v.status,
              'barcodes', (
                SELECT COALESCE(JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', b.id,
                    'barcode', b.barcode,
                    'type', b.type,
                    'is_primary', b.is_primary
                  ) ORDER BY b.is_primary DESC
                ), '[]'::json)
                FROM product_barcode b
                WHERE b.product_variant_id = v.id AND b.status = 'A'
              ),
              'images', (
                SELECT COALESCE(JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', i.id,
                    'code', i.code,
                    'url', i.url,
                    'alt_text', i.alt_text,
                    'is_primary', i.is_primary
                  ) ORDER BY i.is_primary DESC, i.id
                ), '[]'::json)
                FROM product_image i
                WHERE i.product_variant_id = v.id AND i.status = 'A'
              ),
              'stock', (
                SELECT COALESCE(SUM(s.quantity), 0)
                FROM inventory_stock s
                WHERE s.product_variant_id = v.id
              )
            ) ORDER BY v.id
          )
          FROM product_variant v
          WHERE v.product_id = p.id AND v.status = 'A'
        ), '[]'::json) AS variants,

        -- Reviews with customer info
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', r.id,
              'order_id', r.order_id,
              'variant_id', r.product_id,
              'rating', r.rating,
              'title', r.title,
              'comment', r.comment,
              'helpful_count', r.helpful_count,
              'created_at', r.created_at,
              'customer', JSON_BUILD_OBJECT(
                'id', c.id,
                'name', c.full_name,
                'email', c.email
              ),
              'variant', JSON_BUILD_OBJECT(
                'id', pv.id,
                'name', pv.name,
                'code', pv.code,
                'sku', pv.sku
              ),
              'images', COALESCE((
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', pri.id,
                    'image_url', pri.image_url
                  ) ORDER BY pri.id
                )
                FROM product_review_image pri
                WHERE pri.review_id = r.id
              ), '[]'::json)
            ) ORDER BY r.created_at DESC
          )
          FROM product_review r
          JOIN customer c ON r.customer_id = c.id
          JOIN product_variant pv ON r.product_id = pv.id
          WHERE pv.product_id = p.id
        ), '[]'::json) AS reviews,

        -- Review summary
        COALESCE((
          SELECT JSON_BUILD_OBJECT(
            'average_rating', ROUND(AVG(r.rating)::numeric, 1),
            'total_reviews', COUNT(*),
            'rating_breakdown', JSON_BUILD_OBJECT(
              '5', COUNT(*) FILTER (WHERE r.rating = 5),
              '4', COUNT(*) FILTER (WHERE r.rating = 4),
              '3', COUNT(*) FILTER (WHERE r.rating = 3),
              '2', COUNT(*) FILTER (WHERE r.rating = 2),
              '1', COUNT(*) FILTER (WHERE r.rating = 1)
            )
          )
          FROM product_review r
          JOIN product_variant pv ON r.product_id = pv.id
          WHERE pv.product_id = p.id
        ), JSON_BUILD_OBJECT(
          'average_rating', 0, 
          'total_reviews', 0,
          'rating_breakdown', JSON_BUILD_OBJECT('5', 0, '4', 0, '3', 0, '2', 0, '1', 0)
        )) AS review_summary,

        -- Total stock across all variants
        COALESCE((
          SELECT SUM(s.quantity)
          FROM inventory_stock s
          JOIN product_variant v ON s.product_variant_id = v.id
          WHERE v.product_id = p.id AND v.status = 'A'
        ), 0) AS total_stock

      FROM product p
      LEFT JOIN uom u ON u.id = p.uom_id
      WHERE p.slug = $1;
    `;

    const { rows } = await pool.query(query, [slug]);

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    return reply.send({
      success: true,
      message: "Product retrieved successfully",
      data: rows[0],
    });
  } catch (err: any) {
    console.error(err);
    return reply.status(500).send({
      success: false,
      message: err.message,
    });
  }
}
export async function getProductsByCategorySlug(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { slug } = req.params as { slug: string };

    // First, get the category ID from the slug
    const categoryQuery = `
      SELECT id FROM category 
      WHERE slug = $1 AND status = 'A';
    `;

    const categoryResult = await pool.query(categoryQuery, [slug]);

    if (categoryResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    const categoryId = categoryResult.rows[0].id;

    // Then get all products in this category (including subcategories if needed)
    const query = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.slug,
        p.cost_price,
        p.selling_price,
        p.regular_price,
        p.status,
        p.created_at,
        p.updated_at,
        u.id AS uom_id,
        u.name AS uom_name,
        u.symbol AS uom_symbol,

        -- Get primary image from first variant
        (
          SELECT i.url
          FROM product_image i
          JOIN product_variant v ON i.product_variant_id = v.id
          WHERE v.product_id = p.id 
            AND i.status = 'A' 
            AND i.is_primary = TRUE
          LIMIT 1
        ) AS primary_image,

        -- Categories for each product
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', c.id,
              'name', c.name,
              'code', c.code,
              'slug', c.slug,
              'is_primary', pc.is_primary
            ) ORDER BY pc.is_primary DESC
          )
          FROM product_categories pc
          JOIN category c ON pc.category_id = c.id
          WHERE pc.product_id = p.id AND c.status = 'A'
        ), '[]') AS categories,

        -- Get minimum selling price from variants
        (
          SELECT MIN(v.additional_price + p.selling_price)
          FROM product_variant v
          WHERE v.product_id = p.id AND v.status = 'A'
        ) AS min_price,

        -- Get maximum selling price from variants
        (
          SELECT MAX(v.additional_price + p.selling_price)
          FROM product_variant v
          WHERE v.product_id = p.id AND v.status = 'A'
        ) AS max_price,

        -- Review summary
        COALESCE((
          SELECT JSON_BUILD_OBJECT(
            'average_rating', ROUND(AVG(r.rating)::numeric, 1),
            'total_reviews', COUNT(*)
          )
          FROM product_review r
          WHERE r.product_id = p.id
        ), JSON_BUILD_OBJECT('average_rating', 0, 'total_reviews', 0)) AS review_summary,

        -- Total stock
        COALESCE((
          SELECT SUM(s.quantity)
          FROM inventory_stock s
          JOIN product_variant v ON s.product_variant_id = v.id
          WHERE v.product_id = p.id AND v.status = 'A'
        ), 0) AS total_stock

      FROM product p
      LEFT JOIN uom u ON u.id = p.uom_id
      WHERE p.id IN (
        SELECT DISTINCT pc.product_id
        FROM product_categories pc
        WHERE pc.category_id = $1
      )
      AND p.status = 'A'
      ORDER BY p.created_at DESC;
    `;

    const { rows } = await pool.query(query, [categoryId]);

    return reply.send({
      success: true,
      message: "Products retrieved successfully",
      data: {
        category: categoryResult.rows[0],
        products: rows,
        total: rows.length,
      },
    });
  } catch (err: any) {
    console.error(err);
    return reply.status(500).send({
      success: false,
      message: err.message,
    });
  }
}
export async function updateProduct(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  try {
    const { id } = req.params as { id: string };
    const fields = req.body as Record<string, any>;

    await client.query("BEGIN");

    // Get user ID safely
    const userId = (req.user as { id: number } | null)?.id;

    // ✅ Separate relational fields from main product fields
    const { categories, variants, ...productFields } = fields;

    // 1️⃣ Update main product table
    if (productFields && Object.keys(productFields).length > 0) {
      productFields.updated_by = userId;
      const updatedProduct = await productModel.update(
        parseInt(id),
        productFields,
        client,
      );
      if (!updatedProduct) {
        await client.query("ROLLBACK");
        return reply
          .status(404)
          .send({ success: false, message: "Product not found" });
      }
    }

    // 2️⃣ Update categories
    if (categories && Array.isArray(categories)) {
      // Delete existing categories
      await client.query(
        "DELETE FROM product_categories WHERE product_id = $1",
        [id],
      );

      // Insert new categories
      for (const cat of categories) {
        await productCategoryModel.create(
          {
            product_id: parseInt(id),
            category_id: cat.id,
            is_primary: cat.is_primary || false,
            created_by: userId,
          },
          client,
        );
      }
    }

    // 3️⃣ Update variants (with their images and barcodes)
    if (variants && Array.isArray(variants)) {
      for (const variant of variants) {
        const { images, barcodes, ...variantData } = variant;
        let variantId: number;

        if (variant.id) {
          // Update existing variant
          variantData.updated_by = userId;
          const updatedVariant = await productVariantModel.update(
            variant.id,
            variantData,
            client,
          );
          variantId = variant.id;
        } else {
          // Create new variant
          variantData.code = await generatePrefixedId("product_variant", "VAR");
          variantData.product_id = parseInt(id);
          variantData.created_by = userId;
          variantData.status = variantData.status || "A";

          const newVariant = await productVariantModel.create(
            variantData,
            client,
          );
          variantId = newVariant.id;

          // Auto-generate barcode for new variant
          const generatedBarcode = await generateRandomBarcode(
            variantData.code,
          );
          await productBarcodeModel.create(
            {
              product_variant_id: variantId,
              barcode: generatedBarcode,
              type: "EAN13",
              is_primary: true,
              status: "A",
              created_by: userId,
            },
            client,
          );
        }

        // 3a️⃣ Handle images for this variant
        if (images && Array.isArray(images)) {
          // Get existing image IDs for this variant
          const existingImagesResult = await client.query(
            "SELECT id FROM product_image WHERE product_variant_id = $1",
            [variantId],
          );
          const existingImageIds = existingImagesResult.rows.map((r) => r.id);
          const updatedImageIds: number[] = [];

          for (const image of images) {
            if (image.id) {
              // Update existing image
              updatedImageIds.push(image.id);

              // If setting as primary, unset others
              if (image.is_primary) {
                await client.query(
                  "UPDATE product_image SET is_primary = FALSE WHERE product_variant_id = $1 AND id != $2",
                  [variantId, image.id],
                );
              }

              const imageUpdate = {
                url: image.url,
                alt_text: image.alt_text,
                is_primary: image.is_primary,
                status: image.status || "A",
                updated_by: userId,
              };
              await productImageModel.update(image.id, imageUpdate, client);
            } else {
              // Create new image
              const newImage = {
                code: await generatePrefixedId("product_image", "IMG"),
                product_variant_id: variantId,
                url: image.url,
                alt_text: image.alt_text || "Product Image",
                is_primary: image.is_primary || false,
                status: image.status || "A",
                created_by: userId,
              };
              const createdImage = await productImageModel.create(
                newImage,
                client,
              );
              updatedImageIds.push(createdImage.id);
            }
          }

          // Delete images that were removed (not in the update list)
          const imagesToDelete = existingImageIds.filter(
            (id) => !updatedImageIds.includes(id),
          );
          if (imagesToDelete.length > 0) {
            await client.query("DELETE FROM product_image WHERE id = ANY($1)", [
              imagesToDelete,
            ]);
          }
        }

        // 3b️⃣ Handle barcodes for this variant
        if (barcodes && Array.isArray(barcodes)) {
          // Get existing barcode IDs for this variant
          const existingBarcodesResult = await client.query(
            "SELECT id FROM product_barcode WHERE product_variant_id = $1",
            [variantId],
          );
          const existingBarcodeIds = existingBarcodesResult.rows.map(
            (r) => r.id,
          );
          const updatedBarcodeIds: number[] = [];

          for (const barcode of barcodes) {
            if (barcode.id) {
              // Update existing barcode
              updatedBarcodeIds.push(barcode.id);

              // If setting as primary, unset others
              if (barcode.is_primary) {
                await client.query(
                  "UPDATE product_barcode SET is_primary = FALSE WHERE product_variant_id = $1 AND id != $2",
                  [variantId, barcode.id],
                );
              }

              const barcodeUpdate = {
                barcode: barcode.barcode,
                type: barcode.type,
                is_primary: barcode.is_primary,
                status: barcode.status || "A",
                updated_by: userId,
              };
              await productBarcodeModel.update(
                barcode.id,
                barcodeUpdate,
                client,
              );
            } else {
              // Create new barcode
              const newBarcode = {
                product_variant_id: variantId,
                barcode: barcode.barcode,
                type: barcode.type || "EAN13",
                is_primary: barcode.is_primary || false,
                status: barcode.status || "A",
                created_by: userId,
              };
              const createdBarcode = await productBarcodeModel.create(
                newBarcode,
                client,
              );
              updatedBarcodeIds.push(createdBarcode.id);
            }
          }

          // Delete barcodes that were removed (not in the update list)
          const barcodesToDelete = existingBarcodeIds.filter(
            (id) => !updatedBarcodeIds.includes(id),
          );
          if (barcodesToDelete.length > 0) {
            await client.query(
              "DELETE FROM product_barcode WHERE id = ANY($1)",
              [barcodesToDelete],
            );
          }
        }
      }

      // Delete variants that were removed (optional - be careful with this)
      // You might want to soft delete instead
      const variantIds = variants.filter((v) => v.id).map((v) => v.id);

      if (variantIds.length > 0) {
        await client.query(
          `DELETE FROM product_variant 
           WHERE product_id = $1 
           AND id != ALL($2)`,
          [id, variantIds],
        );
      }
    }

    await client.query("COMMIT");

    // Fetch updated product with all relations
    const result = await client.query("SELECT * FROM product WHERE id = $1", [
      id,
    ]);

    return reply.send(
      successResponse(result.rows[0], "Product updated successfully"),
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Update product error:", err);
    return reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function deleteProduct(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };

    const deletedProduct = await productModel.delete(parseInt(id));

    if (!deletedProduct) {
      return reply
        .status(404)
        .send({ success: false, message: "Product not found" });
    }

    reply.send(successResponse(deletedProduct, "Product deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PRODUCT VARIANT CRUD ==========

export async function createProductVariant(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const fields = req.body as Record<string, any>;

    // Generate variant code
    fields.code = await generatePrefixedId("product_variant", "VAR");

    const newVariant = await productVariantModel.create(fields);

    reply.send(
      successResponse(newVariant, "Product variant created successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductVariants(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { product_id } = req.params as { product_id: string };

    const variants = await productVariantModel.findByField(
      "product_id",
      product_id,
    );

    // Get barcodes for each variant
    const variantsWithBarcodes = await Promise.all(
      variants.map(async (variant: any) => {
        const barcodes = await productBarcodeModel.findByField(
          "product_variant_id",
          variant.id,
        );
        return { ...variant, barcodes };
      }),
    );

    reply.send(
      successResponse(
        variantsWithBarcodes,
        "Product variants retrieved successfully",
      ),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductVariant(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: string };
    const fields = req.body as Record<string, any>;

    const updatedVariant = await productVariantModel.update(
      parseInt(id),
      fields,
    );

    if (!updatedVariant) {
      return reply
        .status(404)
        .send({ success: false, message: "Product variant not found" });
    }

    reply.send(
      successResponse(updatedVariant, "Product variant updated successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductVariant(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: string };

    const deletedVariant = await productVariantModel.delete(parseInt(id));

    if (!deletedVariant) {
      return reply
        .status(404)
        .send({ success: false, message: "Product variant not found" });
    }

    reply.send(
      successResponse(deletedVariant, "Product variant deleted successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PRODUCT IMAGE CRUD ==========

export async function addProductImage(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const fields = req.body as Record<string, any>;

    // Generate image code
    fields.code = await generatePrefixedId("product_image", "IMG");

    // If this is set as primary, remove primary flag from other images
    if (fields.is_primary) {
      await pool.query(
        "UPDATE product_image SET is_primary = FALSE WHERE product_id = $1",
        [fields.product_id],
      );
    }

    const newImage = await productImageModel.create(fields);

    reply.send(successResponse(newImage, "Product image added successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductImages(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { product_id } = req.params as { product_id: string };

    const images = await productImageModel.findByField(
      "product_id",
      product_id,
    );

    reply.send(
      successResponse(images, "Product images retrieved successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductImage(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: string };
    const fields = req.body as Record<string, any>;

    // If setting as primary, remove primary flag from other images
    if (fields.is_primary) {
      const currentImage = await productImageModel.findById(parseInt(id));
      if (currentImage) {
        await pool.query(
          "UPDATE product_image SET is_primary = FALSE WHERE product_id = $1 AND id != $2",
          [currentImage.product_id, id],
        );
      }
    }

    const updatedImage = await productImageModel.update(parseInt(id), fields);

    if (!updatedImage) {
      return reply
        .status(404)
        .send({ success: false, message: "Product image not found" });
    }

    reply.send(
      successResponse(updatedImage, "Product image updated successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductImage(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: string };

    const deletedImage = await productImageModel.delete(parseInt(id));

    if (!deletedImage) {
      return reply
        .status(404)
        .send({ success: false, message: "Product image not found" });
    }

    reply.send(
      successResponse(deletedImage, "Product image deleted successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PRODUCT BARCODE CRUD ==========

export async function addProductBarcode(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const fields = req.body as Record<string, any>;

    // If this is set as primary, remove primary flag from other barcodes for the same variant
    if (fields.is_primary) {
      await pool.query(
        "UPDATE product_barcode SET is_primary = FALSE WHERE product_variant_id = $1",
        [fields.product_variant_id],
      );
    }

    const newBarcode = await productBarcodeModel.create(fields);

    reply.send(
      successResponse(newBarcode, "Product barcode added successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductBarcodes(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { variant_id } = req.params as { variant_id: string };

    const barcodes = await productBarcodeModel.findByField(
      "product_variant_id",
      variant_id,
    );

    reply.send(
      successResponse(barcodes, "Product barcodes retrieved successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductBarcode(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: string };
    const fields = req.body as Record<string, any>;

    // If setting as primary, remove primary flag from other barcodes
    if (fields.is_primary) {
      const currentBarcode = await productBarcodeModel.findById(parseInt(id));
      if (currentBarcode) {
        await pool.query(
          "UPDATE product_barcode SET is_primary = FALSE WHERE product_variant_id = $1 AND id != $2",
          [currentBarcode.product_variant_id, id],
        );
      }
    }

    const updatedBarcode = await productBarcodeModel.update(
      parseInt(id),
      fields,
    );

    if (!updatedBarcode) {
      return reply
        .status(404)
        .send({ success: false, message: "Product barcode not found" });
    }

    reply.send(
      successResponse(updatedBarcode, "Product barcode updated successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductBarcode(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: number };

    const deletedBarcode = await productBarcodeModel.delete(id);

    if (!deletedBarcode) {
      return reply
        .status(404)
        .send({ success: false, message: "Product barcode not found" });
    }

    reply.send(
      successResponse(deletedBarcode, "Product barcode deleted successfully"),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== SPECIAL QUERIES ==========

export async function searchProducts(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      q: search,
      category_id,
      price_min,
      price_max,
      availability = "all",
      sort = "newest",
      page = 1,
      limit = 20,
    } = req.query as {
      q?: string;
      category_id?: string;
      price_min?: string;
      price_max?: string;
      availability?: string;
      sort?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page.toString()) || 1;
    const limitNum = parseInt(limit.toString()) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.slug,
        p.description,
        p.cost_price,
        p.selling_price,
        p.regular_price,
        p.status,
        u.name AS uom_name,
        pi.images,
        cat.categories,
        p.total_stock,
        CASE 
          WHEN p.created_at >= NOW() - INTERVAL '10 days' THEN 'New'
          ELSE NULL
        END AS badge,
        r.rating,
        r.review_count,
        p.total_sales,
        pv.primary_variant_id
      FROM (
        SELECT 
          p.id,
          p.code,
          p.name,
          p.slug,
          p.description,
          p.cost_price,
          p.selling_price,
          p.regular_price,
          p.status,
          p.uom_id,
          p.created_at,
          COALESCE(SUM(DISTINCT inv.quantity), 0) AS total_stock,
          COALESCE(SUM(oio.subtotal), 0) AS total_sales
        FROM product p
        LEFT JOIN product_variant pv ON p.id = pv.product_id AND pv.status = 'A'
        LEFT JOIN inventory_stock inv ON pv.id = inv.product_variant_id
        LEFT JOIN order_item_online oio ON pv.id = oio.product_variant_id
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        WHERE 1=1
        AND p.status = 'A'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Handle category_id as comma-separated string
    if (category_id && category_id.trim() !== "") {
      const categoryIds = category_id
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "");
      if (categoryIds.length > 0) {
        query += ` AND pc.category_id = ANY($${paramIndex})`;
        params.push(categoryIds);
        paramIndex++;
      }
    }

    if (search && search.trim() !== "") {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.code ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (price_min && !isNaN(parseFloat(price_min))) {
      query += ` AND p.selling_price >= $${paramIndex}`;
      params.push(parseFloat(price_min));
      paramIndex++;
    }

    if (price_max && !isNaN(parseFloat(price_max))) {
      query += ` AND p.selling_price <= $${paramIndex}`;
      params.push(parseFloat(price_max));
      paramIndex++;
    }

    query += `
        GROUP BY 
          p.id, 
          p.code, 
          p.name, 
          p.slug,
          p.description, 
          p.cost_price, 
          p.selling_price, 
          p.regular_price, 
          p.status, 
          p.uom_id, 
          p.created_at
      ) p
      LEFT JOIN uom u ON p.uom_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (product_id)
          product_id,
          id AS primary_variant_id
        FROM product_variant
        WHERE status = 'A'
        ORDER BY product_id, id ASC
      ) pv ON p.id = pv.product_id
      LEFT JOIN (
        SELECT 
          pv.product_id,
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'variant_id', pi.product_variant_id
            ) ORDER BY pi.is_primary DESC, pi.id
          ) AS images
        FROM product_image pi
        JOIN product_variant pv ON pi.product_variant_id = pv.id
        WHERE pi.status = 'A' AND pv.status = 'A'
        GROUP BY pv.product_id
      ) pi ON p.id = pi.product_id
      LEFT JOIN (
        SELECT 
          pc.product_id,
          json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'code', c.code,
              'image', c.image,
              'is_primary', pc.is_primary
            ) ORDER BY pc.is_primary DESC, c.id
          ) AS categories
        FROM product_categories pc
        JOIN category c ON pc.category_id = c.id
        WHERE c.status = 'A'
        GROUP BY pc.product_id
      ) cat ON p.id = cat.product_id
      LEFT JOIN (
        SELECT 
          product_id,
          ROUND(COALESCE(AVG(rating), 0)::NUMERIC, 1) AS rating,
          COUNT(DISTINCT id) AS review_count
        FROM product_review
        GROUP BY product_id
      ) r ON p.id = r.product_id
      WHERE 1=1
    `;

    // Apply availability filter
    if (availability === "in-stock") {
      query += ` AND p.total_stock > 0`;
    } else if (availability === "out-of-stock") {
      query += ` AND p.total_stock <= 0`;
    }

    // Apply sorting
    switch (sort) {
      case "price-low":
        query += ` ORDER BY p.selling_price ASC`;
        break;
      case "price-high":
        query += ` ORDER BY p.selling_price DESC`;
        break;
      case "popular":
        query += ` ORDER BY p.total_sales DESC, p.selling_price ASC`;
        break;
      case "rating":
        query += ` ORDER BY COALESCE(r.rating, 0) DESC, p.selling_price ASC`;
        break;
      case "newest":
      default:
        query += ` ORDER BY p.created_at DESC`;
        break;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    // Count query for total items
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM product p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN product_variant pv ON p.id = pv.product_id AND pv.status = 'A'
      LEFT JOIN inventory_stock inv ON pv.id = inv.product_variant_id
      WHERE p.status = 'A'
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    if (category_id && category_id.trim() !== "") {
      const categoryIds = category_id
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "");
      if (categoryIds.length > 0) {
        countQuery += ` AND pc.category_id = ANY($${countParamIndex})`;
        countParams.push(categoryIds);
        countParamIndex++;
      }
    }

    if (search && search.trim() !== "") {
      countQuery += ` AND (p.name ILIKE $${countParamIndex} OR p.code ILIKE $${countParamIndex} OR p.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search.trim()}%`);
      countParamIndex++;
    }

    if (price_min && !isNaN(parseFloat(price_min))) {
      countQuery += ` AND p.selling_price >= $${countParamIndex}`;
      countParams.push(parseFloat(price_min));
      countParamIndex++;
    }

    if (price_max && !isNaN(parseFloat(price_max))) {
      countQuery += ` AND p.selling_price <= $${countParamIndex}`;
      countParams.push(parseFloat(price_max));
      countParamIndex++;
    }

    // Add availability filter to count query
    let countSubQuery = countQuery;
    if (availability === "in-stock") {
      countSubQuery = `
        SELECT COUNT(*) as total FROM (
          ${countQuery}
          GROUP BY p.id
          HAVING COALESCE(SUM(inv.quantity), 0) > 0
        ) as filtered_products
      `;
    } else if (availability === "out-of-stock") {
      countSubQuery = `
        SELECT COUNT(*) as total FROM (
          ${countQuery}
          GROUP BY p.id
          HAVING COALESCE(SUM(inv.quantity), 0) <= 0
        ) as filtered_products
      `;
    }

    const [productsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countSubQuery, countParams),
    ]);

    const products = productsResult.rows;
    const total = parseInt(countResult.rows[0]?.total || "0");
    const hasMore = offset + products.length < total;
    const totalPages = Math.ceil(total / limitNum);

    // Add discount percentage to each product
    const productsWithDiscount = products.map((product: any) => ({
      ...product,
      discount_percentage:
        product.regular_price > 0
          ? Math.round(
              ((product.regular_price - product.selling_price) * 100) /
                product.regular_price,
            )
          : 0,
    }));

    reply.send(
      successResponse(
        {
          products: productsWithDiscount,
          pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasMore,
            nextPage: hasMore ? pageNum + 1 : null,
          },
        },
        "Products retrieved successfully",
      ),
    );
  } catch (err: any) {
    console.error("Search products error:", err);
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function findProductByBarcode(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { barcode } = req.params as { barcode: string };

    const query = `
      SELECT 
        p.*,
        pv.*,
        pb.barcode,
        pb.type as barcode_type,
        pc.name as category_name,
        u.name as uom_name
      FROM product p
      JOIN product_variant pv ON p.id = pv.product_id
      JOIN product_barcode pb ON pv.id = pb.product_variant_id
      LEFT JOIN product_category pc ON p.category_id = pc.id
      LEFT JOIN uom u ON p.uom_id = u.id
      WHERE pb.barcode = $1
    `;

    const { rows } = await pool.query(query, [barcode]);

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Product not found with this barcode",
      });
    }

    reply.send(successResponse(rows[0], "Product found by barcode"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
// ========== PRODUCT REVIEW CRUD ==========

export async function createProductReview(
  req: FastifyRequest<{
    Body: {
      order_id: number;
      product_id: number;
      customer_id: number;
      rating: number;
      title?: string;
      comment?: string;
      images?: { url: string }[];
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const {
      order_id,
      product_id,
      customer_id,
      rating,
      title,
      comment,
      images,
    } = req.body;

    // Validate rating
    if (rating < 0 || rating > 5) {
      throw new Error("Rating must be between 0 and 5");
    }

    // Check for existing review
    const existingReview = await pool.query(
      `SELECT id FROM product_review 
       WHERE customer_id = $1 AND product_id = $2`,
      [customer_id, product_id],
    );

    if (existingReview.rows.length > 0) {
      throw new Error("You have already reviewed this product");
    }

    // Create review using model
    const reviewData = {
      order_id,
      product_id,
      customer_id,
      rating,
      title,
      comment,
      helpful_count: 0,
    };

    const newReview = await productReviewModel.create(reviewData);

    // Create images using model
    let reviewImages = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const imageData = {
          review_id: newReview.id,
          image_url: image.url,
        };
        const newImage = await productReviewImageModel.create(imageData);
        reviewImages.push(newImage);
      }
    }

    reply.send({
      success: true,
      message: "Product review created successfully",
      data: {
        ...newReview,
        images: reviewImages,
      },
    });
  } catch (err: any) {
    console.error("Error creating product review:", err);
    reply.status(400).send({
      success: false,
      message: err.message,
    });
  }
}

export async function getProductReviews(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { product_id } = req.body as { product_id: string };
    const data = await productReviewModel.findByField("product_id", product_id);
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getCustomerProductReviews(
  req: FastifyRequest<{
    Body: {
      customerId: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { customerId, page = "1", limit = "10" } = req.body;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(parseInt(limit), 100));
    const offset = (pageNum - 1) * limitNum;

    // Main query with pagination
    const query = `
      SELECT 
      r.id,
      r.order_id,
      r.product_id AS variant_id,
      r.rating,
      r.title,
      r.comment,
      r.helpful_count,
      r.created_at,
      o.order_status,
      o.created_at as order_date,
      p.id AS product_id,
      p.name AS product_name,
      p.slug AS product_slug,
      pv.name AS variant_name,
      pv.code AS variant_code,
      pv.sku AS variant_sku,
      pv.additional_price AS variant_price,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', pri.id,
              'image_url', pri.image_url
            ) ORDER BY pri.id
          ),
          '[]'::json
        )
        FROM product_review_image pri
        WHERE pri.review_id = r.id
      ) AS images
    FROM product_review r
    JOIN product_variant pv ON r.product_id = pv.id
    JOIN product p ON pv.product_id = p.id
    LEFT JOIN order_online o ON r.order_id = o.id
    WHERE r.customer_id =$1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM product_review
      WHERE customer_id = $1
    `;

    const [reviewsResult, countResult] = await Promise.all([
      pool.query(query, [customerId, limitNum, offset]),
      pool.query(countQuery, [customerId]),
    ]);

    const reviews = reviewsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    reply.send({
      success: true,
      message: "Customer reviews retrieved successfully",
      data: reviews,
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err: any) {
    console.error("Error fetching customer reviews:", err);
    reply.status(500).send({
      success: false,
      message: err.message,
    });
  }
}
export async function updateProductReview(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await productReviewModel.update(id, fields);
    reply.send(successResponse(updated, "Product Review updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteProductReview(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await productReviewModel.delete(id);
    reply.send(successResponse(deleted, "Product Review deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createProductEnquiries(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const fields = req.body as Record<string, any>;
    const product = await productModel.findById(fields.product_id);
    const newData = await productEnquiriesModel.create(fields);

    // Safely get the ID from multiple possible locations
    const enquiryId = newData?.data?.id || newData?.id || newData?._id;

    if (!enquiryId) {
      throw new Error("Failed to get enquiry ID after creation");
    }

    const payload = {
      enquiryId: enquiryId,
      productName: product.name,
      productSku: product.sku,
      name: fields.name,
      phone: fields.phone,
      email: fields.email,
      quantity: fields.quantity,
      message: fields.message,
    };

    await EmailService.sendEnquiryConfirmation(
      fields.email,
      fields.name,
      product.name,
    );

    await EmailService.sendEnquiryNotificationAdmin(payload);
    reply.send(successResponse(newData, "Enquiry sent successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getAllProductEnquiries(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { page = "1", limit = "10", search, status } = req.body as any;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(parseInt(limit), 100));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(pe.name ILIKE $${idx} OR pe.email ILIKE $${idx} OR pe.phone ILIKE $${idx} OR pe.message ILIKE $${idx})`,
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (status) {
      conditions.push(`pe.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.join(" AND ");

    const query = `
      SELECT
        pe.*,

        JSON_BUILD_OBJECT(
          'id',            p.id,
          'name',          p.name,
          'code',          p.code,
          'slug',          p.slug,
          'selling_price', p.selling_price,
          'regular_price', p.regular_price,
          'image', (
            SELECT i.url
            FROM product_variant pv
            JOIN product_image   i ON i.product_variant_id = pv.id
            WHERE pv.product_id = p.id
              AND pv.status     = 'A'
              AND i.status      = 'A'
              AND i.is_primary  = true
            ORDER BY pv.id
            LIMIT 1
          ),

          'sku', (
            SELECT pv.sku
            FROM product_variant pv
            WHERE pv.product_id = p.id
              AND pv.status     = 'A'
            ORDER BY pv.id
            LIMIT 1
          ),

          'category', (
            SELECT JSON_BUILD_OBJECT(
              'id',   c.id,
              'name', c.name,
              'slug', c.slug
            )
            FROM product_categories pc
            JOIN category c ON c.id = pc.category_id
            WHERE pc.product_id  = p.id
              AND pc.is_primary  = true
              AND c.status       = 'A'
            LIMIT 1
          )
        ) AS product

      FROM product_enquiries pe
      JOIN product p ON p.id = pe.product_id
      WHERE ${where}
      ORDER BY pe.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM product_enquiries pe
      JOIN product p ON p.id = pe.product_id
      WHERE ${where}
    `;

    // Params for main query include limit + offset at the end
    const dataParams = [...params, limitNum, offset];
    // Count query uses same params minus limit/offset
    const countParams = [...params];

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, dataParams),
      pool.query(countQuery, countParams),
    ]);

    const data = dataResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    reply.send(
      successResponse(
        {
          enquiries: data,
          pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: offset + data.length < total,
            hasPrevPage: pageNum > 1,
          },
        },
        "Enquiries retrieved successfully",
      ),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateProductEnquiriesStatus(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id, status } = req.body as { id: number; status: string };
    const updated = await productEnquiriesModel.update(id, { status });
    reply.send(successResponse(updated, "Enquirie updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteProductEnquiries(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await productEnquiriesModel.delete(id);
    reply.send(successResponse(deleted, "Enquirie deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
