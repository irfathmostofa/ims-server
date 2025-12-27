// coupon.controller.ts
import { FastifyRequest, FastifyReply } from "fastify";
import {
  CouponModel,
  CouponApplicableCategoriesModel,
  CouponApplicableProductsModel,
  CouponUsageHistoryModel,
} from "./coupon.model";
import pool from "../../config/db";

// CREATE COUPON
export async function createCoupon(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  try {
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      start_date,
      end_date,
      is_active = true,
      applicable_to = "all",
      category_ids = [],
      product_ids = [],
    } = req.body as any;

    // Validation
    if (!code || !description || !discount_type || !start_date || !end_date) {
      return reply.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    if (
      discount_type === "percentage" &&
      (discount_value < 0 || discount_value > 100)
    ) {
      return reply.status(400).send({
        success: false,
        message: "Percentage discount must be between 0 and 100",
      });
    }

    // Create coupon
    const couponData = {
      code,
      description,
      discount_type,
      discount_value,
      min_purchase_amount: min_purchase_amount || null,
      max_discount_amount: max_discount_amount || null,
      usage_limit: usage_limit || null,
      usage_count: 0,
      start_date,
      end_date,
      is_active,
      applicable_to,
    };

    const coupon = await CouponModel.create(couponData);

    // Handle applicable categories/products
    if (applicable_to === "specific_categories" && category_ids.length > 0) {
      for (const categoryId of category_ids) {
        await CouponApplicableCategoriesModel.create({
          coupon_id: coupon.id,
          category_id: categoryId,
        });
      }
    }

    if (applicable_to === "specific_products" && product_ids.length > 0) {
      for (const productId of product_ids) {
        await CouponApplicableProductsModel.create({
          coupon_id: coupon.id,
          product_id: productId,
        });
      }
    }

    // Format response
    const formattedCoupon = {
      ...coupon,
      start_date: new Date(coupon.start_date).toISOString(),
      end_date: new Date(coupon.end_date).toISOString(),
      created_at: new Date(coupon.created_at).toISOString(),
      updated_at: new Date(coupon.updated_at).toISOString(),
    };

    return reply.send({
      success: true,
      message: "Coupon created successfully",
      data: formattedCoupon,
    });
  } catch (error: any) {
    console.error("Error creating coupon:", error);
    return reply.status(400).send({
      success: false,
      message: error.message || "Failed to create coupon",
    });
  }
}

// GET ALL COUPONS
export async function getAllCoupons(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  try {
    // Get any filters from body
    const filters = req.body || {};

    // Use findAll from CrudModel
    const coupons = await CouponModel.findAll();

    // Format dates
    const formattedCoupons = coupons.map((coupon: any) => ({
      ...coupon,
      start_date: new Date(coupon.start_date).toISOString(),
      end_date: new Date(coupon.end_date).toISOString(),
      created_at: new Date(coupon.created_at).toISOString(),
      updated_at: new Date(coupon.updated_at).toISOString(),
    }));

    return reply.send({
      success: true,
      message: "Coupons retrieved successfully",
      data: formattedCoupons,
    });
  } catch (error: any) {
    console.error("Error fetching coupons:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to fetch coupons",
    });
  }
}

// GET COUPON BY ID
export async function getCouponById(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as any;

    if (!id) {
      return reply.status(400).send({
        success: false,
        message: "Coupon ID is required",
      });
    }

    const coupon = await CouponModel.findById(id);

    if (!coupon) {
      return reply.status(404).send({
        success: false,
        message: "Coupon not found",
      });
    }

    // Get applicable categories/products
    if (coupon.applicable_to === "specific_categories") {
      const categories = await CouponApplicableCategoriesModel.findAll();
      const applicableCategories = categories.filter(
        (cat: any) => cat.coupon_id === coupon.id
      );
      coupon.applicable_categories = applicableCategories.map(
        (cat: any) => cat.category_id
      );
    }

    if (coupon.applicable_to === "specific_products") {
      const products = await CouponApplicableProductsModel.findAll();
      const applicableProducts = products.filter(
        (prod: any) => prod.coupon_id === coupon.id
      );
      coupon.applicable_products = applicableProducts.map(
        (prod: any) => prod.product_id
      );
    }

    // Format dates
    const formattedCoupon = {
      ...coupon,
      start_date: new Date(coupon.start_date).toISOString(),
      end_date: new Date(coupon.end_date).toISOString(),
      created_at: new Date(coupon.created_at).toISOString(),
      updated_at: new Date(coupon.updated_at).toISOString(),
    };

    return reply.send({
      success: true,
      message: "Coupon retrieved successfully",
      data: formattedCoupon,
    });
  } catch (error: any) {
    console.error("Error fetching coupon:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to fetch coupon",
    });
  }
}

