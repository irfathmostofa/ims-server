import { FastifyInstance } from "fastify";
import { createBranche, createCompany, createRoles } from "./setup.controller";

export default async function setupRoutes(app: FastifyInstance) {
  app.post("/create-company", createCompany);
  app.post("/create-branch", createBranche);
  app.post("/create-role", createRoles);
}
