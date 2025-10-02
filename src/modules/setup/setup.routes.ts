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
  createSetupData,
  bulkCreateSetupData,
  getAllSetupData,
  getGroupedSetupData,
  getSetupByKey,
  getSetupData,
  updateSetupData,
  deleteSetupData,
  getActivityLogs,
  getActivityStats,
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
  // activityLog
  app.get("/get-activity", getActivityLogs);
  app.get("/get-activity-stats", getActivityStats);
  // setupData
  app.post("/create-setup", createSetupData);
  app.post("/create-setup-bulk", bulkCreateSetupData);
  app.get("/get-setup-data", getAllSetupData);
  app.get("/get-setup-data-grouped", getGroupedSetupData);
  app.get("/get-setup-data-by-key", getSetupByKey);
  app.get("/get-setup-data-by/:id", getSetupData);
  app.post("/update-setup-data/:id", updateSetupData);
  app.post("/delete-setup-data", deleteSetupData);
}
