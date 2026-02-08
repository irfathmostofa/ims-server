import { FastifyInstance } from "fastify";
import {
  CreateMarketingMessages,
  deleteMarketingMessages,
  getMarketingMessages,
  updateMarketingMessages,
} from "./marketing.controller";
import { sendWhatsAppMessage } from "./whatsapp.service";
export default async function marketingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.post("/create-marketing-msg", CreateMarketingMessages);
  app.get("/get-marketing-msg", getMarketingMessages);
  app.post("/update-marketing-msg", updateMarketingMessages);
  app.post("/delete-marketing-msg", deleteMarketingMessages);
  app.post("/send-msg", sendWhatsAppMessage);
}
