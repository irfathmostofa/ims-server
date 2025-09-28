import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import {
  productBarcodeModel,
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
    fields.code = await generatePrefixedId("product_category", "PCAT");
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
  try {
    const fields = req.body as Record<string, any>;

    // Generate product code
    fields.code = await generatePrefixedId("product", "PRD");

    const newProduct = await productModel.create(fields);

    reply.send(successResponse(newProduct, "Product created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
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

export async function getProductById(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };

    // Get product with related data
    const query = `
      SELECT 
        p.*,
        pc.name as category_name,
        u.name as uom_name,
        u.symbol as uom_symbol
      FROM product p
      LEFT JOIN product_category pc ON p.category_id = pc.id
      LEFT JOIN uom u ON p.uom_id = u.id
      WHERE p.id = $1
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
  try {
    const { id } = req.params as { id: string };
    const fields = req.body as Record<string, any>;

    const updatedProduct = await productModel.update(parseInt(id), fields);

    if (!updatedProduct) {
      return reply
        .status(404)
        .send({ success: false, message: "Product not found" });
    }

    reply.send(successResponse(updatedProduct, "Product updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
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
