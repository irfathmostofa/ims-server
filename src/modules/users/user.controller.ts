import { FastifyReply, FastifyRequest } from "fastify";
import { CrudModel } from "../../core/models/crud.model";
import { successResponse } from "../../core/utils/response";
import bcrypt from "bcrypt";
import { generatePrefixedId } from "../../core/models/idGenerator";

const userModel = new CrudModel(
  "users",
  ["username", "email", "password", "branch_id", "role_id"],
  ["username", "email"]
);

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

    userData.password = await bcrypt.hash(userData.password, 10);
    userData.user_id = await generatePrefixedId("users", "USER");

    const newUser = await userModel.create(userData);
    reply.send(successResponse(newUser, "User created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
