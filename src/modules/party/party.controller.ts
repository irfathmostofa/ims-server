import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import { partyModel } from "./party.model";
import pool from "../../config/db";

// ========== Product Category ==========
export async function createParty(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;

    fields.code = await generatePrefixedId(
      "party",
      fields.type === "CUSTOMER" ? "CUS" : "SUP",
    );
    const newData = await partyModel.create(fields);
    reply.send(
      successResponse(
        newData,
        `${
          fields.type === "CUSTOMER" ? "Customer" : "Supplier"
        } created successfully`,
      ),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getParty(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    const data = await partyModel.findByField("type", fields.type);
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getPartyById(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id, type } = req.body as { id: number; type: string };

    const data = await pool.query(
      `
      SELECT 
        (
          SELECT json_build_object(
            'id', p.id,
            'code', p.code,
            'name', p.name,
            'type', p.type,
            'phone', p.phone,
            'email', p.email,
            'address', p.address,
            'credit_limit', p.credit_limit,
            'loyalty_points', p.loyalty_points,
            'status', p.status,
            'branch_name', b.name,
            'created_at', p.created_at
          )
          FROM party p
          LEFT JOIN branch b ON p.branch_id = b.id
          WHERE p.id = $1 AND p.type = $2
        ) as info,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pm.id,
              'invoice_code', i.code,
              'invoice_type', i.type,
              'method', pm.method,
              'amount', pm.amount,
              'payment_date', pm.payment_date,
              'reference_no', pm.reference_no,
              'created_by_name', u.username,
              'created_at', pm.created_at
            ) ORDER BY pm.payment_date DESC
          ), '[]'::json)
          FROM payments pm
          JOIN invoice i ON pm.invoice_id = i.id
          JOIN users u ON pm.created_by = u.id
          WHERE i.party_id = $1
        ) as payments,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', i.id,
              'code', i.code,
              'type', i.type,
              'invoice_date', i.invoice_date,
              'total_amount', i.total_amount,
              'paid_amount', i.paid_amount,
              'due_amount', i.due_amount,
              'status', i.status,
              'created_by_name', creator.username,
              'created_at', i.created_at,
              'items', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'product_variant_id', ii.product_variant_id,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'discount', ii.discount,
                    'subtotal', ii.subtotal
                  )
                ), '[]'::json)
                FROM invoice_items ii
                WHERE ii.invoice_id = i.id
              )
            ) ORDER BY i.invoice_date DESC
          ), '[]'::json)
          FROM invoice i
          LEFT JOIN users creator ON i.created_by = creator.id
          WHERE i.party_id = $1
        ) as invoices,
        (
          SELECT json_build_object(
            'total_outstanding', COALESCE(SUM(CASE WHEN i.status IN ('DUE', 'PARTIAL') THEN i.due_amount ELSE 0 END), 0),
            'total_sales', COALESCE(SUM(CASE WHEN i.type = 'SALE' THEN i.total_amount ELSE 0 END), 0),
            'total_purchases', COALESCE(SUM(CASE WHEN i.type = 'PURCHASE' THEN i.total_amount ELSE 0 END), 0),
            'total_invoices', COUNT(DISTINCT i.id),
            'total_payments', (
              SELECT COALESCE(SUM(amount), 0)
              FROM payments pm
              JOIN invoice inv ON pm.invoice_id = inv.id
              WHERE inv.party_id = $1
            ),
            'credit_utilization', CASE 
              WHEN (SELECT credit_limit FROM party WHERE id = $1) > 0 
              THEN ROUND((COALESCE(SUM(CASE WHEN i.status IN ('DUE', 'PARTIAL') THEN i.due_amount ELSE 0 END), 0) / 
                (SELECT credit_limit FROM party WHERE id = $1)) * 100, 2)
              ELSE 0
            END
          )
          FROM invoice i
          WHERE i.party_id = $1
        ) as summary,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', i.id,
              'code', i.code,
              'type', i.type,
              'invoice_date', i.invoice_date,
              'total_amount', i.total_amount,
              'due_amount', i.due_amount,
              'status', i.status,
              'days_overdue', CURRENT_DATE - i.invoice_date
            ) ORDER BY i.invoice_date DESC
          ), '[]'::json)
          FROM invoice i
          WHERE i.party_id = $1 
          AND i.status IN ('DUE', 'PARTIAL')
        ) as outstanding_invoices
    `,
      [id, type],
    );

    const result = {
      info: data.rows[0].info || {},
      payments: data.rows[0].payments || [],
      invoices: data.rows[0].invoices || [],
      summary: data.rows[0].summary || {},
      outstanding_invoices: data.rows[0].outstanding_invoices || [],
    };

    reply.send(successResponse(result));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateParty(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await partyModel.update(id, fields);

    reply.send(
      successResponse(
        updated,
        `${
          fields.type === "CUSTOMER" ? "Customer" : "Supplier"
        } updated successfully"`,
      ),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteParty(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await partyModel.delete(id);
    reply.send(successResponse(deleted, "Data deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
