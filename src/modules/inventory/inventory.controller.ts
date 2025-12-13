import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import pool from "../../config/db";
import {
  inventoryStockModel,
  productTransferItemsModel,
  productTransferModel,
  requisitionItemsModel,
  requisitionModel,
  stockTransactionModel,
} from "./inventory.model";

export async function addStock(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { branch_id, product_variant_id, quantity } = req.body as any;

    // Upsert stock
    const { rows } = await pool.query(
      `
      INSERT INTO inventory_stock (branch_id, product_variant_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (branch_id, product_variant_id)
      DO UPDATE SET quantity = inventory_stock.quantity + $3
      RETURNING *
      `,
      [branch_id, product_variant_id, quantity]
    );

    reply.send(successResponse(rows[0], "Stock updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function listStock(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      branch_id,
      product_variant_id,
      page = 1,
      limit = 10,
    } = req.body as any;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Base query
    let query = `
      SELECT 
        ins.id AS stock_id,
        ins.quantity,
        b.id AS branch_id,
        b.name AS branch_name,
        b.code AS branch_code,
        pv.id AS variant_id,
        pv.name AS variant_name,
        pv.code AS variant_code,
        p.id AS product_id,
        p.name AS product_name,
        p.code AS product_code,
        p.selling_price,
        p.cost_price
      FROM inventory_stock AS ins
      JOIN branch AS b ON b.id = ins.branch_id
      JOIN product_variant AS pv ON pv.id = ins.product_variant_id
      JOIN product AS p ON p.id = pv.product_id
    `;

    let whereClause = "";
    const params: any[] = [];

    // Build WHERE clause
    if (branch_id || product_variant_id) {
      whereClause = " WHERE ";
      const conditions = [];

      if (branch_id) {
        conditions.push(`ins.branch_id = $${params.length + 1}`);
        params.push(branch_id);
      }

      if (product_variant_id) {
        conditions.push(`ins.product_variant_id = $${params.length + 1}`);
        params.push(product_variant_id);
      }

      whereClause += conditions.join(" AND ");
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM inventory_stock AS ins ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    query += whereClause;
    query += ` ORDER BY b.name, p.name LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limitNum, offset);

    const stocksResult = await pool.query(query, params);

    const totalPages = Math.ceil(total / limitNum);

    const response = {
      data: stocksResult.rows,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total,
        total_pages: totalPages,
      },
    };

    reply.send(successResponse(response, "Stock list retrieved successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function createStockTransaction(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const {
      branch_id,
      product_variant_id,
      type,
      reference_id,
      quantity,
      direction,
    } = req.body as any;

    const transaction = await stockTransactionModel.create({
      branch_id,
      product_variant_id,
      type,
      reference_id: reference_id || null,
      quantity,
      direction,
    });

    // Update inventory accordingly
    const qtyChange = direction === "IN" ? quantity : -quantity;
    await pool.query(
      `
      INSERT INTO inventory_stock (branch_id, product_variant_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (branch_id, product_variant_id)
      DO UPDATE SET quantity = inventory_stock.quantity + $3
      `,
      [branch_id, product_variant_id, qtyChange]
    );

    reply.send(
      successResponse(transaction, "Stock transaction recorded successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function createProductTransfer(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { from_branch_id, to_branch_id, items, reference_no } =
      req.body as any;

    const transfer = await productTransferModel.create({
      from_branch_id,
      to_branch_id,
      reference_no,
      status: "PENDING",
    });

    for (const item of items) {
      await productTransferItemsModel.create({
        transfer_id: transfer.id,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
      });

      // Deduct stock from source branch
      await pool.query(
        `
        UPDATE inventory_stock
        SET quantity = quantity - $1
        WHERE branch_id = $2 AND product_variant_id = $3
        `,
        [item.quantity, from_branch_id, item.product_variant_id]
      );

      // Create stock transaction
      await stockTransactionModel.create({
        branch_id: from_branch_id,
        product_variant_id: item.product_variant_id,
        type: "TRANSFER",
        reference_id: transfer.id,
        quantity: item.quantity,
        direction: "OUT",
      });
    }

    await client.query("COMMIT");

    reply.send(
      successResponse(transfer, "Product transfer created successfully")
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
export async function receiveProductTransfer(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params as { id: string };
    const transfer = await productTransferModel.findById(parseInt(id));
    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "PENDING")
      throw new Error("Transfer already processed");

    const items = await productTransferItemsModel.findByField(
      "transfer_id",
      id
    );

    for (const item of items) {
      // Add stock to destination branch
      await pool.query(
        `
        INSERT INTO inventory_stock (branch_id, product_variant_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (branch_id, product_variant_id)
        DO UPDATE SET quantity = inventory_stock.quantity + $3
        `,
        [transfer.to_branch_id, item.product_variant_id, item.quantity]
      );

      // Stock transaction
      await stockTransactionModel.create({
        branch_id: transfer.to_branch_id,
        product_variant_id: item.product_variant_id,
        type: "TRANSFER",
        reference_id: transfer.id,
        quantity: item.quantity,
        direction: "IN",
      });
    }

    await productTransferModel.update(transfer.id, { status: "RECEIVED" });

    await client.query("COMMIT");

    reply.send(
      successResponse({ transfer_id: id }, "Transfer received successfully")
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
export async function cancelProductTransfer(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: string };
    const transfer = await productTransferModel.findById(parseInt(id));
    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "PENDING")
      throw new Error("Cannot cancel processed transfer");

    const items = await productTransferItemsModel.findByField(
      "transfer_id",
      id
    );

    // Return stock to source branch
    for (const item of items) {
      await pool.query(
        `
        UPDATE inventory_stock
        SET quantity = quantity + $1
        WHERE branch_id = $2 AND product_variant_id = $3
        `,
        [item.quantity, transfer.from_branch_id, item.product_variant_id]
      );

      await stockTransactionModel.create({
        branch_id: transfer.from_branch_id,
        product_variant_id: item.product_variant_id,
        type: "TRANSFER",
        reference_id: transfer.id,
        quantity: item.quantity,
        direction: "IN",
      });
    }

    await productTransferModel.update(transfer.id, { status: "CANCELLED" });

    reply.send(
      successResponse({ transfer_id: id }, "Transfer cancelled successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getStockAdjustments(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { branch_id, product_variant_id, date_from, date_to } =
      req.query as any;

    const values: any[] = [];
    const conditions: string[] = ["type = 'ADJUSTMENT'"];
    let paramCount = 0;

    if (branch_id) {
      paramCount++;
      conditions.push(`branch_id = $${paramCount}`);
      values.push(branch_id);
    }

    if (product_variant_id) {
      paramCount++;
      conditions.push(`product_variant_id = $${paramCount}`);
      values.push(product_variant_id);
    }

    if (date_from) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      values.push(date_from);
    }

    if (date_to) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      values.push(date_to);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const query = `
      SELECT st.*, 
             b.name as branch_name, 
             pv.name as variant_name, 
             pv.code as variant_code
      FROM stock_transaction st
      LEFT JOIN branch b ON st.branch_id = b.id
      LEFT JOIN product_variant pv ON st.product_variant_id = pv.id
      ${whereClause}
      ORDER BY st.created_at DESC
      LIMIT 100
    `;

    const { rows } = await pool.query(query, values);

    reply.send(
      successResponse(rows, "Stock adjustments retrieved successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function receivePurchaseStock(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();
  const { branch_id, product_variant_id, quantity, grn_id } = req.body as any;

  // --- Basic validation ---
  if (!branch_id || !product_variant_id || !grn_id)
    return reply
      .status(400)
      .send({ success: false, message: "Missing required fields" });
  if (isNaN(quantity) || quantity <= 0)
    return reply
      .status(400)
      .send({ success: false, message: "Quantity must be greater than 0" });

  try {
    await client.query("BEGIN");

    // Validate branch and product existence
    const [branchRes, prodRes] = await Promise.all([
      client.query(`SELECT id FROM branch WHERE id = $1`, [branch_id]),
      client.query(`SELECT id FROM product_variant WHERE id = $1`, [
        product_variant_id,
      ]),
    ]);
    if (branchRes.rowCount === 0) throw new Error("Invalid branch_id");
    if (prodRes.rowCount === 0) throw new Error("Invalid product_variant_id");

    // --- Transaction ---
    await client.query(
      `INSERT INTO stock_transaction (branch_id, product_variant_id, type, reference_id, quantity, direction)
       VALUES ($1, $2, 'PURCHASE', $3, $4, 'IN')`,
      [branch_id, product_variant_id, grn_id, quantity]
    );

    // Update or Insert stock
    const result = await client.query(
      `UPDATE inventory_stock
       SET quantity = quantity + $1
       WHERE branch_id = $2 AND product_variant_id = $3
       RETURNING id`,
      [quantity, branch_id, product_variant_id]
    );

    if (result.rowCount === 0) {
      await client.query(
        `INSERT INTO inventory_stock (branch_id, product_variant_id, quantity)
         VALUES ($1, $2, $3)`,
        [branch_id, product_variant_id, quantity]
      );
    }

    await client.query("COMMIT");
    reply.send({ success: true, message: "Stock received successfully" });
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(500).send({ success: false, error: err.message });
  } finally {
    client.release();
  }
}

export async function saleStock(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  const { branch_id, product_variant_id, quantity, sale_id } = req.body as any;

  if (!branch_id || !product_variant_id || !sale_id)
    return reply
      .status(400)
      .send({ success: false, message: "Missing required fields" });
  if (isNaN(quantity) || quantity <= 0)
    return reply
      .status(400)
      .send({ success: false, message: "Quantity must be greater than 0" });

  try {
    await client.query("BEGIN");

    // Validate stock availability
    const stockRes = await client.query(
      `SELECT quantity FROM inventory_stock WHERE branch_id = $1 AND product_variant_id = $2`,
      [branch_id, product_variant_id]
    );

    if (stockRes.rowCount === 0 || stockRes.rows[0].quantity < quantity) {
      throw new Error("Insufficient stock to complete sale");
    }

    // Record transaction
    await client.query(
      `INSERT INTO stock_transaction (branch_id, product_variant_id, type, reference_id, quantity, direction)
       VALUES ($1, $2, 'SALE', $3, $4, 'OUT')`,
      [branch_id, product_variant_id, sale_id, quantity]
    );

    // Deduct from stock
    await client.query(
      `UPDATE inventory_stock SET quantity = quantity - $1 WHERE branch_id = $2 AND product_variant_id = $3`,
      [quantity, branch_id, product_variant_id]
    );

    await client.query("COMMIT");
    reply.send({ success: true, message: "Sale stock updated successfully" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    reply.status(500).send({ success: false, error: error.message });
  } finally {
    client.release();
  }
}

export async function transferStock(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  const { from_branch, to_branch, product_variant_id, quantity, transfer_id } =
    req.body as any;

  if (!from_branch || !to_branch || !product_variant_id || !transfer_id)
    return reply
      .status(400)
      .send({ success: false, message: "Missing required fields" });
  if (isNaN(quantity) || quantity <= 0)
    return reply
      .status(400)
      .send({ success: false, message: "Quantity must be greater than 0" });
  if (from_branch === to_branch)
    return reply
      .status(400)
      .send({ success: false, message: "Cannot transfer to the same branch" });

  try {
    await client.query("BEGIN");

    // Check source stock
    const stock = await client.query(
      `SELECT quantity FROM inventory_stock WHERE branch_id = $1 AND product_variant_id = $2`,
      [from_branch, product_variant_id]
    );
    if (stock.rowCount === 0 || stock.rows[0].quantity < quantity)
      throw new Error("Insufficient stock in source branch");

    // OUT
    await client.query(
      `INSERT INTO stock_transaction (branch_id, product_variant_id, type, reference_id, quantity, direction)
       VALUES ($1, $2, 'TRANSFER', $3, $4, 'OUT')`,
      [from_branch, product_variant_id, transfer_id, quantity]
    );
    await client.query(
      `UPDATE inventory_stock SET quantity = quantity - $1 WHERE branch_id = $2 AND product_variant_id = $3`,
      [quantity, from_branch, product_variant_id]
    );

    // IN
    await client.query(
      `INSERT INTO stock_transaction (branch_id, product_variant_id, type, reference_id, quantity, direction)
       VALUES ($1, $2, 'TRANSFER', $3, $4, 'IN')`,
      [to_branch, product_variant_id, transfer_id, quantity]
    );

    const dest = await client.query(
      `UPDATE inventory_stock SET quantity = quantity + $1 WHERE branch_id = $2 AND product_variant_id = $3 RETURNING id`,
      [quantity, to_branch, product_variant_id]
    );
    if (dest.rowCount === 0) {
      await client.query(
        `INSERT INTO inventory_stock (branch_id, product_variant_id, quantity) VALUES ($1, $2, $3)`,
        [to_branch, product_variant_id, quantity]
      );
    }

    await client.query("COMMIT");
    reply.send({ success: true, message: "Stock transferred successfully" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    reply.status(500).send({ success: false, error: error.message });
  } finally {
    client.release();
  }
}

export async function adjustStock(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  const {
    branch_id,
    product_variant_id,
    quantity,
    adjustment_type,
    reason,
    user_id,
  } = req.body as any;

  if (!branch_id || !product_variant_id || !adjustment_type || !user_id)
    return reply
      .status(400)
      .send({ success: false, message: "Missing required fields" });
  if (isNaN(quantity) || quantity <= 0)
    return reply
      .status(400)
      .send({ success: false, message: "Quantity must be greater than 0" });
  if (!["IN", "OUT"].includes(adjustment_type))
    return reply
      .status(400)
      .send({ success: false, message: "Invalid adjustment_type" });

  try {
    await client.query("BEGIN");

    // For OUT, check stock before reducing
    if (adjustment_type === "OUT") {
      const stock = await client.query(
        `SELECT quantity FROM inventory_stock WHERE branch_id = $1 AND product_variant_id = $2`,
        [branch_id, product_variant_id]
      );
      if (stock.rowCount === 0 || stock.rows[0].quantity < quantity)
        throw new Error("Insufficient stock for adjustment OUT");
    }

    // Insert into adjustment + transaction
    const adj = await client.query(
      `INSERT INTO stock_adjustment (branch_id, product_variant_id, adjustment_type, quantity, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        branch_id,
        product_variant_id,
        adjustment_type,
        quantity,
        reason,
        user_id,
      ]
    );

    await client.query(
      `INSERT INTO stock_transaction (branch_id, product_variant_id, type, reference_id, quantity, direction)
       VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5)`,
      [branch_id, product_variant_id, adj.rows[0].id, quantity, adjustment_type]
    );

    const op = adjustment_type === "IN" ? "+" : "-";
    await client.query(
      `UPDATE inventory_stock SET quantity = quantity ${op} $1 WHERE branch_id = $2 AND product_variant_id = $3`,
      [quantity, branch_id, product_variant_id]
    );

    await client.query("COMMIT");
    reply.send({ success: true, message: "Stock adjusted successfully" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    reply.status(500).send({ success: false, error: error.message });
  } finally {
    client.release();
  }
}

export async function returnStock(req: FastifyRequest, reply: FastifyReply) {
  const client = await pool.connect();
  const { branch_id, product_variant_id, quantity, return_type, reference_id } =
    req.body as any;

  if (!branch_id || !product_variant_id || !return_type || !reference_id)
    return reply
      .status(400)
      .send({ success: false, message: "Missing required fields" });
  if (isNaN(quantity) || quantity <= 0)
    return reply
      .status(400)
      .send({ success: false, message: "Quantity must be greater than 0" });
  if (!["SALE_RETURN", "PURCHASE_RETURN"].includes(return_type))
    return reply
      .status(400)
      .send({ success: false, message: "Invalid return_type" });

  try {
    await client.query("BEGIN");

    const direction = return_type === "SALE_RETURN" ? "IN" : "OUT";

    // For PURCHASE_RETURN (OUT), validate stock
    if (direction === "OUT") {
      const stock = await client.query(
        `SELECT quantity FROM inventory_stock WHERE branch_id = $1 AND product_variant_id = $2`,
        [branch_id, product_variant_id]
      );
      if (stock.rowCount === 0 || stock.rows[0].quantity < quantity)
        throw new Error("Not enough stock to return to supplier");
    }

    await client.query(
      `INSERT INTO stock_transaction (branch_id, product_variant_id, type, reference_id, quantity, direction)
       VALUES ($1, $2, 'RETURN', $3, $4, $5)`,
      [branch_id, product_variant_id, reference_id, quantity, direction]
    );

    const op = direction === "IN" ? "+" : "-";
    await client.query(
      `UPDATE inventory_stock SET quantity = quantity ${op} $1 WHERE branch_id = $2 AND product_variant_id = $3`,
      [quantity, branch_id, product_variant_id]
    );

    await client.query("COMMIT");
    reply.send({ success: true, message: "Return processed successfully" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    reply.status(500).send({ success: false, error: error.message });
  } finally {
    client.release();
  }
}

export async function createRequisition(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { from_branch_id, to_branch_id, requisition_date, remarks, items } =
      req.body as any;

    // Validate items
    if (!items || items.length === 0) {
      throw new Error("Requisition must have at least one item");
    }

    // Validate branches are different
    if (from_branch_id === to_branch_id) {
      throw new Error("From branch and to branch cannot be the same");
    }

    // Generate requisition code
    const code = await generatePrefixedId("requisition", "REQ");

    // Create requisition
    const requisition = await requisitionModel.create(
      {
        code,
        from_branch_id,
        to_branch_id,
        requisition_date,
        remarks,
        created_by: (req.user as any)?.id,
      },
      client
    );

    const requisitionId = requisition.id;

    // Insert requisition items
    for (const item of items) {
      await requisitionItemsModel.create(
        {
          requisition_id: requisitionId,
          product_variant_id: item.product_variant_id,
          requested_qty: item.requested_qty,
        },
        client
      );
    }
    await client.query("COMMIT");
    reply.send(
      successResponse(requisition, "Requisition created successfully")
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Create requisition error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
export async function getRequisitionById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const requisitionId = parseInt(req.params.id);

    // Get requisition with branch details
    const requisitionResult = await pool.query(
      `SELECT 
        r.*,
        fb.name as from_branch_name,
        fb.code as from_branch_code,
        tb.name as to_branch_name,
        tb.code as to_branch_code,
        u.username as created_by_name
      FROM requisition r
      LEFT JOIN branch fb ON r.from_branch_id = fb.id
      LEFT JOIN branch tb ON r.to_branch_id = tb.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = $1`,
      [requisitionId]
    );

    if (requisitionResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Requisition not found",
      });
    }

    const requisition = requisitionResult.rows[0];

    // Get requisition items with product details
    const itemsResult = await pool.query(
      `SELECT 
        ri.*,
        pv.name as variant_name,
        pv.code as variant_code,
        pv.additional_price,
        p.id as product_id,
        p.name as product_name,
        p.code as product_code,
        p.selling_price
      FROM requisition_items ri
      JOIN product_variant pv ON ri.product_variant_id = pv.id
      JOIN product p ON pv.product_id = p.id
      WHERE ri.requisition_id = $1
      ORDER BY ri.id`,
      [requisitionId]
    );

    reply.send({
      success: true,
      data: {
        ...requisition,
        items: itemsResult.rows,
      },
      message: "",
    });
  } catch (err: any) {
    console.error("Get requisition error:", err);
    reply.status(400).send({
      success: false,
      message: err.message,
    });
  }
}
export async function getRequisition(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Get requisition with branch details
    const requisitionResult = await pool.query(
      `SELECT 
        r.*,
        fb.name as from_branch_name,
        fb.code as from_branch_code,
        tb.name as to_branch_name,
        tb.code as to_branch_code,
        u.username as created_by_name,
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', ri.id,
                'requisition_id', ri.requisition_id,
                'product_variant_id', ri.product_variant_id,
                'requested_qty', ri.requested_qty,
                'approved_qty', ri.approved_qty,
                'variant_name', pv.name,
                'variant_code', pv.code,
                'product_id', p.id,
                'product_name', p.name,
                'product_code', p.code,
                'selling_price', p.selling_price
              ) ORDER BY ri.id
            )
            FROM requisition_items ri
            JOIN product_variant pv ON ri.product_variant_id = pv.id
            JOIN product p ON pv.product_id = p.id
            WHERE ri.requisition_id = r.id
          ), 
          '[]'::json
        ) AS items
      FROM requisition r
      LEFT JOIN branch fb ON r.from_branch_id = fb.id
      LEFT JOIN branch tb ON r.to_branch_id = tb.id
      LEFT JOIN users u ON r.created_by = u.id
     `
    );
    if (requisitionResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Requisition not found",
      });
    }
    reply.send(
      successResponse(
        requisitionResult.rows,
        "Requisition created successfully"
      )
    );
  } catch (err: any) {
    console.error("Get requisition error:", err);
    reply.status(400).send({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Update Requisition
 */
export async function updateRequisition(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      requisitionId,
      from_branch_id,
      to_branch_id,
      requisition_date,
      status,
      remarks,
      items,
    } = req.body as any;

    // Check if requisition exists
    const existingRequisition = await requisitionModel.findById(
      requisitionId,
      client
    );
    if (!existingRequisition) {
      return reply.status(404).send({
        success: false,
        message: "Requisition not found",
      });
    }

    // Validate branches if being updated
    if (from_branch_id && to_branch_id && from_branch_id === to_branch_id) {
      throw new Error("From branch and to branch cannot be the same");
    }

    // Update requisition basic info
    const updateData: any = {};
    if (from_branch_id) updateData.from_branch_id = from_branch_id;
    if (to_branch_id) updateData.to_branch_id = to_branch_id;
    if (requisition_date) updateData.requisition_date = requisition_date;
    if (status) updateData.status = status;
    if (remarks) updateData.remarks = remarks;
    updateData.updated_by = (req.user as any)?.id;
    updateData.updated_at = new Date();

    if (Object.keys(updateData).length > 2) {
      // More than just updated_by and updated_at
      await requisitionModel.update(requisitionId, updateData, client);
    }

    // Update items if provided
    if (items && items.length > 0) {
      // Delete old items
      await client.query(
        "DELETE FROM requisition_items WHERE requisition_id = $1",
        [requisitionId]
      );

      // Insert new items
      for (const item of items) {
        await requisitionItemsModel.create(
          {
            requisition_id: requisitionId,
            product_variant_id: item.product_variant_id,
            requested_qty: item.requested_qty,
          },
          client
        );
      }
    }

    await client.query("COMMIT");

    reply.send({
      success: true,
      message: "Requisition updated successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Update requisition error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Delete Requisition
 */
export async function deleteRequisition(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requisitionId = parseInt(req.params.id);

    // Check if requisition exists
    const requisition = await requisitionModel.findById(requisitionId, client);
    if (!requisition) {
      return reply.status(404).send({
        success: false,
        message: "Requisition not found",
      });
    }
    // Optional: Check if requisition can be deleted based on status
    if (
      requisition.status === "APPROVED" ||
      requisition.status === "COMPLETED"
    ) {
      throw new Error(
        `Cannot delete requisition with status: ${requisition.status}`
      );
    }
    await requisitionModel.delete(requisitionId, client);

    await client.query("COMMIT");

    reply.send({
      success: true,
      message: "Requisition deleted successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Delete requisition error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
export async function approveAndTransferRequisition(
  req: FastifyRequest<{
    Body: {
      id: string;
      transfer_date: string;
      approved_items: Array<{
        requisition_item_id: number;
        product_variant_id: number;
        requested_qty: number;
        approved_qty: number;
        remarks: string;
      }>;
      remarks?: string;
    };
  }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requisitionId = parseInt(req.body.id);
    const { transfer_date, approved_items, remarks } = req.body;
    const userId = (req.user as any)?.id;

    // 1. Get requisition details
    const requisitionResult = await client.query(
      "SELECT * FROM requisition WHERE id = $1",
      [requisitionId]
    );

    if (requisitionResult.rows.length === 0) {
      throw new Error("Requisition not found");
    }

    const requisition = requisitionResult.rows[0];

    // Validate requisition status
    if (requisition.status === "APPROVED") {
      throw new Error("Requisition already approved");
    }

    if (requisition.status === "COMPLETED") {
      throw new Error("Requisition already completed");
    }

    if (requisition.status === "CANCELLED") {
      throw new Error("Cannot approve cancelled requisition");
    }

    // Validate items
    if (!approved_items || approved_items.length === 0) {
      throw new Error("No items to approve");
    }

    const fromBranchId = requisition.from_branch_id;
    const toBranchId = requisition.to_branch_id;

    // 2. Create Product Transfer
    const transferCode = await generatePrefixedId("product_transfer", "TRF");
    const transfer = await productTransferModel.create(
      {
        code: transferCode,
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        transfer_date: transfer_date,
        reference_id: requisition.code,
        status: "RECEIVED", // Auto-complete since we're processing immediately
        created_by: userId,
      },
      client
    );

    const transferId = transfer.id;
    await client.query(
      `UPDATE requisition 
         SET approve_by = $1 
         WHERE id = $2`,
      [userId, requisitionId]
    );
    // 3. Process each approved item
    for (const item of approved_items) {
      const { product_variant_id, approved_qty, requisition_item_id } = item;

      if (approved_qty <= 0) {
        continue; // Skip items with 0 or negative approved quantity
      }

      // 3.1 Update requisition item with approved quantity
      await client.query(
        `UPDATE requisition_items 
         SET approved_qty = $1 ,remarks=$2
         WHERE id = $3 AND requisition_id = $4`,
        [approved_qty, remarks, requisition_item_id, requisitionId]
      );

      // 3.2 Check stock availability in source branch
      const stockCheck = await client.query(
        `SELECT quantity FROM inventory_stock 
         WHERE branch_id = $1 AND product_variant_id = $2`,
        [fromBranchId, product_variant_id]
      );

      if (
        stockCheck.rows.length === 0 ||
        stockCheck.rows[0].quantity < approved_qty
      ) {
        throw new Error(
          `Insufficient stock for product variant ID ${product_variant_id} in source branch. ` +
            `Available: ${
              stockCheck.rows[0]?.quantity || 0
            }, Required: ${approved_qty}`
        );
      }

      // 3.3 Create transfer item
      await productTransferItemsModel.create(
        {
          transfer_id: transferId,
          product_variant_id,
          quantity: approved_qty,
        },
        client
      );

      // 3.4 Deduct stock from source branch
      await client.query(
        `UPDATE inventory_stock 
         SET quantity = quantity - $1 
         WHERE branch_id = $2 AND product_variant_id = $3`,
        [approved_qty, fromBranchId, product_variant_id]
      );

      // 3.5 Create stock transaction (OUT from source)
      await stockTransactionModel.create(
        {
          branch_id: fromBranchId,
          product_variant_id,
          type: "TRANSFER",
          reference_id: transferId,
          quantity: approved_qty,
          direction: "OUT",
        },
        client
      );

      // 3.6 Add stock to destination branch
      const destStockResult = await client.query(
        `INSERT INTO inventory_stock (branch_id, product_variant_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (branch_id, product_variant_id)
         DO UPDATE SET quantity = inventory_stock.quantity + $3
         RETURNING *`,
        [toBranchId, product_variant_id, approved_qty]
      );

      // 3.7 Create stock transaction (IN to destination)
      await stockTransactionModel.create(
        {
          branch_id: toBranchId,
          product_variant_id,
          type: "TRANSFER",
          reference_id: transferId,
          quantity: approved_qty,
          direction: "IN",
        },
        client
      );

      // 3.8 Create stock adjustment records for audit trail
      // Adjustment OUT for source branch
      await client.query(
        `INSERT INTO stock_transaction 
         (branch_id, product_variant_id, type,reference_id, quantity, direction)
         VALUES ($1, $2, 'TRANSFER', $3, $4, 'OUT')`,
        [fromBranchId, product_variant_id, transferId, approved_qty]
      );

      // Adjustment IN for destination branch
      await client.query(
        `INSERT INTO stock_transaction 
         (branch_id, product_variant_id, type,reference_id, quantity, direction)
         VALUES ($1, $2, 'TRANSFER', $3, $4, 'IN')`,
        [toBranchId, product_variant_id, transferId, approved_qty]
      );
    }

    // 4. Update requisition status
    await requisitionModel.update(
      requisitionId,
      {
        status: "COMPLETED",
        remarks: remarks || "Approved and transferred",
        updated_by: userId,
        updated_at: new Date(),
      },
      client
    );

    await client.query("COMMIT");

    // 5. Fetch complete data for response
    // const completeRequisition = await getRequisitionByIdHelper(
    //   requisitionId,
    //   client
    // );
    // const completeTransfer = await getTransferByIdHelper(transferId, client);

    reply.send({
      success: true,
      // data: {
      //   requisition: completeRequisition,
      //   transfer: completeTransfer,
      // },
      message: "Requisition approved and stock transferred successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Approve requisition error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
export async function listTransfers(req: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      from_branch_id,
      to_branch_id,
      start_date,
      end_date,
      search,
    } = req.body as any;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        pt.*,
        fb.name AS from_branch_name,
        fb.code AS from_branch_code,
        tb.name AS to_branch_name,
        tb.code AS to_branch_code,
        u.username AS created_by_name,
        
        -- Aggregate items info
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pti.id,
              'product_variant_id', pti.product_variant_id,
              'quantity', pti.quantity,
              'product_name', p.name,
              'variant_name', pv.name,
              'product_code', p.code,
              'variant_code', pv.code
            )
          )
          FROM product_transfer_items pti
          JOIN product_variant pv ON pv.id = pti.product_variant_id
          JOIN product p ON p.id = pv.product_id
          WHERE pti.transfer_id = pt.id
        ) AS items,

        -- Calculate total items and quantity
        (
          SELECT COUNT(*) 
          FROM product_transfer_items 
          WHERE transfer_id = pt.id
        ) AS total_items,
        
        (
          SELECT COALESCE(SUM(quantity), 0)
          FROM product_transfer_items 
          WHERE transfer_id = pt.id
        ) AS total_quantity

      FROM product_transfer pt
      LEFT JOIN branch fb ON fb.id = pt.from_branch_id
      LEFT JOIN branch tb ON tb.id = pt.to_branch_id
      LEFT JOIN users u ON u.id = pt.created_by
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM product_transfer pt
      WHERE 1=1
    `;

    const params: any[] = [];
    const countParams: any[] = [];

    // Add filters
    if (status) {
      query += ` AND pt.status = $${params.length + 1}`;
      countQuery += ` AND pt.status = $${countParams.length + 1}`;
      params.push(status);
      countParams.push(status);
    }

    if (from_branch_id) {
      query += ` AND pt.from_branch_id = $${params.length + 1}`;
      countQuery += ` AND pt.from_branch_id = $${countParams.length + 1}`;
      params.push(from_branch_id);
      countParams.push(from_branch_id);
    }

    if (to_branch_id) {
      query += ` AND pt.to_branch_id = $${params.length + 1}`;
      countQuery += ` AND pt.to_branch_id = $${countParams.length + 1}`;
      params.push(to_branch_id);
      countParams.push(to_branch_id);
    }

    if (start_date) {
      query += ` AND DATE(pt.transfer_date) >= $${params.length + 1}`;
      countQuery += ` AND DATE(pt.transfer_date) >= $${countParams.length + 1}`;
      params.push(start_date);
      countParams.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(pt.transfer_date) <= $${params.length + 1}`;
      countQuery += ` AND DATE(pt.transfer_date) <= $${countParams.length + 1}`;
      params.push(end_date);
      countParams.push(end_date);
    }

    if (search) {
      const searchParam = `%${search}%`;
      query += ` AND (
        pt.code ILIKE $${params.length + 1} OR
        pt.reference_id ILIKE $${params.length + 1} OR
        fb.name ILIKE $${params.length + 1} OR
        tb.name ILIKE $${params.length + 1}
      )`;
      countQuery += ` AND (
        pt.code ILIKE $${countParams.length + 1} OR
        pt.reference_id ILIKE $${countParams.length + 1}
      )`;
      params.push(searchParam);
      countParams.push(searchParam);
    }

    // Add ordering and pagination
    query += ` ORDER BY pt.transfer_date DESC, pt.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    // Execute queries
    const [transfersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    const response = {
      data: transfersResult.rows,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_items: total,
        total_pages: totalPages,
        has_previous: pageNum > 1,
        has_next: pageNum < totalPages,
      },
    };

    reply.send(
      successResponse(response, "Transfers list retrieved successfully")
    );
  } catch (err: any) {
    console.error("List transfers error:", err);
    reply.status(400).send({ success: false, message: err.message });
  }
}
