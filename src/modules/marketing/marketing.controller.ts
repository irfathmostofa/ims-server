import { FastifyReply, FastifyRequest } from "fastify";

import { successResponse } from "../../core/utils/response";
import { marketingMsgModel } from "./marketing.model";
import { generatePrefixedId } from "../../core/models/idGenerator";

export async function CreateMarketingMessages(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const fields = req.body as Record<string, any>;

    fields.code = await generatePrefixedId("marketing_messages", "MS");
    const newData = await marketingMsgModel.create(fields);
    reply.send(
      successResponse(newData, `Marketing Messages created successfully`),
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getMarketingMessages(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const fields = req.body as Record<string, any>;
    const data = await marketingMsgModel.findWithPagination(
      fields.page,
      fields.limit,
      fields.filters,
    );

    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateMarketingMessages(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await marketingMsgModel.update(id, fields);

    reply.send(successResponse(updated, `updated successfully"`));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteMarketingMessages(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await marketingMsgModel.delete(id);
    reply.send(successResponse(deleted, "Data deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
