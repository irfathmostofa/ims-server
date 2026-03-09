import { FastifyInstance } from "fastify";
import { DashboardStatastic } from "./dashboard.controller";

export async function DashboardRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.post("/get-dashboard-data", DashboardStatastic);
}
