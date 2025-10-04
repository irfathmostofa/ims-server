import pool from "../../config/db";
import { FastifyRequest, FastifyReply } from "fastify";
import { generatePrefixedId } from "../../core/models/idGenerator";
import { invoiceItemModel, invoiceModel, paymentModel } from "./sale.model";

// ===== TYPES =====
interface InvoiceItem {
  product_variant_id: number;
  quantity: number;
  unit_price: number;
  discount?: number;
}

interface Payment {
  method: "CASH" | "BANK" | "ONLINE";
  amount: number;
  reference_no?: string;
}

interface CreateInvoiceBody {
  branch_id: number;
  party_id?: number;
  type: "SALE" | "PURCHASE" | "EXPENSE";
  invoice_date?: string;
  items: InvoiceItem[];
  payments?: Payment[];
}

interface UpdateInvoiceBody {
  branch_id?: number;
  party_id?: number;
  invoice_date?: string;
  items?: InvoiceItem[];
}

// ===== HELPER FUNCTIONS =====

/**
 * Calculate invoice totals from items
 */
function calculateInvoiceTotals(items: InvoiceItem[]) {
  return items.reduce((total, item) => {
    const itemTotal = item.quantity * item.unit_price - (item.discount || 0);
    return total + itemTotal;
  }, 0);
}

/**
 * Update invoice status based on payments
 */
async function updateInvoiceStatus(invoiceId: number, client: any) {
  const invoice = await client.query(
    "SELECT total_amount, paid_amount, due_amount FROM invoice WHERE id = $1",
    [invoiceId]
  );

  if (invoice.rows.length === 0) return;

  const { total_amount, paid_amount } = invoice.rows[0];
  let status = "DUE";

  if (paid_amount >= total_amount) {
    status = "PAID";
  } else if (paid_amount > 0) {
    status = "PARTIAL";
  }

  await client.query("UPDATE invoice SET status = $1 WHERE id = $2", [
    status,
    invoiceId,
  ]);
}

// ===== INVOICE CONTROLLERS =====

/**
 * Create Invoice with Items and Payments
 */