// UPDATE COUPON
export async function updateCoupon(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id, ...updateData } = req.body as any;

    if (!id) {
      return reply.status(400).send({
        success: false,
        message: "Coupon ID is required",
      });
    }

    // Check if coupon exists
    const existingCoupon = await CouponModel.findById(id);
    if (!existingCoupon) {
      return reply.status(404).send({
        success: false,
        message: "Coupon not found",
      });
    }

    // Validate discount value if updating
    if (updateData.discount_value !== undefined) {
      if (
        updateData.discount_type === "percentage" &&
        (updateData.discount_value < 0 || updateData.discount_value > 100)
      ) {
        return reply.status(400).send({
          success: false,
          message: "Percentage discount must be between 0 and 100",
        });
      }
    }

    // Update the coupon
    const updatedCoupon = await CouponModel.update(id, updateData, client);

    // Handle applicable categories/products update if needed
    if (updateData.applicable_to !== undefined) {
      if (
        updateData.applicable_to === "specific_categories" &&
        updateData.category_ids
      ) {
        // Delete existing categories
        await client.query(
          "DELETE FROM coupon_applicable_categories WHERE coupon_id = $1",
          [id]
        );

        // Add new categories
        if (Array.isArray(updateData.category_ids)) {
          for (const categoryId of updateData.category_ids) {
            await CouponApplicableCategoriesModel.create(
              {
                coupon_id: id,
                category_id: categoryId,
              },
              client
            );
          }
        }
      } else if (
        updateData.applicable_to === "specific_products" &&
        updateData.product_ids
      ) {
        // Delete existing products
        await client.query(
          "DELETE FROM coupon_applicable_products WHERE coupon_id = $1",
          [id]
        );

        // Add new products
        if (Array.isArray(updateData.product_ids)) {
          for (const productId of updateData.product_ids) {
            await CouponApplicableProductsModel.create(
              {
                coupon_id: id,
                product_id: productId,
              },
              client
            );
          }
        }
      }
    }

    await client.query("COMMIT");

    // Format dates
    const formattedCoupon = {
      ...updatedCoupon,
      start_date: new Date(updatedCoupon.start_date).toISOString(),
      end_date: new Date(updatedCoupon.end_date).toISOString(),
      created_at: new Date(updatedCoupon.created_at).toISOString(),
      updated_at: new Date(updatedCoupon.updated_at).toISOString(),
    };

    return reply.send({
      success: true,
      message: "Coupon updated successfully",
      data: formattedCoupon,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error updating coupon:", error);
    return reply.status(400).send({
      success: false,
      message: error.message || "Failed to update coupon",
    });
  } finally {
    client.release();
  }
}

