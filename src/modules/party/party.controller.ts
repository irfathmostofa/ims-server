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
        p.*,
        COALESCE(SUM(CASE 
          WHEN i.type = 'SALE' THEN i.due_amount 
          ELSE 0 
        END), 0) as total_receivable,
        COALESCE(SUM(CASE 
          WHEN i.type = 'PURCHASE' THEN i.due_amount 
          ELSE 0 
        END), 0) as total_payable,
        COUNT(i.id) as total_invoices
      FROM party p
      LEFT JOIN invoice i ON p.id = i.party_id
      WHERE p.id = $1 AND p.type = $2
      GROUP BY p.id
    `,
      [id, type],
    );

    reply.send(successResponse(data.rows[0]));
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