export async function createInvoice(
  req: FastifyRequest<{ Body: CreateInvoiceBody }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { branch_id, party_id, type, invoice_date, items, payments } =
      req.body;

    // Validate user authentication
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new Error("Invoice must have at least one item");
    }

    // Calculate total amount
    const total_amount = calculateInvoiceTotals(items);

    // Generate invoice code
    const code = await generatePrefixedId("invoice", type.substring(0, 3));

    // Create invoice
    const invoice = await invoiceModel.create(
      {
        code,
        branch_id,
        party_id,
        type,
        invoice_date: invoice_date || new Date().toISOString().split("T")[0],
        total_amount,
        paid_amount: 0,
        status: "DUE",
        created_by: userId, // Safe to use now
      },
      client
    );

    const invoiceId = invoice.id;

    // Insert invoice items
    for (const item of items) {
      await invoiceItemModel.create(
        {
          invoice_id: invoiceId,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount:0,
        },
        client
      );
    }

    // Process payments if provided
    if (payments && payments.length > 0) {
      let totalPaid = 0;
      for (const payment of payments) {
        await paymentModel.create(
          {
            invoice_id: invoiceId,
            method: payment.method.toUpperCase() as "CASH" | "BANK" | "ONLINE", // ✅ Handle case insensitive
            amount: payment.amount,
            reference_no: payment.reference_no,
          },
          client
        );
        totalPaid += payment.amount;
      }

      // Update paid amount
      await client.query("UPDATE invoice SET paid_amount = $1 WHERE id = $2", [
        totalPaid,
        invoiceId,
      ]);

      // Update status
      await updateInvoiceStatus(invoiceId, client);
    }

    await client.query("COMMIT");

    // Fetch complete invoice data
    const completeInvoice = await getInvoiceById(invoiceId, client);

    reply.send({
      success: true,
      data: completeInvoice,
      message: `${type} invoice created successfully`,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Create invoice error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Get Invoice by ID with Items and Payments
 */
export async function getInvoiceById(invoiceId: number, client?: any) {
  const queryRunner = client || pool;

  // Get invoice
  const invoiceResult = await queryRunner.query(
    "SELECT * FROM invoice WHERE id = $1",
    [invoiceId]
  );

  if (invoiceResult.rows.length === 0) {
    return null;
  }

  const invoice = invoiceResult.rows[0];

  // Get items with product details
  const itemsResult = await queryRunner.query(
    `SELECT 
      ii.*,
      pv.name as variant_name,
      pv.code as variant_code,
      p.name as product_name
    FROM invoice_items ii
    JOIN product_variant pv ON ii.product_variant_id = pv.id
    JOIN product p ON pv.product_id = p.id
    WHERE ii.invoice_id = $1
    ORDER BY ii.id`,
    [invoiceId]
  );

  // Get payments
  const paymentsResult = await queryRunner.query(
    "SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC",
    [invoiceId]
  );

  return {
    ...invoice,
    items: itemsResult.rows,
    payments: paymentsResult.rows,
  };
}

/**
 * Get Single Invoice
 */
export async function getInvoice(
  req: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  try {
    const invoiceId = req.params.id;
    const invoice = await getInvoiceById(invoiceId);

    if (!invoice) {
      return reply.status(404).send({
        success: false,
        message: "Invoice not found",
      });
    }

    reply.send({
      success: true,
      data: invoice,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get All Invoices with Filters
 */
export async function getAllInvoices(
  req: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      type?: string;
      status?: string;
      branch_id?: string;
      party_id?: string;
      from_date?: string;
      to_date?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const {
      page = "1",
      limit = "10",
      type,
      status,
      branch_id,
      party_id,
      from_date,
      to_date,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (branch_id) {
      conditions.push(`branch_id = $${paramIndex++}`);
      values.push(parseInt(branch_id));
    }
    if (party_id) {
      conditions.push(`party_id = $${paramIndex++}`);
      values.push(parseInt(party_id));
    }
    if (from_date) {
      conditions.push(`invoice_date >= $${paramIndex++}`);
      values.push(from_date);
    }
    if (to_date) {
      conditions.push(`invoice_date <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM invoice ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get invoices
    const invoicesResult = await pool.query(
      `SELECT 
        i.*,
        b.name as branch_name,
        p.name as party_name
      FROM invoice i
      LEFT JOIN branch b ON i.branch_id = b.id
      LEFT JOIN party p ON i.party_id = p.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit), offset]
    );

    reply.send({
      success: true,
      data: invoicesResult.rows,
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

/**
 * Update Invoice (without items)
 */
export async function updateInvoice(
  req: FastifyRequest<{
    Params: { id: string };
    Body: UpdateInvoiceBody;
  }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const invoiceId = parseInt(req.params.id);
    const { branch_id, party_id, invoice_date, items } = req.body;

    // Update invoice basic info
    const updateData: any = {};
    if (branch_id) updateData.branch_id = branch_id;
    if (party_id !== undefined) updateData.party_id = party_id;
    if (invoice_date) updateData.invoice_date = invoice_date;
    updateData.updated_by = (req.user as { id: number }).id;

    if (Object.keys(updateData).length > 0) {
      await invoiceModel.update(invoiceId, updateData, client);
    }

    // Update items if provided
    if (items && items.length > 0) {
      // Delete old items
      await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [
        invoiceId,
      ]);

      // Insert new items
      for (const item of items) {
        await invoiceItemModel.create(
          {
            invoice_id: invoiceId,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            created_by: (req.user as { id: number }).id,
          },
          client
        );
      }

      // Recalculate total
      const total_amount = calculateInvoiceTotals(items);
      await client.query("UPDATE invoice SET total_amount = $1 WHERE id = $2", [
        total_amount,
        invoiceId,
      ]);

      // Update status
      await updateInvoiceStatus(invoiceId, client);
    }

    await client.query("COMMIT");

    const updatedInvoice = await getInvoiceById(invoiceId, client);

    reply.send({
      success: true,
      data: updatedInvoice,
      message: "Invoice updated successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Update invoice error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Delete Invoice
 */
export async function deleteInvoice(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const invoiceId = parseInt(req.params.id);

    // Check if invoice exists
    const invoice = await getInvoiceById(invoiceId, client);
    if (!invoice) {
      return reply.status(404).send({
        success: false,
        message: "Invoice not found",
      });
    }

    // Delete invoice (cascade will delete items and payments)
    await client.query("DELETE FROM invoice WHERE id = $1", [invoiceId]);

    await client.query("COMMIT");

    reply.send({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Delete invoice error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ===== PAYMENT CONTROLLERS =====

/**
 * Add Payment to Invoice
 */
export async function addPayment(
  req: FastifyRequest<{
    Params: { id: string };
    Body: Payment;
  }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const invoiceId = parseInt(req.params.id);
    const { method, amount, reference_no } = req.body;

    // Check if invoice exists
    const invoiceResult = await client.query(
      "SELECT * FROM invoice WHERE id = $1",
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Invoice not found",
      });
    }

    const invoice = invoiceResult.rows[0];

    // Check if payment exceeds due amount
    if (amount > invoice.due_amount) {
      throw new Error(
        `Payment amount (${amount}) exceeds due amount (${invoice.due_amount})`
      );
    }

    // Create payment
    const payment = await paymentModel.create(
      {
        invoice_id: invoiceId,
        method,
        amount,
        reference_no,
        created_by: (req.user as { id: number }).id,
      },
      client
    );

    // Update paid amount
    const newPaidAmount = parseFloat(invoice.paid_amount) + amount;
    await client.query("UPDATE invoice SET paid_amount = $1 WHERE id = $2", [
      newPaidAmount,
      invoiceId,
    ]);

    // Update status
    await updateInvoiceStatus(invoiceId, client);

    await client.query("COMMIT");

    reply.send({
      success: true,
      data: payment,
      message: "Payment added successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Add payment error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Get Invoice Payments
 */
export async function getInvoicePayments(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const invoiceId = parseInt(req.params.id);

    const paymentsResult = await pool.query(
      "SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC",
      [invoiceId]
    );

    reply.send({
      success: true,
      data: paymentsResult.rows,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Delete Payment
 */
export async function deletePayment(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const paymentId = parseInt(req.params.id);

    // Get payment details
    const paymentResult = await client.query(
      "SELECT * FROM payments WHERE id = $1",
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = paymentResult.rows[0];

    // Update invoice paid amount
    await client.query(
      "UPDATE invoice SET paid_amount = paid_amount - $1 WHERE id = $2",
      [payment.amount, payment.invoice_id]
    );

    // Delete payment
    await client.query("DELETE FROM payments WHERE id = $1", [paymentId]);

    // Update invoice status
    await updateInvoiceStatus(payment.invoice_id, client);

    await client.query("COMMIT");

    reply.send({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Delete payment error:", err);
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ===== REPORTING CONTROLLERS =====

/**
 * Get Invoice Summary
 */
export async function getInvoiceSummary(
  req: FastifyRequest<{
    Querystring: {
      type?: string;
      branch_id?: string;
      from_date?: string;
      to_date?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { type, branch_id, from_date, to_date } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (branch_id) {
      conditions.push(`branch_id = $${paramIndex++}`);
      values.push(parseInt(branch_id));
    }
    if (from_date) {
      conditions.push(`invoice_date >= $${paramIndex++}`);
      values.push(from_date);
    }
    if (to_date) {
      conditions.push(`invoice_date <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const summaryResult = await pool.query(
      `SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(due_amount), 0) as total_due,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'PARTIAL' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'DUE' THEN 1 END) as due_count
      FROM invoice
      ${whereClause}`,
      values
    );

    reply.send({
      success: true,
      data: summaryResult.rows[0],
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ===== EXAMPLE REQUEST BODIES =====

/*
// Create Invoice Example
{
  "branch_id": 1,
  "party_id": 5,
  "type": "SALE",
  "invoice_date": "2025-09-30",
  "items": [
    {
      "product_variant_id": 10,
      "quantity": 5,
      "unit_price": 150,
      "discount": 50
    },
    {
      "product_variant_id": 11,
      "quantity": 2,
      "unit_price": 200,
      "discount": 0
    }
  ],
  "payments": [
    {
      "method": "CASH",
      "amount": 500,
      "reference_no": "CASH-001"
    }
  ]
}

// Add Payment Example
{
  "method": "BANK",
  "amount": 500,
  "reference_no": "TXN123456"
}

// Update Invoice Example
{
  "branch_id": 2,
  "party_id": 6,
  "items": [
    {
      "product_variant_id": 10,
      "quantity": 10,
      "unit_price": 140,
      "discount": 100
    }
  ]
}
*/
