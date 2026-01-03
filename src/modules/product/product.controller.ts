import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import {
  generatePrefixedId,
  generateRandomBarcode,
} from "../../core/models/idGenerator";
import {
  productBarcodeModel,
  productCategoryModel,
  productCatModel,
  productImageModel,
  productModel,
  productReviewModel,
  productVariantModel,
  UomModel,
} from "./product.model";
import pool from "../../config/db";
function slugify(text: string) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // remove all non-word chars
    .replace(/\-\-+/g, "-") // replace multiple hyphens
    .replace(/^-+/, "") // trim hyphens from start
    .replace(/-+$/, ""); // trim hyphens from end
}
// ========== Product Category ==========
export async function createProductCat(
  req: FastifyRequest,
  reply: FastifyReply
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
      successResponse(newData, "Product Category created successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductCat(req: FastifyRequest, reply: FastifyReply) {
  try {
    // 1️⃣ Get all categories
    const categories = await productCatModel.findAll();

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

export async function updateProductCat(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    fields.updated_by = (req.user as { id: number }).id;
    const updated = await productCatModel.update(id, fields);
    reply.send(
      successResponse(updated, "Product Category updated successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductCat(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await productCatModel.delete(id);
    reply.send(
      successResponse(deleted, "Product Category deleted successfully")
    );
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
      successResponse(newData, "Unit Of masurement created successfully")
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
      successResponse(updated, "Unit Of masurement updated successfully")
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
      successResponse(deleted, "Unit Of masurement deleted successfully")
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
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { products } = req.body as { products: Record<string, any>[] };
    const created: any[] = [];

    for (const p of products) {
      p.code = await generatePrefixedId("product", "PROD");
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
    const { page, limit, status, category_id, search } = req.body as {
      page?: number;
      limit?: number;
      status?: string;
      category_id?: number;
      search?: string;
    };

    const pageNum = page || 1;
    const limitNum = limit || 10;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        p.id,
        p.code,
        p.name,
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
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== "") {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category_id) {
      query += ` AND pc.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (search && search !== "") {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
        GROUP BY 
          p.id, 
          p.code, 
          p.name, 
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

      ORDER BY p.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitNum, offset);

    // ✅ Count query for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM product p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status && status !== "") {
      countQuery += ` AND p.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (category_id) {
      countQuery += ` AND pc.category_id = $${countParamIndex}`;
      countParams.push(category_id);
      countParamIndex++;
    }

    if (search && search !== "") {
      countQuery += ` AND (p.name ILIKE $${countParamIndex} OR p.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

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
        "Products retrieved successfully"
      )
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductsPOS(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { category_id, search, branch_id } = req.body as {
      category_id?: string;
      search?: string;
      branch_id?: number;
    };

    // Build conditions and parameters
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Base conditions
    conditions.push("p.status = 'A'");
    conditions.push("(pv.status = 'A' OR pv.status IS NULL)");

    // Branch filter
    if (branch_id) {
      conditions.push(`EXISTS (
        SELECT 1 FROM inventory_stock st 
        WHERE st.product_variant_id = pv.id 
        AND st.branch_id = $${paramIndex}
      )`);
      params.push(branch_id);
      paramIndex++;
    }

    // Category filter
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

    // Search filter
    if (search && search.trim() !== "") {
      conditions.push(`(
        p.name ILIKE $${paramIndex} OR 
        p.code ILIKE $${paramIndex} OR
        pv.name ILIKE $${paramIndex} OR
        pv.code ILIKE $${paramIndex} OR
        (p.name || ' (' || COALESCE(pv.name, '') || ')') ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Build the final query
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        p.id AS product_id,
        pv.id AS variant_id,
        COALESCE(pv.code, p.code) AS code,
        p.name AS product_name,
        pv.name AS variant_name,
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
            ? `(
          SELECT b.name
          FROM branch b
          WHERE b.id = $1
        ) AS branch_name,
        $1 AS branch_id`
            : `'All Branches' AS branch_name, NULL AS branch_id`
        }
      FROM product p
      LEFT JOIN uom u ON u.id = p.uom_id
      LEFT JOIN product_variant pv ON pv.product_id = p.id
      ${whereClause}
      ORDER BY p.name, pv.name NULLS FIRST
    `;

    console.log("Query:", query);
    console.log("Params:", params);

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
        client
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
        [id]
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
          client
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
            client
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
            client
          );
          variantId = newVariant.id;

          // Auto-generate barcode for new variant
          const generatedBarcode = await generateRandomBarcode(
            variantData.code
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
            client
          );
        }

        // 3a️⃣ Handle images for this variant
        if (images && Array.isArray(images)) {
          // Get existing image IDs for this variant
          const existingImagesResult = await client.query(
            "SELECT id FROM product_image WHERE product_variant_id = $1",
            [variantId]
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
                  [variantId, image.id]
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
                client
              );
              updatedImageIds.push(createdImage.id);
            }
          }

          // Delete images that were removed (not in the update list)
          const imagesToDelete = existingImageIds.filter(
            (id) => !updatedImageIds.includes(id)
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
            [variantId]
          );
          const existingBarcodeIds = existingBarcodesResult.rows.map(
            (r) => r.id
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
                  [variantId, barcode.id]
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
                client
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
                client
              );
              updatedBarcodeIds.push(createdBarcode.id);
            }
          }

          // Delete barcodes that were removed (not in the update list)
          const barcodesToDelete = existingBarcodeIds.filter(
            (id) => !updatedBarcodeIds.includes(id)
          );
          if (barcodesToDelete.length > 0) {
            await client.query(
              "DELETE FROM product_barcode WHERE id = ANY($1)",
              [barcodesToDelete]
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
          [id, variantIds]
        );
      }
    }

    await client.query("COMMIT");

    // Fetch updated product with all relations
    const result = await client.query("SELECT * FROM product WHERE id = $1", [
      id,
    ]);

    return reply.send(
      successResponse(result.rows[0], "Product updated successfully")
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
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;

    // Generate variant code
    fields.code = await generatePrefixedId("product_variant", "VAR");

    const newVariant = await productVariantModel.create(fields);

    reply.send(
      successResponse(newVariant, "Product variant created successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductVariants(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { product_id } = req.params as { product_id: string };

    const variants = await productVariantModel.findByField(
      "product_id",
      product_id
    );

    // Get barcodes for each variant
    const variantsWithBarcodes = await Promise.all(
      variants.map(async (variant: any) => {
        const barcodes = await productBarcodeModel.findByField(
          "product_variant_id",
          variant.id
        );
        return { ...variant, barcodes };
      })
    );

    reply.send(
      successResponse(
        variantsWithBarcodes,
        "Product variants retrieved successfully"
      )
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductVariant(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };
    const fields = req.body as Record<string, any>;

    const updatedVariant = await productVariantModel.update(
      parseInt(id),
      fields
    );

    if (!updatedVariant) {
      return reply
        .status(404)
        .send({ success: false, message: "Product variant not found" });
    }

    reply.send(
      successResponse(updatedVariant, "Product variant updated successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductVariant(
  req: FastifyRequest,
  reply: FastifyReply
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
      successResponse(deletedVariant, "Product variant deleted successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PRODUCT IMAGE CRUD ==========

export async function addProductImage(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;

    // Generate image code
    fields.code = await generatePrefixedId("product_image", "IMG");

    // If this is set as primary, remove primary flag from other images
    if (fields.is_primary) {
      await pool.query(
        "UPDATE product_image SET is_primary = FALSE WHERE product_id = $1",
        [fields.product_id]
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
  reply: FastifyReply
) {
  try {
    const { product_id } = req.params as { product_id: string };

    const images = await productImageModel.findByField(
      "product_id",
      product_id
    );

    reply.send(
      successResponse(images, "Product images retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductImage(
  req: FastifyRequest,
  reply: FastifyReply
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
          [currentImage.product_id, id]
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
      successResponse(updatedImage, "Product image updated successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductImage(
  req: FastifyRequest,
  reply: FastifyReply
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
      successResponse(deletedImage, "Product image deleted successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PRODUCT BARCODE CRUD ==========

export async function addProductBarcode(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;

    // If this is set as primary, remove primary flag from other barcodes for the same variant
    if (fields.is_primary) {
      await pool.query(
        "UPDATE product_barcode SET is_primary = FALSE WHERE product_variant_id = $1",
        [fields.product_variant_id]
      );
    }

    const newBarcode = await productBarcodeModel.create(fields);

    reply.send(
      successResponse(newBarcode, "Product barcode added successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductBarcodes(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { variant_id } = req.params as { variant_id: string };

    const barcodes = await productBarcodeModel.findByField(
      "product_variant_id",
      variant_id
    );

    reply.send(
      successResponse(barcodes, "Product barcodes retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductBarcode(
  req: FastifyRequest,
  reply: FastifyReply
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
          [currentBarcode.product_variant_id, id]
        );
      }
    }

    const updatedBarcode = await productBarcodeModel.update(
      parseInt(id),
      fields
    );

    if (!updatedBarcode) {
      return reply
        .status(404)
        .send({ success: false, message: "Product barcode not found" });
    }

    reply.send(
      successResponse(updatedBarcode, "Product barcode updated successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductBarcode(
  req: FastifyRequest,
  reply: FastifyReply
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
      successResponse(deletedBarcode, "Product barcode deleted successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== SPECIAL QUERIES ==========

export async function searchProducts(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      search,
      category_id,
      price_min,
      price_max,
      status = "A",
      page = 1,
      limit = 10,
    } = req.query as any;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (search) {
      paramCount++;
      conditions.push(
        `(p.name ILIKE $${paramCount} OR p.code ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
      );
      values.push(`%${search}%`);
    }

    if (category_id) {
      paramCount++;
      conditions.push(`p.category_id = $${paramCount}`);
      values.push(category_id);
    }

    if (price_min) {
      paramCount++;
      conditions.push(`p.selling_price >= $${paramCount}`);
      values.push(price_min);
    }

    if (price_max) {
      paramCount++;
      conditions.push(`p.selling_price <= $${paramCount}`);
      values.push(price_max);
    }

    if (status) {
      paramCount++;
      conditions.push(`p.status = $${paramCount}`);
      values.push(status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        p.*,
        pc.name as category_name,
        u.name as uom_name,
        pi.url as primary_image
      FROM product p
      LEFT JOIN product_category pc ON p.category_id = pc.id
      LEFT JOIN uom u ON p.uom_id = u.id
      LEFT JOIN product_image pi ON p.id = pi.product_id AND pi.is_primary = true
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(parseInt(limit), offset);

    const { rows } = await pool.query(query, values);

    reply.send(successResponse(rows, "Products searched successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function findProductByBarcode(
  req: FastifyRequest,
  reply: FastifyReply
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
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;
    const newData = await productReviewModel.create(fields);
    reply.send(successResponse(newData, "Product Review created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductReviews(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { product_id } = req.body as { product_id: string };
    const data = await productReviewModel.findByField("product_id", product_id);
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductReview(
  req: FastifyRequest,
  reply: FastifyReply
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
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await productReviewModel.delete(id);
    reply.send(successResponse(deleted, "Product Review deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
