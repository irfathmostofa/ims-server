import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import pool from "../../config/db";
import {
  grnItemsModel,
  grnModel,
  purchaseOrderItemsModel,
  purchaseOrderModel,
} from "./po.model";

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

    // Calculate totals
    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    if (items?.length) {
      for (const item of items) {
        const subtotal = item.quantity * item.unit_price - (item.discount || 0);
        const tax = (subtotal * (item.tax_rate || 0)) / 100;
        totalAmount += subtotal;
        totalTax += tax;
        totalDiscount += item.discount || 0;
      }
    }

    orderFields.total_amount = totalAmount;
    orderFields.tax_amount = totalTax;
    orderFields.discount_amount = totalDiscount;
    orderFields.status = orderFields.status || "PENDING";

    //  Use CRUD model to create PO
    const newOrder = await purchaseOrderModel.create(orderFields);

    const orderItems = [];
    if (items?.length) {
      for (const item of items) {
        const newItem = await purchaseOrderItemsModel.create({
          order_id: newOrder.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          tax_rate: item.tax_rate || 0,
          notes: item.notes || null,
        });
        orderItems.push(newItem);
      }
    }

    await client.query("COMMIT");

    reply.send(
      successResponse(
        { ...newOrder, items: orderItems },
        "Purchase order created successfully"
      )
    );
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
        COALESCE(SUM(poi.quantity), 0) as total_quantity,
        COALESCE(SUM(poi.received_quantity), 0) as total_received,
        COALESCE(COUNT(poi.id), 0) as total_items,
        COALESCE(json_agg(
          json_build_object(
            'id', poi.id,
            'product_variant_id', poi.product_variant_id,
            'quantity', poi.quantity,
            'received_quantity', poi.received_quantity,
            'unit_price', poi.unit_price,
            'discount', poi.discount,
            'tax_rate', poi.tax_rate,
            'notes', poi.notes
          )
        ) FILTER (WHERE poi.id IS NOT NULL), '[]') as items
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

    const existingOrder = await purchaseOrderModel.findById(id);
    if (!existingOrder) throw new Error("Purchase order not found");
    if (["RECEIVED", "CLOSED"].includes(existingOrder.status)) {
      throw new Error("Cannot update received or closed purchase order");
    }

    if (Object.keys(orderFields).length > 0) {
      await purchaseOrderModel.update(parseInt(id), orderFields);
    }

    if (items) {
      // Delete existing items and add new ones
      await pool.query("DELETE FROM purchase_order_items WHERE order_id = $1", [
        id,
      ]);
      for (const item of items) {
        await purchaseOrderItemsModel.create({
          order_id: parseInt(id),
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          tax_rate: item.tax_rate || 0,
          notes: item.notes || null,
        });
      }
    }

    await client.query("COMMIT");

    const updatedOrder = await purchaseOrderModel.findById(id);
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
    const { id } = req.body as { id: number };

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

    const deletedOrder = await purchaseOrderModel.delete(id);

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

