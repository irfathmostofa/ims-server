import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import pool from "../../config/db";
import { purchaseOrderModel } from "./po.model";

// ========== PURCHASE ORDER CRUD ==========

export async function createPurchaseOrder(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { items, ...orderFields } = req.body as any;

    // Generate purchase order code
    orderFields.code = await generatePrefixedId("purchase_order", "PO");

    // Calculate totals from items
    let totalAmount = 0;
    let totalTaxAmount = 0;
    let totalDiscountAmount = 0;

    if (items && items.length > 0) {
      for (const item of items) {
        const subtotal = item.quantity * item.unit_price - (item.discount || 0);
        const taxAmount = (subtotal * (item.tax_rate || 0)) / 100;

        totalAmount += subtotal;
        totalTaxAmount += taxAmount;
        totalDiscountAmount += item.discount || 0;
      }
    }

    orderFields.total_amount = totalAmount;
    orderFields.tax_amount = totalTaxAmount;
    orderFields.discount_amount = totalDiscountAmount;

    // Create purchase order
    const orderQuery = `
      INSERT INTO purchase_order (code, branch_id, supplier_id, order_date, expected_date, delivery_date, 
                                 total_amount, tax_amount, discount_amount, status, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const orderValues = [
      orderFields.code,
      orderFields.branch_id,
      orderFields.supplier_id,
      orderFields.order_date || new Date(),
      orderFields.expected_date,
      orderFields.delivery_date,
      orderFields.total_amount,
      orderFields.tax_amount,
      orderFields.discount_amount,
      orderFields.status || "PENDING",
      orderFields.notes,
      orderFields.created_by,
    ];

    const {
      rows: [newOrder],
    } = await client.query(orderQuery, orderValues);

    // Add items if provided
    const orderItems = [];
    if (items && items.length > 0) {
      for (const item of items) {
        const itemQuery = `
          INSERT INTO purchase_order_items (order_id, product_variant_id, quantity, unit_price, discount, tax_rate, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        const {
          rows: [newItem],
        } = await client.query(itemQuery, [
          newOrder.id,
          item.product_variant_id,
          item.quantity,
          item.unit_price,
          item.discount || 0,
          item.tax_rate || 0,
          item.notes,
        ]);

        orderItems.push(newItem);
      }
    }

    await client.query("COMMIT");

    const result = { ...newOrder, items: orderItems };
    reply.send(successResponse(result, "Purchase order created successfully"));
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function getAllPurchaseOrders(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      branch_id,
      supplier_id,
      date_from,
      date_to,
    } = req.query as any;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (status) {
      paramCount++;
      conditions.push(`po.status = $${paramCount}`);
      values.push(status);
    }

    if (branch_id) {
      paramCount++;
      conditions.push(`po.branch_id = $${paramCount}`);
      values.push(branch_id);
    }

    if (supplier_id) {
      paramCount++;
      conditions.push(`po.supplier_id = $${paramCount}`);
      values.push(supplier_id);
    }

    if (date_from) {
      paramCount++;
      conditions.push(`po.order_date >= $${paramCount}`);
      values.push(date_from);
    }

    if (date_to) {
      paramCount++;
      conditions.push(`po.order_date <= $${paramCount}`);
      values.push(date_to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        po.*,
        b.name as branch_name,
        p.name as supplier_name,
        p.phone as supplier_phone,
        u.username as created_by_name,
        COUNT(poi.id) as total_items,
        SUM(poi.quantity) as total_quantity,
        SUM(poi.received_quantity) as total_received
      FROM purchase_order po
      LEFT JOIN branch b ON po.branch_id = b.id
      LEFT JOIN party p ON po.supplier_id = p.id
      LEFT JOIN users u ON po.created_by = u.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.order_id
      ${whereClause}
      GROUP BY po.id, b.name, p.name, p.phone, u.username
      ORDER BY po.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(parseInt(limit), offset);

    const { rows } = await pool.query(query, values);

    reply.send(successResponse(rows, "Purchase orders retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getPurchaseOrderById(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };

    // Get purchase order with related data
    const orderQuery = `
      SELECT 
        po.*,
        b.name as branch_name,
        b.address as branch_address,
        p.name as supplier_name,
        p.phone as supplier_phone,
        p.email as supplier_email,
        p.address as supplier_address,
        u.username as created_by_name
      FROM purchase_order po
      LEFT JOIN branch b ON po.branch_id = b.id
      LEFT JOIN party p ON po.supplier_id = p.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.id = $1
    `;

    const { rows: orderRows } = await pool.query(orderQuery, [id]);

    if (orderRows.length === 0) {
      return reply
        .status(404)
        .send({ success: false, message: "Purchase order not found" });
    }

    const order = orderRows[0];

    // Get order items with product details
    const itemsQuery = `
      SELECT 
        poi.*,
        pv.name as variant_name,
        pv.code as variant_code,
        p.name as product_name,
        p.code as product_code,
        u.name as uom_name,
        u.symbol as uom_symbol,
        (poi.quantity - poi.received_quantity) as pending_quantity
      FROM purchase_order_items poi
      LEFT JOIN product_variant pv ON poi.product_variant_id = pv.id
      LEFT JOIN product p ON pv.product_id = p.id
      LEFT JOIN uom u ON p.uom_id = u.id
      WHERE poi.order_id = $1
      ORDER BY poi.id
    `;

    const { rows: items } = await pool.query(itemsQuery, [id]);

    const result = { ...order, items };

    reply.send(
      successResponse(result, "Purchase order retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updatePurchaseOrder(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params as { id: string };
    const { items, ...orderFields } = req.body as any;

    // Check if order exists and is editable
    const {
      rows: [existingOrder],
    } = await client.query("SELECT * FROM purchase_order WHERE id = $1", [id]);

    if (!existingOrder) {
      throw new Error("Purchase order not found");
    }

    if (
      existingOrder.status === "RECEIVED" ||
      existingOrder.status === "CLOSED"
    ) {
      throw new Error("Cannot update received or closed purchase order");
    }

    // Update order fields
    if (Object.keys(orderFields).length > 0) {
      const updateFields = Object.keys(orderFields)
        .filter((key) => key !== "net_amount") // Skip computed field
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      if (updateFields) {
        const updateValues = [id, ...Object.values(orderFields)];
        await client.query(
          `UPDATE purchase_order SET ${updateFields} WHERE id = $1`,
          updateValues
        );
      }
    }

    // Update items if provided
    if (items) {
      // Delete existing items
      await client.query(
        "DELETE FROM purchase_order_items WHERE order_id = $1",
        [id]
      );

      // Add new items
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_order_items (order_id, product_variant_id, quantity, unit_price, discount, tax_rate, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            item.product_variant_id,
            item.quantity,
            item.unit_price,
            item.discount || 0,
            item.tax_rate || 0,
            item.notes,
          ]
        );
      }

      // Recalculate totals
      const {
        rows: [totals],
      } = await client.query(
        `
        SELECT 
          SUM(subtotal) as total_amount,
          SUM(subtotal * tax_rate / 100) as tax_amount,
          SUM(discount) as discount_amount
        FROM purchase_order_items 
        WHERE order_id = $1
      `,
        [id]
      );

      await client.query(
        `UPDATE purchase_order 
         SET total_amount = $1, tax_amount = $2, discount_amount = $3 
         WHERE id = $4`,
        [
          totals.total_amount || 0,
          totals.tax_amount || 0,
          totals.discount_amount || 0,
          id,
        ]
      );
    }

    await client.query("COMMIT");

    // Fetch updated order
    const {
      rows: [updatedOrder],
    } = await client.query("SELECT * FROM purchase_order WHERE id = $1", [id]);

    reply.send(
      successResponse(updatedOrder, "Purchase order updated successfully")
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function deletePurchaseOrder(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };

    // Check if order can be deleted
    const {
      rows: [order],
    } = await pool.query("SELECT status FROM purchase_order WHERE id = $1", [
      id,
    ]);

    if (!order) {
      return reply
        .status(404)
        .send({ success: false, message: "Purchase order not found" });
    }

    if (order.status === "RECEIVED" || order.status === "PARTIAL") {
      return reply.status(400).send({
        success: false,
        message: "Cannot delete purchase order with received items",
      });
    }

    const deletedOrder = await purchaseOrderModel.delete(parseInt(id));

    reply.send(
      successResponse(deletedOrder, "Purchase order deleted successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PURCHASE ORDER STATUS MANAGEMENT ==========

export async function updateOrderStatus(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };
    const { status, notes } = req.body as { status: string; notes?: string };

    const validStatuses = [
      "PENDING",
      "PARTIAL",
      "RECEIVED",
      "CANCELLED",
      "CLOSED",
    ];

    if (!validStatuses.includes(status)) {
      return reply.status(400).send({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const updateFields: any = { status };
    if (notes) updateFields.notes = notes;
    if (
      status === "CANCELLED" ||
      status === "RECEIVED" ||
      status === "CLOSED"
    ) {
      updateFields.delivery_date = new Date();
    }

    const updatedOrder = await purchaseOrderModel.update(
      parseInt(id),
      updateFields
    );

    if (!updatedOrder) {
      return reply
        .status(404)
        .send({ success: false, message: "Purchase order not found" });
    }

    reply.send(
      successResponse(
        updatedOrder,
        `Purchase order status updated to ${status}`
      )
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== PURCHASE ORDER RECEIVING ==========

export async function receiveOrderItems(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params as { id: string };
    const { items, notes } = req.body as {
      items: Array<{ id: number; received_quantity: number }>;
      notes?: string;
    };

    // Get order details
    const {
      rows: [order],
    } = await client.query("SELECT * FROM purchase_order WHERE id = $1", [id]);

    if (!order) {
      throw new Error("Purchase order not found");
    }

    if (order.status === "CANCELLED" || order.status === "CLOSED") {
      throw new Error("Cannot receive items for cancelled or closed order");
    }

    // Update received quantities and create stock transactions
    for (const item of items) {
      // Get current item details
      const {
        rows: [orderItem],
      } = await client.query(
        "SELECT * FROM purchase_order_items WHERE id = $1 AND order_id = $2",
        [item.id, id]
      );

      if (!orderItem) {
        throw new Error(`Order item ${item.id} not found`);
      }

      const newReceivedQty =
        parseFloat(orderItem.received_quantity || "0") +
        parseFloat(item.received_quantity.toString());

      if (newReceivedQty > parseFloat(orderItem.quantity.toString())) {
        throw new Error(
          `Cannot receive more than ordered quantity for item ${item.id}`
        );
      }

      // Update received quantity
      await client.query(
        "UPDATE purchase_order_items SET received_quantity = $1 WHERE id = $2",
        [newReceivedQty, item.id]
      );

      // Create stock transaction
      await client.query(
        `
        INSERT INTO stock_transaction (
          branch_id, product_variant_id, type, reference_type, reference_id,
          quantity, direction, unit_cost, notes, created_by
        ) VALUES ($1, $2, 'PURCHASE', 'PURCHASE_ORDER', $3, $4, 'IN', $5, $6, $7)
      `,
        [
          order.branch_id,
          orderItem.product_variant_id,
          id,
          item.received_quantity,
          orderItem.unit_price,
          notes || `Received from PO ${order.code}`,
        ]
      );

      // Update inventory stock
      await client.query(
        `
        INSERT INTO inventory_stock (branch_id, product_variant_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (branch_id, product_variant_id, batch_id, location_id)
        DO UPDATE SET 
          quantity = inventory_stock.quantity + $3,
          last_updated = CURRENT_TIMESTAMP
      `,
        [order.branch_id, orderItem.product_variant_id, item.received_quantity]
      );
    }

    // Check if order is fully received
    const {
      rows: [orderStatus],
    } = await client.query(
      `
      SELECT 
        SUM(quantity) as total_ordered,
        SUM(received_quantity) as total_received
      FROM purchase_order_items 
      WHERE order_id = $1
    `,
      [id]
    );

    let newStatus = "PARTIAL";
    if (
      parseFloat(orderStatus.total_received) >=
      parseFloat(orderStatus.total_ordered)
    ) {
      newStatus = "RECEIVED";
    }

    // Update order status
    await client.query(
      "UPDATE purchase_order SET status = $1, delivery_date = CURRENT_DATE WHERE id = $2",
      [newStatus, id]
    );

    await client.query("COMMIT");

    reply.send(
      successResponse(
        { order_id: id, status: newStatus, items_received: items.length },
        "Items received successfully"
      )
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ========== REPORTS AND ANALYTICS ==========

export async function getPurchaseOrderSummary(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { branch_id, supplier_id, date_from, date_to } = req.query as any;

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 0;

    if (branch_id) {
      paramCount++;
      conditions.push(`branch_id = $${paramCount}`);
      values.push(branch_id);
    }

    if (supplier_id) {
      paramCount++;
      conditions.push(`supplier_id = $${paramCount}`);
      values.push(supplier_id);
    }

    if (date_from) {
      paramCount++;
      conditions.push(`order_date >= $${paramCount}`);
      values.push(date_from);
    }

    if (date_to) {
      paramCount++;
      conditions.push(`order_date <= $${paramCount}`);
      values.push(date_to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        status,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discount,
        SUM(net_amount) as total_net_amount,
        AVG(net_amount) as avg_order_value
      FROM purchase_order
      ${whereClause}
      GROUP BY status
      ORDER BY status
    `;

    const { rows } = await pool.query(query, values);

    // Get overall summary
    const overallQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(net_amount) as grand_total,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'RECEIVED') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_orders
      FROM purchase_order
      ${whereClause}
    `;

    const {
      rows: [overall],
    } = await pool.query(overallQuery, values);

    reply.send(
      successResponse(
        {
          by_status: rows,
          overall: overall,
        },
        "Purchase order summary retrieved successfully"
      )
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getPendingOrders(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { branch_id, supplier_id } = req.query as any;

    const values: any[] = [];
    const conditions: string[] = ["po.status IN ('PENDING', 'PARTIAL')"];
    let paramCount = 0;

    if (branch_id) {
      paramCount++;
      conditions.push(`po.branch_id = $${paramCount}`);
      values.push(branch_id);
    }

    if (supplier_id) {
      paramCount++;
      conditions.push(`po.supplier_id = $${paramCount}`);
      values.push(supplier_id);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const query = `
      SELECT 
        po.*,
        p.name as supplier_name,
        b.name as branch_name,
        COUNT(poi.id) as total_items,
        SUM(poi.quantity - poi.received_quantity) as pending_items
      FROM purchase_order po
      LEFT JOIN party p ON po.supplier_id = p.id
      LEFT JOIN branch b ON po.branch_id = b.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.order_id
      ${whereClause}
      GROUP BY po.id, p.name, b.name
      HAVING SUM(poi.quantity - poi.received_quantity) > 0
      ORDER BY po.expected_date ASC NULLS LAST, po.created_at ASC
    `;

    const { rows } = await pool.query(query, values);

    reply.send(successResponse(rows, "Pending orders retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
