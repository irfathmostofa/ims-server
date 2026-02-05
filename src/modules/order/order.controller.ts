import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import {
  generateOrderId,
  generatePrefixedId,
} from "../../core/models/idGenerator";
import {
  customerItemsModel,
  orderDeliveryModel,
  orderItemOnlineModel,
  orderOnlineModel,
  orderPaymentOnlineModel,
} from "./order.model";
import pool from "../../config/db";

// ===== TYPES =====
interface OrderItem {
  product_variant_id: number;
  quantity: number;
  unit_price: number;
  discount?: number;
}

interface CreateOrderBody {
  customer_id: number;
  delivery_address_id: number;
  delivery_method_id: number;
  payment_method_id: number;
  items: OrderItem[];
  discount_amount?: number;
  is_cod?: boolean;
}

// ===== HELPER FUNCTIONS =====

//  Calculate order totals

function calculateOrderTotals(items: OrderItem[], discountAmount: number = 0) {
  const totalAmount = items.reduce((total, item) => {
    const itemTotal = item.quantity * item.unit_price - (item.discount || 0);
    return total + itemTotal;
  }, 0);

  const netAmount = totalAmount - discountAmount;

  return { totalAmount, netAmount };
}

// ===== ORDER CONTROLLERS =====

// Create Online Order