export async function createGRN(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { purchase_order_id, received_by, grn_date, items, notes } =
      req.body as any;

    if (!grn_date) throw new Error("GRN date is required");

    // 1️⃣ Validate Purchase Order
    const { rows: poRows } = await client.query(
      "SELECT * FROM purchase_order WHERE id = $1",
      [purchase_order_id]
    );
    if (poRows.length === 0) throw new Error("Purchase order not found");
    const po = poRows[0];

    // 2️⃣ Generate GRN code
    const grn_code = await generatePrefixedId("goods_received_note", "GRN");

    // 3️⃣ Insert GRN
    const { rows: grnRows } = await client.query(
      `INSERT INTO goods_received_note
        (purchase_order_id, code, received_date, received_by, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [purchase_order_id, grn_code, grn_date, received_by, notes || null]
    );
    const grn = grnRows[0];

    // 4️⃣ Process GRN items
    const grnItems = [];

    for (const item of items) {
      // Fetch PO item
      const { rows: poItemRows } = await client.query(
        `SELECT * FROM purchase_order_items 
         WHERE id = $1 AND order_id = $2`,
        [item.po_item_id, purchase_order_id]
      );
      const poItem = poItemRows[0];
      if (!poItem) throw new Error(`PO item ${item.po_item_id} not found`);

      const receivedQty = Math.min(
        item.received_quantity,
        poItem.quantity - poItem.received_quantity
      );
      if (receivedQty <= 0) continue; // skip if fully received

      // Check if GRN item already exists (prevents duplicate)
      const { rows: existingRows } = await client.query(
        `SELECT id, received_quantity 
         FROM grn_items 
         WHERE grn_id = $1 AND product_variant_id = $2`,
        [grn.id, poItem.product_variant_id]
      );

      let grnItem;
      if (existingRows.length) {
        // Update existing GRN item
        const { rows: updatedRows } = await client.query(
          `UPDATE grn_items
           SET received_quantity = received_quantity + $1,
               notes = COALESCE($2, notes)
           WHERE id = $3
           RETURNING *`,
          [receivedQty, item.notes || null, existingRows[0].id]
        );
        grnItem = updatedRows[0];
      } else {
        // Insert new GRN item
        const { rows: newRows } = await client.query(
          `INSERT INTO grn_items
            (grn_id, product_variant_id, ordered_quantity, received_quantity, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            grn.id,
            poItem.product_variant_id,
            poItem.quantity,
            receivedQty,
            item.notes || null,
          ]
        );
        grnItem = newRows[0];
      }

      grnItems.push(grnItem);

      // 4a️⃣ Update PO item received quantity
      await client.query(
        `UPDATE purchase_order_items
         SET received_quantity = received_quantity + $1
         WHERE id = $2`,
        [receivedQty, poItem.id]
      );

      // 4b️⃣ Update inventory stock
      await client.query(
        `INSERT INTO inventory_stock (branch_id, product_variant_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (branch_id, product_variant_id)
         DO UPDATE SET quantity = inventory_stock.quantity + $3`,
        [po.branch_id, poItem.product_variant_id, receivedQty]
      );

      // 4c️⃣ Insert stock transaction
      await client.query(
        `INSERT INTO stock_transaction
          (branch_id, product_variant_id, type, reference_id, quantity, direction)
         VALUES ($1, $2, 'PURCHASE', $3, $4, 'IN')`,
        [po.branch_id, poItem.product_variant_id, grn.id, receivedQty]
      );
    }

    // 5️⃣ Update Purchase Order status
    const { rows: totalsRows } = await client.query(
      `SELECT SUM(quantity) AS total_ordered, SUM(received_quantity) AS total_received
       FROM purchase_order_items WHERE order_id = $1`,
      [purchase_order_id]
    );
    const totals = totalsRows[0];
    const newStatus =
      parseFloat(totals.total_received || 0) >=
      parseFloat(totals.total_ordered || 0)
        ? "RECEIVED"
        : "PARTIAL";

    await client.query(
      `UPDATE purchase_order
       SET status = $1, delivery_date = CURRENT_DATE
       WHERE id = $2`,
      [newStatus, purchase_order_id]
    );

    await client.query("COMMIT");

    reply.send(
      successResponse(
        { ...grn, items: grnItems, po_status: newStatus },
        "GRN created successfully"
      )
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

export async function getGRNById(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };

    const grn = await grnModel.findById(id);
    if (!grn) throw new Error("GRN not found");

    const items = await grnItemsModel.findByField("grn_id", id);

    reply.send(
      successResponse({ ...grn, items }, "GRN retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateGRN(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params as { id: string };
    const { items, notes, status } = req.body as any;

    const grn = await grnModel.findById(id);
    if (!grn) throw new Error("GRN not found");
    if (grn.status === "APPROVED")
      throw new Error("Cannot update approved GRN");

    // Update GRN fields
    await grnModel.update(parseInt(id), { notes, status });

    if (items?.length) {
      // Delete existing items
      await pool.query("DELETE FROM grn_items WHERE grn_id = $1", [id]);

      for (const item of items) {
        // Re-add items
        const newItem = await grnItemsModel.create({
          grn_id: parseInt(id),
          product_variant_id: item.product_variant_id,
          ordered_quantity: item.ordered_quantity,
          received_quantity: item.received_quantity,
          notes: item.notes || null,
        });
      }
    }

    await client.query("COMMIT");

    const updatedGRN = await grnModel.findById(id);
    const grnItems = await grnItemsModel.findByField("grn_id", id);

    reply.send(
      successResponse(
        { ...updatedGRN, items: grnItems },
        "GRN updated successfully"
      )
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
export async function updateGRNStatus(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: "APPROVED" | "REJECTED" };

    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Invalid status. Must be APPROVED or REJECTED");
    }

    const grn = await grnModel.findById(id);
    if (!grn) throw new Error("GRN not found");
    if (grn.status === "APPROVED" || grn.status === "REJECTED") {
      throw new Error("GRN already finalized");
    }

    await grnModel.update(parseInt(id), { status });

    reply.send(
      successResponse(
        { ...grn, status },
        `GRN ${status.toLowerCase()} successfully`
      )
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteGRN(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };

    const grn = await grnModel.findById(id);
    if (!grn) throw new Error("GRN not found");
    if (grn.status === "APPROVED") {
      throw new Error("Cannot delete approved GRN");
    }

    await grnModel.delete(id);
    reply.send(successResponse(null, "GRN deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function listGRNs(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      purchase_order_id,
    } = req.query as any;
    const filters: Record<string, any> = {};

    if (status) filters.status = status;
    if (purchase_order_id) filters.purchase_order_id = purchase_order_id;

    const grns = await grnModel.findWithPagination(
      parseInt(page),
      parseInt(limit),
      filters
    );

    reply.send(successResponse(grns, "GRNs retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
// export async function listGRNs(req: FastifyRequest, reply: FastifyReply) {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       status,
//       purchase_order_id,
//       date_from,
//       date_to,
//       search,
//     } = req.body as any;

//     const pageNum = parseInt(page.toString());
//     const limitNum = parseInt(limit.toString());
//     const offset = (pageNum - 1) * limitNum;

//     // Build WHERE conditions
//     const conditions: string[] = [];
//     const params: any[] = [];
//     let paramIndex = 1;

//     if (status) {
//       conditions.push(`grn.status = $${paramIndex}`);
//       params.push(status);
//       paramIndex++;
//     }

//     if (purchase_order_id) {
//       conditions.push(`grn.purchase_order_id = $${paramIndex}`);
//       params.push(parseInt(purchase_order_id));
//       paramIndex++;
//     }

//     if (date_from) {
//       conditions.push(`grn.received_date >= $${paramIndex}`);
//       params.push(date_from);
//       paramIndex++;
//     }

//     if (date_to) {
//       conditions.push(`grn.received_date <= $${paramIndex}`);
//       params.push(date_to);
//       paramIndex++;
//     }

//     if (search) {
//       conditions.push(
//         `(grn.code ILIKE $${paramIndex} OR po.code ILIKE $${paramIndex})`
//       );
//       params.push(`%${search}%`);
//       paramIndex++;
//     }

//     const whereClause =
//       conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

//     // Single query with subqueries for items and summary
//     const query = `
//       SELECT
//         grn.*,
//         u.username as received_by_name,
//         po.code as purchase_order_code,
//         po.supplier_id,
//         (
//           SELECT COALESCE(
//             JSON_AGG(
//               JSON_BUILD_OBJECT(
//                 'id', gi.id,
//                 'product_variant_id', gi.product_variant_id,
//                 'ordered_quantity', gi.ordered_quantity,
//                 'received_quantity', gi.received_quantity,
//                 'discrepancy', gi.discrepancy,
//                 'notes', gi.notes,
//                 'product_name', p.name,
//                 'product_code', p.code,
//                 'variant_name', pv.name,
//                 'unit_cost', p.cost_price,
//                 'line_total', p.cost_price * gi.received_quantity
//               ) ORDER BY p.name
//             ), '[]'::json
//           )
//           FROM grn_items gi
//           JOIN product_variant pv ON gi.product_variant_id = pv.id
//           JOIN product p ON pv.product_id = p.id
//           WHERE gi.grn_id = grn.id
//         ) as items,
//         (
//           SELECT JSON_BUILD_OBJECT(
//             'total_items', COUNT(gi.id),
//             'total_ordered', COALESCE(SUM(gi.ordered_quantity), 0),
//             'total_received', COALESCE(SUM(gi.received_quantity), 0),
//             'total_discrepancy', COALESCE(SUM(gi.discrepancy), 0),
//             'total_value', COALESCE(SUM(p.cost_price * gi.received_quantity), 0)
//           )
//           FROM grn_items gi
//           JOIN product_variant pv ON gi.product_variant_id = pv.id
//           JOIN product p ON pv.product_id = p.id
//           WHERE gi.grn_id = grn.id
//         ) as summary,

//         COUNT(*) OVER() as total_count

//       FROM goods_received_note grn
//       LEFT JOIN users u ON grn.received_by = u.id
//       LEFT JOIN purchase_order po ON grn.purchase_order_id = po.id
//       ${whereClause}
//       ORDER BY grn.created_at DESC
//       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
//     `;

//     params.push(limitNum, offset);

//     const result = await pool.query(query, params);

//     if (result.rows.length === 0) {
//       return reply.send(
//         successResponse(
//           {
//             data: [],
//             page: pageNum,
//             limit: limitNum,
//             total: 0,
//             totalPages: 0,
//           },
//           "GRNs retrieved successfully"
//         )
//       );
//     }

//     const totalCount = parseInt(result.rows[0].total_count || "0");

//     // Remove total_count from each row
//     const grns = result.rows.map((row) => {
//       const { total_count, ...grnData } = row;

//       // Ensure items is always an array
//       if (!grnData.items || !Array.isArray(grnData.items)) {
//         grnData.items = [];
//       }

//       // Ensure summary exists
//       if (!grnData.summary) {
//         grnData.summary = {
//           total_items: 0,
//           total_ordered: 0,
//           total_received: 0,
//           total_discrepancy: 0,
//           total_value: 0,
//         };
//       }

//       return grnData;
//     });

//     const response = {
//       data: grns,
//       page: pageNum,
//       limit: limitNum,
//       total: totalCount,
//       totalPages: Math.ceil(totalCount / limitNum),
//     };

//     reply.send(successResponse(response, "GRNs retrieved successfully"));
//   } catch (err: any) {
//     console.error("Error retrieving GRNs:", err);
//     reply.status(400).send({ success: false, message: err.message });
//   }
// }
