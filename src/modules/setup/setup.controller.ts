import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";

import { imageUploader } from "../../core/utils/cloudinary";
import { brancheModel, companyModel, roleModel } from "./setup.model";

export async function createCompany(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;

    fields.code = await generatePrefixedId("company", "COM");

    const newCompany = await companyModel.create(fields);

    reply.send(successResponse(newCompany, "Company created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createBranche(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;

    fields.code = await generatePrefixedId("branch", "BR");

    const newData = await brancheModel.create(fields);

    reply.send(successResponse(newData, "branch created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getBranch(req: FastifyRequest, reply: FastifyReply) {
  try {
    const users = await brancheModel.findAll();
    reply.send(successResponse(users));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function createRoles(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;

    fields.code = await generatePrefixedId("role", "ROLE");

    const newData = await roleModel.create(fields);

    reply.send(successResponse(newData, "role created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getRoles(req: FastifyRequest, reply: FastifyReply) {
  try {
    const users = await roleModel.findAll();
    reply.send(successResponse(users));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
