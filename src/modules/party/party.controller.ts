import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import { partyModel } from "./party.model";

// ========== Product Category ==========
export async function createParty(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;

    fields.code = await generatePrefixedId(
      "party",
      fields.type === "CUSTOMER" ? "CUS" : "SUP"
    );
    const newData = await partyModel.create(fields);
    reply.send(
      successResponse(
        newData,
        `${
          fields.type === "CUSTOMER" ? "Customer" : "Supplier"
        } created successfully`
      )
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
        } updated successfully"`
      )
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
