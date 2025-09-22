import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import bcrypt from "bcrypt";
import { generatePrefixedId } from "../../core/models/idGenerator";
import { userModel } from "./user.model";

export async function getUsers(req: FastifyRequest, reply: FastifyReply) {
  try {
    const users = await userModel.findAll();
    reply.send(successResponse(users));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userData = req.body as Record<string, any>;

    userData.password_hash = await bcrypt.hash(userData.password_hash, 10);
    userData.code = await generatePrefixedId("users", "USR");

    const newUser = await userModel.create(userData);
    reply.send(successResponse(newUser, "User created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
