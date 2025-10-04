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
  productVariantModel,
  UomModel,
} from "./product.model";
import pool from "../../config/db";

// ========== Product Category ==========
export async function createProductCat(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;
    fields.created_by = (req.user as { id: number }).id;

    fields.code = await generatePrefixedId("category", "PCAT");
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
    const data = await productCatModel.findAll();
    reply.send(successResponse(data));
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
      images = [],
      ...productData
    } = req.body as Record<string, any>;

    // ✅ product
    productData.code = await generatePrefixedId("product", "PROD");
    productData.created_by = (req.user as { id: number }).id;

    const product = await productModel.create(productData);

    // ✅ categories
    for (const cat of categories) {
      await productCategoryModel.create({
        product_id: product.id,
        category_id: cat.id,
        is_primary: cat.is_primary || false,
        created_by: (req.user as { id: number }).id,
      });
    }

    // ✅ variants + auto barcodes
    for (const v of variants) {
      v.code = await generatePrefixedId("product_variant", "VAR");
      v.product_id = product.id;
      v.created_by = (req.user as { id: number }).id;
      const variant = await productVariantModel.create(v);

      // ✅ auto-generate barcode for this variant
      const generatedBarcode = await generateRandomBarcode(v.code); // create unique code
      await productBarcodeModel.create({
        product_variant_id: variant.id,
        barcode: generatedBarcode,
        type: "EAN13",
        is_primary: true,
        created_by: (req.user as { id: number }).id,
      });
    }

    // ✅ images
    for (const img of images) {
      img.code = await generatePrefixedId("product_image", "IMG");
      img.product_id = product.id;
      img.created_by = (req.user as { id: number }).id;
      await productImageModel.create(img);
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
    const { page = 1, limit = 10, status, category_id } = req.query as any;

    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    if (category_id) filters.category_id = category_id;

    const products = await productModel.findWithPagination(
      parseInt(page),
      parseInt(limit),
      filters
    );

    reply.send(successResponse(products, "Products retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getProductsPOS(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { category_id, search } = req.query as {
      category_id?: number;
      search?: string;
    };

    let query = `
      SELECT 
          p.id AS product_id,
          pv.id AS variant_id,
          COALESCE(pv.code, p.code) AS code,
          p.name,
          p.description,
          (p.selling_price + COALESCE(pv.additional_price,0)) AS selling_price,
          
          (SELECT u.symbol FROM uom u WHERE u.id = p.uom_id) AS symbol,

          (SELECT c.name 
           FROM product_categories pc 
           JOIN category c ON c.id = pc.category_id
           WHERE pc.product_id = p.id 
           LIMIT 1) AS category,

          COALESCE((
              SELECT SUM(st.quantity) 
              FROM inventory_stock st 
              WHERE st.product_variant_id = pv.id
          ), 0) AS stock_qty

      FROM product p
      LEFT JOIN product_variant pv ON pv.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Category filter
    if (category_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM product_categories pc 
        WHERE pc.product_id = p.id AND pc.category_id = $${paramIndex}
      )`;
      params.push(category_id);
      paramIndex++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        p.name ILIKE $${paramIndex} OR 
        p.code ILIKE $${paramIndex} OR 
        pv.code ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY p.id, pv.id`;

    const { rows } = await pool.query(query, params);

    return reply.send({ success: true, data: rows });
  } catch (error) {
    console.error("getProductsFlat error:", error);
    return reply.status(500).send({ success: false, message: "Server error" });
  }
}
export async function getProductById(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };

    // Get product with related data
    const query = `
      SELECT 
        p.*,
        u.name AS uom_name,
        u.symbol AS uom_symbol,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', c.id,
              'name', c.name,
              'is_primary', pc.is_primary
            )
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categories
      FROM product p
      LEFT JOIN uom u ON p.uom_id = u.id
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN category c ON pc.category_id = c.id
      WHERE p.id = $1
      GROUP BY p.id, u.id;
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return reply
        .status(404)
        .send({ success: false, message: "Product not found" });
    }

    const product = rows[0];

    // Get variants
    const variants = await productVariantModel.findByField("product_id", id);

    // Get images
    const images = await productImageModel.findByField("product_id", id);

    // Get barcodes for all variants
    const barcodes = await Promise.all(
      variants.map(async (variant: any) => {
        const variantBarcodes = await productBarcodeModel.findByField(
          "product_variant_id",
          variant.id
        );
        return { variant_id: variant.id, barcodes: variantBarcodes };
      })
    );

    const result = {
      ...product,
      variants,
      images,
      barcodes,
    };

    reply.send(successResponse(result, "Product retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProduct(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  try {
    const { id } = req.params as { id: string };
    const fields = req.body as Record<string, any>;

    await client.query("BEGIN");

    // 1. Update main product fields
    const updatedProduct = await productModel.update(parseInt(id), fields);
    if (!updatedProduct) {
      await client.query("ROLLBACK");
      return reply
        .status(404)
        .send({ success: false, message: "Product not found" });
    }

    // 2. Handle categories
    if (fields.categories && Array.isArray(fields.categories)) {
      // Remove existing categories
      await client.query(
        "DELETE FROM product_categories WHERE product_id = $1",
        [id]
      );
      // Insert new categories
      for (const cat of fields.categories) {
        await productCategoryModel.create({
          product_id: id,
          category_id: cat.id,
          is_primary: cat.is_primary || false,
          created_by: fields.updated_by || null,
        });
      }
    }

    // 3. Handle variants
    if (fields.variants && Array.isArray(fields.variants)) {
      for (const variant of fields.variants) {
        if (variant.id) {
          await productVariantModel.update(variant.id, variant);
        } else {
          await productVariantModel.create({
            product_id: id,
            ...variant,
          });
        }
      }
    }

    // 4. Handle images
    if (fields.images && Array.isArray(fields.images)) {
      for (const image of fields.images) {
        if (image.id) {
          // if primary, reset others
          if (image.is_primary) {
            await client.query(
              "UPDATE product_image SET is_primary = FALSE WHERE product_id = $1 AND id != $2",
              [id, image.id]
            );
          }
          await productImageModel.update(image.id, image);
        } else {
          await productImageModel.create({
            product_id: id,
            ...image,
          });
        }
      }
    }

    // 5. Handle barcodes
    if (fields.barcodes && Array.isArray(fields.barcodes)) {
      for (const group of fields.barcodes) {
        for (const barcode of group.barcodes) {
          if (barcode.id) {
            if (barcode.is_primary) {
              await client.query(
                "UPDATE product_barcode SET is_primary = FALSE WHERE product_variant_id = $1 AND id != $2",
                [group.variant_id, barcode.id]
              );
            }
            await productBarcodeModel.update(barcode.id, barcode);
          } else {
            await productBarcodeModel.create({
              product_variant_id: group.variant_id,
              ...barcode,
            });
          }
        }
      }
    }

    await client.query("COMMIT");

    reply.send(
      successResponse(
        updatedProduct,
        "Product updated successfully (with variants, categories, barcodes, and images)"
      )
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
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
