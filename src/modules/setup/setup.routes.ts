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
  app.get("/companies", getCompanies);
  app.put("/companies/:id", updateCompany);
  app.delete("/companies/:id", deleteCompany);

  // BRANCH
  app.post("/branches", createBranche);
  app.get("/branches", getBranches);
  app.put("/branches/:id", updateBranche);
  app.delete("/branches/:id", deleteBranche);

  // ROLE
  app.post("/roles", createRole);
  app.get("/roles", getRoles);
  app.put("/roles/:id", updateRole);
  app.delete("/roles/:id", deleteRole);
}
