import { FastifyInstance } from "fastify";
import {
  createBranche,
  createCompany,
  createRoles,
  getBranch,
  getRoles,
} from "./setup.controller";

export default async function setupRoutes(app: FastifyInstance) {
  app.post("/create-company", createCompany);
  app.post("/create-branch", createBranche);
  app.post("/get-branch", getBranch);
  app.post("/create-role", createRoles);
  app.post("/get-role", getRoles);
}
