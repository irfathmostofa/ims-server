import { FastifyInstance } from "fastify";
import { login, profile } from "./auth.controller";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/login", login);
  fastify.get("/profile", { preHandler: [fastify.authenticate] }, profile);
}
