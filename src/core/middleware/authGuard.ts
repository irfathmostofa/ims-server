import { FastifyReply, FastifyRequest } from "fastify";

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ success: false, message: "Unauthorized" });
  }
}
