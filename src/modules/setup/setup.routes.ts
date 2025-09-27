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
  app.get("/get-companies", getCompanies);
  app.post("/update-companies/:id", updateCompany);
  app.post("/delete-companies/:id", deleteCompany);

  // BRANCH
  app.post("/branches", createBranche);
  app.get("/get-branches", getBranches);
  app.post("/update-branches/:id", updateBranche);
  app.post("/delete-branches", deleteBranche);

  // ROLE
  app.post("/roles", createRole);
  app.get("/get-roles", getRoles);
  app.post("/update-roles/:id", updateRole);
  app.post("/delete-roles", deleteRole);
}
