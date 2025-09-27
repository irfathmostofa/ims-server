import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";
import { productCatModel, UomModel } from "./product.model";

// ========== Product Category ==========
export async function createProductCat(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("product_category", "PCAT");
    const newData = await productCatModel.create(fields);
    reply.send(
      successResponse(newData, "Product Category created successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getProductCat(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await productCatModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductCat(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await productCatModel.update(id, fields);
    reply.send(
      successResponse(updated, "Product Category updated successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductCat(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await productCatModel.delete(id);
    reply.send(
      successResponse(deleted, "Product Category deleted successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
// ==========  UOM ==========
export async function createUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("uom", "UOM");
    const newData = await UomModel.create(fields);
    reply.send(
      successResponse(newData, "Unit Of masurement created successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await UomModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await UomModel.update(id, fields);
    reply.send(
      successResponse(updated, "Unit Of masurement updated successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteUOM(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await UomModel.delete(id);
    reply.send(
      successResponse(deleted, "Unit Of masurement deleted successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
