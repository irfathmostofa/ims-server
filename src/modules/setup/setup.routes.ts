import { FastifyInstance } from "fastify";
import {
  createBranche,
  createCompany,
  createRole,
  getBranches,
  getCompanies,
  getRoles,
  updateCompany,
  deleteCompany,
  updateBranche,
  deleteBranche,
  updateRole,
  deleteRole,
} from "./setup.controller";

export default async function setupRoutes(app: FastifyInstance) {
  // app.addHook("onRequest", app.authenticate);
  // COMPANY
  app.post("/companies", createCompany);
  app.post("/companies", getCompanies);
  app.post("/companies/:id", updateCompany);
  app.post("/companies/:id", deleteCompany);

  // BRANCH
  app.post("/branches", createBranche);
  app.post("/branches", getBranches);
  app.post("/branches/:id", updateBranche);
  app.post("/branches/:id", deleteBranche);

  // ROLE
  app.post("/roles", createRole);
  app.get("/roles", getRoles);
  app.put("/roles/:id", updateRole);
  app.delete("/roles/:id", deleteRole);
}
