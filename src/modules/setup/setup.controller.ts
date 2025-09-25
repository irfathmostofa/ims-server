import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";

import { brancheModel, companyModel, roleModel } from "./setup.model";

// ========== COMPANY ==========
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

export async function getCompanies(req: FastifyRequest, reply: FastifyReply) {
  try {
    const companies = await companyModel.findAll();
    reply.send(successResponse(companies));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateCompany(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await companyModel.update(id, fields);
    reply.send(successResponse(updated, "Company updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteCompany(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await companyModel.delete(id);
    reply.send(successResponse(deleted, "Company deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== BRANCH ==========
export async function createBranche(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("branch", "BR");
    const newData = await brancheModel.create(fields);
    reply.send(successResponse(newData, "Branch created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getBranches(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await brancheModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateBranche(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await brancheModel.update(id, fields);
    reply.send(successResponse(updated, "Branch updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteBranche(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const deleted = await brancheModel.delete(id);
    reply.send(successResponse(deleted, "Branch deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== ROLE ==========
export async function createRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("role", "ROLE");
    const newData = await roleModel.create(fields);
    reply.send(successResponse(newData, "Role created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getRoles(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await roleModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await roleModel.update(id, fields);
    reply.send(successResponse(updated, "Role updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const deleted = await roleModel.delete(id);
    reply.send(successResponse(deleted, "Role deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
