import { FastifyInstance } from "fastify";
import {
  cancelOrder,
  createOnlineOrder,
  getAllOrders,
  getCustomerOrder,
  recordOrderPayment,
  updateDeliveryStatus,
  updateOrderStatus,
} from "./order.controller";

export default async function orderRoutes(app: FastifyInstance) {
  // app.addHook("onRequest", app.authenticate);
  app.post("/create-order", createOnlineOrder);
  app.post("/update-order-status", updateOrderStatus);
  app.post("/update-delivery-status", updateDeliveryStatus);
  app.post("/record-payment", recordOrderPayment);
  app.post("/get-all-order", getAllOrders);
  app.post("/cancel-order", cancelOrder);
  app.get("/get-order/:id", getCustomerOrder);
}