// DELETE COUPON
export async function deleteCoupon(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as any;

    if (!id) {
      return reply.status(400).send({
        success: false,
        message: "Coupon ID is required",
      });
    }

    // Check if coupon exists
    const existingCoupon = await CouponModel.findById(id);
    if (!existingCoupon) {
      return reply.status(404).send({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check if coupon has been used
    const usageHistory = await CouponUsageHistoryModel.findAll();
    const couponUsage = usageHistory.filter(
      (usage: any) => usage.coupon_id === id
    );

    if (couponUsage.length > 0) {
      // Deactivate instead of delete
      await CouponModel.update(id, { is_active: false });

      return reply.send({
        success: true,
        message: "Coupon has been used. It has been deactivated instead.",
      });
    }

    // Delete the coupon (will cascade to related tables)
    await CouponModel.delete(id);

    return reply.send({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting coupon:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to delete coupon",
    });
  }
}

// VALIDATE COUPON
export async function validateCoupon(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  try {
    const {
      code,
      total_amount,
      product_ids = [],
      category_ids = [],
    } = req.body as any;

    if (!code || !total_amount) {
      return reply.status(400).send({
        success: false,
        message: "Coupon code and total amount are required",
      });
    }

    // Get coupon by code
    const coupons = await CouponModel.findAll();
    const coupon = coupons.find((c: any) => c.code === code);

    if (!coupon) {
      return reply.status(404).send({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check if coupon is active
    if (!coupon.is_active) {
      return reply.status(400).send({
        success: false,
        message: "Coupon is inactive",
      });
    }

    // Check dates
    const now = new Date();
    const startDate = new Date(coupon.start_date);
    const endDate = new Date(coupon.end_date);

    if (now < startDate) {
      return reply.status(400).send({
        success: false,
        message: "Coupon is not yet valid",
      });
    }

    if (now > endDate) {
      return reply.status(400).send({
        success: false,
        message: "Coupon has expired",
      });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return reply.status(400).send({
        success: false,
        message: "Coupon usage limit reached",
      });
    }

    // Check minimum purchase
    if (
      coupon.min_purchase_amount &&
      total_amount < coupon.min_purchase_amount
    ) {
      return reply.status(400).send({
        success: false,
        message: `Minimum purchase amount of ${coupon.min_purchase_amount} required`,
      });
    }

    // Check applicability
    if (coupon.applicable_to !== "all") {
      if (
        coupon.applicable_to === "specific_categories" &&
        category_ids.length > 0
      ) {
        const categories = await CouponApplicableCategoriesModel.findAll();
        const applicableCategories = categories.filter(
          (cat: any) =>
            cat.coupon_id === coupon.id &&
            category_ids.includes(cat.category_id)
        );

        if (applicableCategories.length === 0) {
          return reply.status(400).send({
            success: false,
            message: "Coupon not applicable to selected categories",
          });
        }
      } else if (
        coupon.applicable_to === "specific_products" &&
        product_ids.length > 0
      ) {
        const products = await CouponApplicableProductsModel.findAll();
        const applicableProducts = products.filter(
          (prod: any) =>
            prod.coupon_id === coupon.id &&
            product_ids.includes(prod.product_id)
        );

        if (applicableProducts.length === 0) {
          return reply.status(400).send({
            success: false,
            message: "Coupon not applicable to selected products",
          });
        }
      }
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.discount_type === "percentage") {
      discountAmount = (total_amount * coupon.discount_value) / 100;

      if (
        coupon.max_discount_amount &&
        discountAmount > coupon.max_discount_amount
      ) {
        discountAmount = coupon.max_discount_amount;
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    // Ensure discount doesn't exceed total amount
    discountAmount = Math.min(discountAmount, total_amount);

    return reply.send({
      success: true,
      message: "Coupon is valid",
      data: {
        coupon: {
          ...coupon,
          start_date: new Date(coupon.start_date).toISOString(),
          end_date: new Date(coupon.end_date).toISOString(),
        },
        discount_amount: discountAmount,
        final_amount: total_amount - discountAmount,
      },
    });
  } catch (error: any) {
    console.error("Error validating coupon:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to validate coupon",
    });
  }
}

// APPLY COUPON
export async function applyCoupon(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { coupon_id, order_id, user_id, discount_amount } = req.body as any;

    // Record usage
    await CouponUsageHistoryModel.create(
      {
        coupon_id,
        order_id,
        user_id,
        discount_amount,
      },
      client
    );

    // Increment usage count
    const coupon = await CouponModel.findById(coupon_id);
    if (coupon) {
      const newUsageCount = (coupon.usage_count || 0) + 1;
      await CouponModel.update(
        coupon_id,
        { usage_count: newUsageCount },
        client
      );
    }

    await client.query("COMMIT");

    return reply.send({
      success: true,
      message: "Coupon applied successfully",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error applying coupon:", error);
    return reply.status(500).send({
      success: false,
      message: "Failed to apply coupon",
    });
  } finally {
    client.release();
  }
}
