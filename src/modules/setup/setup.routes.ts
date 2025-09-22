import { FastifyInstance } from "fastify";
import { createCompany } from "./setup.controller";

export default async function setupRoutes(app: FastifyInstance) {
  app.post("/create-company", createCompany);
}
