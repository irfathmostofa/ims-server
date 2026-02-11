import { FastifyInstance } from "fastify";
import {
  CreateMarketingMessages,
  deleteMarketingMessages,
  getMarketingMessages,
  updateMarketingMessages,
} from "./marketing.controller";
import { sendWhatsAppMessage } from "./whatsapp.service";
import {
  sendBulk,
  sendOffer,
  sendOTP,
  sendSMS,
  sendTransactionAlert,
  sendWarning,
} from "./sms.controller";
export default async function marketingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.post("/create-marketing-msg", CreateMarketingMessages);
  app.post("/get-marketing-msg", getMarketingMessages);
  app.post("/update-marketing-msg", updateMarketingMessages);
  app.post("/delete-marketing-msg", deleteMarketingMessages);
  app.post("/send-msg", sendWhatsAppMessage);
  app.post("/send-sms", sendSMS);
  app.post("/send-otp", sendOTP);
  app.post("/send-offer", sendOffer);
  app.post("/send-warning", sendWarning);
  app.post("/send-transaction-alert", sendTransactionAlert);
  app.post("/send-bulk", sendBulk);
}
