import { FastifyInstance } from "fastify";
import { login, profile } from "./auth.controller";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/login", login);
  fastify.post("/profile", { preHandler: [fastify.authenticate] }, profile);
}
