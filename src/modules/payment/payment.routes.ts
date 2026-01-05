import { FastifyInstance } from "fastify";
import { callback, initiatePayment } from "./payment.controller";

export default async function paymentRoute(app: FastifyInstance) {
  // Initiate payment
  app.post(
    "/initiate",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "orderId",
            "amount",
            "customerName",
            "customerEmail",
            "customerPhone",
          ],
          properties: {
            orderId: { type: "string" },
            amount: { type: "number", minimum: 10, maximum: 500000 },
            customerName: { type: "string" },
            customerEmail: { type: "string", format: "email" },
            customerPhone: { type: "string" },
            customerAddress: { type: "string" },
            productName: { type: "string" },
            productCategory: { type: "string" },
          },
        },
      },
    },
    initiatePayment
  );

  // Callback endpoint (handles all callbacks)
  app.all("/callback", callback);
}
