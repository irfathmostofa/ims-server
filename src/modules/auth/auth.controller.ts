import { FastifyRequest, FastifyReply } from "fastify";
import { CrudModel } from "../../core/models/crud.model";
import bcrypt from "bcrypt";

const userModel = new CrudModel("users");

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const { phone, password } = req.body as any;

  const users = await userModel.findByField("phone", phone);
  if (!users.length) return reply.code(400).send({ message: "User not found" });

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return reply.code(400).send({ message: "Invalid credentials" });

  const token = await reply.jwtSign(user);
  reply.send({ token });
}

export async function profile(req: FastifyRequest, reply: FastifyReply) {
  reply.send({ user: req.user });
}
