import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import pool from "../../config/db";
import {
  inventoryStockModel,
  productTransferItemsModel,
  productTransferModel,
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
    const { branch_id, product_variant_id } = req.query as any;
    const filters: Record<string, any> = {};
    if (branch_id) filters.branch_id = branch_id;
    if (product_variant_id) filters.product_variant_id = product_variant_id;

    const stocks = await inventoryStockModel.findWithPagination(
      1,
      1000,
      filters
    );
    reply.send(successResponse(stocks, "Stock list retrieved successfully"));
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
