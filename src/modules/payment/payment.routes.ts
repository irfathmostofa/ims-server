import { FastifyInstance } from "fastify";
import { callback, initiatePayment } from "./payment.controller";

export default async function paymentRoute(app: FastifyInstance) {
  // Initiate payment
  app.post("/initiate", { preHandler: [app.authenticate] }, initiatePayment);

  // Callback endpoint (handles all callbacks)
  app.all("/callback", callback);
}
