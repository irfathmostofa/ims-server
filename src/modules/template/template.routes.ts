import { FastifyInstance } from "fastify";
import {
  createTemplate,
  createTemplateSection,
  deleteTemplates,
  deleteTemplatesSection,
  getTemplateById,
  getTemplates,
  updateTemplates,
  updateTemplatesSection,
} from "./template.controller";
export default async function templateRoutes(app: FastifyInstance) {
  // app.addHook("onRequest", app.authenticate);

  app.post("/template", { preHandler: [app.authenticate] }, createTemplate);
  app.get("/get-template", getTemplates);
  app.post(
    "/update-template",
    { preHandler: [app.authenticate] },
    updateTemplates
  );
  app.post(
    "/delete-template",
    { preHandler: [app.authenticate] },
    deleteTemplates
  );

  app.post(
    "/template-section",
    { preHandler: [app.authenticate] },
    createTemplateSection
  );
  app.post("/get-template-by-id", getTemplateById);
  app.post(
    "/update-template-section",
    { preHandler: [app.authenticate] },
    updateTemplatesSection
  );
  app.post(
    "/delete-template-section",
    { preHandler: [app.authenticate] },
    deleteTemplatesSection
  );
}