export async function createOnlineOrder(
  req: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      customer_id,
      delivery_address_id,
      delivery_method_id,
      payment_method_id,
      items,
      discount_amount = 0,
      is_cod = false,
    } = req.body;
    const userId = (req.user as any)?.id;

    // Validate items
    if (!items || items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    // Calculate totals
    const { totalAmount, netAmount } = calculateOrderTotals(
      items,
      discount_amount,
    );

    // Generate order code
    const code = generateOrderId();
    // Create order
    const order = await orderOnlineModel.create(
      {
        code,
        customer_id,
        delivery_address_id,
        delivery_method_id,
        payment_method_id,
        total_amount: totalAmount,
        discount_amount,
        is_cod,
        order_status: "PENDING",
        payment_status: is_cod ? "UNPAID" : "PAID",
        status: "A",
        created_at: new Date(),
      },
      client,
    );

    const orderId = order.id;

    // Insert order items
    for (const item of items) {
      await orderItemOnlineModel.create(
        {
          order_id: orderId,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
        },
        client,
      );
    }

    // Create delivery record
    await orderDeliveryModel.create(
      {
        order_id: orderId,
        delivery_method_id,
        tracking_code: null,
        delivery_status: "ASSIGNED",
        cod_amount: is_cod ? netAmount : 0,
        cod_collected: false,
        status: "A",
        created_by: userId,
      },
      client,
    );

    await client.query("COMMIT");

    // Fetch complete order
    // const completeOrder = await getOrderById(orderId, client);

    reply.send(successResponse(order, "Order created successfully"));
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// Get Order by ID with all details

export async function getOrderById(orderId: number, client?: any) {
  const queryRunner = client || pool;

  // Get order
  const orderResult = await queryRunner.query(
    `SELECT 
      o.*,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      da.address_line1,
      da.address_line2,
      da.city,
      da.state,
      da.postal_code,
      dm.name as delivery_method_name,
      pm.name as payment_method_name
    FROM order_online o
    LEFT JOIN customer c ON o.customer_id = c.id
    LEFT JOIN delivery_address da ON o.delivery_address_id = da.id
    LEFT JOIN delivery_method dm ON o.delivery_method_id = dm.id
    LEFT JOIN payment_method pm ON o.payment_method_id = pm.id
    WHERE o.id = $1`,
    [orderId],
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const order = orderResult.rows[0];

  // Get order items with product details
  const itemsResult = await queryRunner.query(
    `SELECT 
      oi.*,
      pv.name as variant_name,
      pv.code as variant_code,
      p.name as product_name,
      (oi.quantity * oi.unit_price - oi.discount) as subtotal
    FROM order_item_online oi
    JOIN product_variant pv ON oi.product_variant_id = pv.id
    JOIN product p ON pv.product_id = p.id
    WHERE oi.order_id = $1
    ORDER BY oi.id`,
    [orderId],
  );

  // Get delivery info
  const deliveryResult = await queryRunner.query(
    `SELECT 
      od.*,
      dm.name as delivery_method_name
    FROM order_delivery od
    LEFT JOIN delivery_method dm ON od.delivery_method_id = dm.id
    WHERE od.order_id = $1`,
    [orderId],
  );

  // Get payment info
  const paymentResult = await queryRunner.query(
    `SELECT 
      op.*,
      pm.name as payment_method_name
    FROM order_payment_online op
    LEFT JOIN payment_method pm ON op.payment_method_id = pm.id
    WHERE op.order_id = $1
    ORDER BY op.paid_at DESC`,
    [orderId],
  );

  return {
    ...order,
    items: itemsResult.rows,
    delivery: deliveryResult.rows[0] || null,
    payments: paymentResult.rows,
  };
}

// Get Single Order

export async function getOrder(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const orderId = parseInt(req.params.id);
    const order = await getOrderById(orderId);

    if (!order) {
      return reply.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    reply.send({
      success: true,
      data: order,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// Get All Orders with Filters

export async function getAllOrders(
  req: FastifyRequest<{
    Body: {
      page?: string;
      limit?: string;
      customer_id?: string;
      order_status?: string;
      payment_status?: string;
      from_date?: string;
      to_date?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const {
      page = "1",
      limit = "10",
      customer_id,
      order_status,
      payment_status,
      from_date,
      to_date,
    } = req.body;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (customer_id) {
      conditions.push(`o.customer_id = $${paramIndex++}`);
      values.push(parseInt(customer_id));
    }

    if (order_status) {
      conditions.push(`o.order_status = $${paramIndex++}`);
      values.push(order_status);
    }

    if (payment_status) {
      conditions.push(`o.payment_status = $${paramIndex++}`);
      values.push(payment_status);
    }

    if (from_date) {
      conditions.push(`o.creation_date >= $${paramIndex++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`o.creation_date <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM order_online o ${whereClause}`,
      values,
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get orders with items
    const ordersResult = await pool.query(
      `
      SELECT 
        o.*,
        c.full_name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        dm.name AS delivery_method_name,
        pm.name AS payment_method_name,
        ca.label,
        ca.address_line,
        ca.city,
        ca.area,
        ca.postal_code,
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id,
              'product_variant_id', oi.product_variant_id,
              'product_name', p.name,
              'variant_name', pv.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'discount', oi.discount,
              'subtotal', oi.subtotal
            )
          )
          FROM order_item_online oi
          LEFT JOIN product_variant pv ON oi.product_variant_id = pv.id
          LEFT JOIN product p ON pv.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM order_online o
      LEFT JOIN customer c ON o.customer_id = c.id
      LEFT JOIN customer_address ca ON o.delivery_address_id = ca.id
      LEFT JOIN delivery_method dm ON o.delivery_method_id = dm.id
      LEFT JOIN payment_method pm ON o.payment_method_id = pm.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      [...values, parseInt(limit), offset],
    );

    reply.send({
      success: true,
      data: ordersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// Update Order Status

export async function updateOrderStatus(
  req: FastifyRequest<{
    Body: {
      id: number;
      order_status?: string;
      payment_status?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const orderId = req.body.id;
    const { order_status, payment_status } = req.body;

    const updateData: any = {};
    if (order_status) updateData.order_status = order_status;
    if (payment_status) updateData.payment_status = payment_status;

    if (Object.keys(updateData).length === 0) {
      throw new Error("No status to update");
    }

    const order = await orderOnlineModel.update(orderId, updateData);
    reply.send({
      success: true,
      data: order,
      message: "Order status updated successfully",
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

//Update Delivery Status with Tracking

export async function updateDeliveryStatus(
  req: FastifyRequest<{
    Body: {
      id: number;
      tracking_code?: string;
      delivery_status?: string;
      courier_response?: any;
    };
  }>,
  reply: FastifyReply,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderId = req.body.id;
    const { tracking_code, delivery_status, courier_response } = req.body;

    // Get delivery record
    const deliveryResult = await client.query(
      "SELECT id FROM order_delivery WHERE order_id = $1",
      [orderId],
    );

    if (deliveryResult.rows.length === 0) {
      throw new Error("Delivery record not found");
    }

    const deliveryId = deliveryResult.rows[0].id;

    const updateData: any = {};
    if (tracking_code) updateData.tracking_code = tracking_code;
    if (delivery_status) updateData.delivery_status = delivery_status;
    if (courier_response) updateData.courier_response = courier_response;

    await orderDeliveryModel.update(deliveryId, updateData, client);

    // Update order status based on delivery status
    if (delivery_status === "DELIVERED") {
      await orderOnlineModel.update(
        orderId,
        { order_status: "COMPLETED" },
        client,
      );
    }

    await client.query("COMMIT");

    const updatedOrder = await getOrderById(orderId, client);

    reply.send({
      success: true,
      data: updatedOrder,
      message: "Delivery status updated successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// Record Payment for Order

export async function recordOrderPayment(
  req: FastifyRequest<{
    Body: {
      id: number;
      payment_method_id: number;
      transaction_id: string;
      amount: number;
      provider_response?: any;
    };
  }>,
  reply: FastifyReply,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderId = req.body.id;
    const { payment_method_id, transaction_id, amount, provider_response } =
      req.body;
    const userId = (req.user as any)?.id;

    // Get order
    const orderResult = await client.query(
      "SELECT * FROM order_online WHERE id = $1",
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];

    // Validate amount
    if (amount !== parseFloat(order.net_amount)) {
      throw new Error(
        `Payment amount (${amount}) does not match order amount (${order.net_amount})`,
      );
    }

    // Record payment
    await orderPaymentOnlineModel.create(
      {
        order_id: orderId,
        payment_method_id,
        transaction_id,
        amount,
        status: "SUCCESS",
        provider_response,
        paid_at: new Date(),
        record_status: "A",
        created_by: userId,
        creation_date: new Date(),
      },
      client,
    );

    // Update order payment status
    await orderOnlineModel.update(orderId, { payment_status: "PAID" }, client);

    await client.query("COMMIT");

    const updatedOrder = await getOrderById(orderId, client);

    reply.send({
      success: true,
      data: updatedOrder,
      message: "Payment recorded successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// Cancel Order
export async function cancelOrder(
  req: FastifyRequest<{
    Body: {
      id: number;
      reason?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderId = req.body.id;

    // Get order
    const orderResult = await client.query(
      "SELECT * FROM order_online WHERE id = $1",
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];

    // Check if order can be cancelled
    if (
      order.order_status === "COMPLETED" ||
      order.order_status === "CANCELLED"
    ) {
      throw new Error(`Cannot cancel order with status: ${order.order_status}`);
    }

    // Update order status
    await orderOnlineModel.update(
      orderId,
      { order_status: "CANCELLED" },
      client,
    );

    await client.query("COMMIT");

    const updatedOrder = await getOrderById(orderId, client);

    reply.send({
      success: true,
      data: updatedOrder,
      message: "Order cancelled successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
export async function getCustomerOrder(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: number };
    const order = await orderOnlineModel.findByField("customer_id", id);
    reply.send(successResponse(order));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function addCustomerItem(
  req: FastifyRequest<{
    Body: {
      customer_id: number;
      product_variant_id: number;
      item_type: string;
      quantity?: number;
      unit_price?: number;
      status?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const {
      customer_id,
      product_variant_id,
      item_type,
      quantity,
      unit_price,
      status,
    } = req.body;
    const item = await customerItemsModel.create({
      customer_id,
      product_variant_id,
      item_type,
      quantity,
      unit_price,
      status: status || "A",
    });
    reply.send(successResponse(item, "Item added successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// In your API handler file
export async function getCustomerItems(
  req: FastifyRequest<{ Body: { customerId: string } }>,
  reply: FastifyReply,
) {
  try {
    const customerId = parseInt(req.body.customerId);

    // Using your existing DB client/connection
    const query = `
      SELECT 
          ci.id,
          ci.customer_id,
          ci.product_variant_id,
          ci.item_type,
          ci.quantity,
          ci.unit_price,
          ci.status,
          ci.created_at,
          ci.updated_at,
          
          -- Product variant details
          pv.code as variant_code,
          pv.name as variant_name,
          pv.weight as variant_weight,
          pv.weight_unit as variant_weight_unit,
          pv.sku,
          pv.additional_price,
          pv.is_replaceable,
          
          -- Product details
          p.id as product_id,
          p.code as product_code,
          p.name as product_name,
          p.slug as product_slug,
          p.description as product_description,
          p.cost_price as product_cost_price,
          p.selling_price as product_selling_price,
          p.regular_price as product_regular_price,
          
          -- UOM details
          u.id as uom_id,
          u.name as uom_name,
          u.symbol as uom_symbol,
          u.code as uom_code,
          
          -- Primary category
          pc.category_id,
          c.name as category_name,
          c.slug as category_slug,
          c.code as category_code,
          
          -- Primary product image for variant
          pi.url as product_image_url,
          pi.alt_text as product_image_alt,
          
          -- Primary product image for product (fallback)
          (
            SELECT url 
            FROM product_image 
            WHERE product_variant_id IN (
              SELECT id FROM product_variant WHERE product_id = p.id LIMIT 1
            ) 
            AND is_primary = TRUE 
            LIMIT 1
          ) as fallback_image_url,
          
          -- Primary barcode
          pb.barcode,
          pb.type as barcode_type
          
      FROM customer_items ci
      
      LEFT JOIN product_variant pv 
        ON ci.product_variant_id = pv.id 
        AND pv.status = 'A'
      
      LEFT JOIN product p 
        ON pv.product_id = p.id 
        AND p.status = 'A'
      
      LEFT JOIN uom u 
        ON p.uom_id = u.id 
        AND u.status = 'A'
      
      LEFT JOIN product_categories pc 
        ON p.id = pc.product_id 
        AND pc.is_primary = TRUE
      
      LEFT JOIN category c 
        ON pc.category_id = c.id 
        AND c.status = 'A'
      
      LEFT JOIN product_image pi 
        ON pv.id = pi.product_variant_id 
        AND pi.is_primary = TRUE 
        AND pi.status = 'A'
      
      LEFT JOIN product_barcode pb 
        ON pv.id = pb.product_variant_id 
        AND pb.is_primary = TRUE 
        AND pb.status = 'A'
      
      WHERE ci.customer_id = $1
        AND ci.status = 'A'
      
      ORDER BY ci.created_at DESC
    `;

    const { rows: items } = await pool.query(query, [customerId]);

    // Transform the data for frontend consumption
    const transformedItems = items.map((item: any) => {
      // Calculate final price (product selling price + variant additional price)
      const variantAdditionalPrice = parseFloat(item.additional_price) || 0;
      const productSellingPrice = parseFloat(item.product_selling_price) || 0;
      const finalPrice = productSellingPrice + variantAdditionalPrice;

      // Use cart unit price if available, otherwise calculate
      const itemPrice = parseFloat(item.unit_price) || finalPrice;

      return {
        // Cart item info
        id: item.id,
        customer_id: item.customer_id,
        product_variant_id: item.product_variant_id,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: itemPrice.toFixed(2),
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,

        // Product variant info
        variant_code: item.variant_code,
        variant_name: item.variant_name,
        variant_weight: item.variant_weight,
        variant_weight_unit: item.variant_weight_unit,
        sku: item.sku,
        additional_price: item.additional_price,
        is_replaceable: item.is_replaceable,

        // Product info
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        product_slug: item.product_slug,
        product_description: item.product_description,
        product_cost_price: item.product_cost_price,
        product_selling_price: item.product_selling_price,
        product_regular_price: item.product_regular_price,

        // UOM info
        uom_id: item.uom_id,
        uom_name: item.uom_name,
        uom_symbol: item.uom_symbol,
        uom_code: item.uom_code,

        // Category info
        category_id: item.category_id,
        category_name: item.category_name,
        category_slug: item.category_slug,
        category_code: item.category_code,

        // Image info - use variant image first, then fallback to product image
        image: item.product_image_url || item.fallback_image_url || "",
        product_image_alt: item.product_image_alt || item.product_name || "",

        // Barcode info
        barcode: item.barcode,
        barcode_type: item.barcode_type,

        // Calculated fields
        final_price: finalPrice.toFixed(2),
        total_price: (itemPrice * item.quantity).toFixed(2),
        is_available: Boolean(item.product_id && item.variant_code), // Basic availability check
      };
    });

    reply.send(successResponse(transformedItems));
  } catch (err: any) {
    req.log.error(err);
    reply.status(400).send({
      success: false,
      message: "Failed to fetch customer items",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function updateCustomerItem(
  req: FastifyRequest<{
    Body: {
      id: number;
      quantity?: number;
      unit_price?: number;
      status?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id, quantity, unit_price, status } = req.body;
    const item = await customerItemsModel.update(id, {
      quantity,
      unit_price,
      status,
    });
    reply.send(successResponse(item, "Item updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteCustomerItem(
  req: FastifyRequest<{ Body: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const itemId = parseInt(req.body.id);
    await customerItemsModel.delete(itemId);
    reply.send(successResponse(null, "Item deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
