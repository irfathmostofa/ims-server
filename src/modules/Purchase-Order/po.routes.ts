import { FastifyInstance } from "fastify";
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  getAllPurchaseOrders,
  getPendingOrders,
  getPurchaseOrderById,
  getPurchaseOrderSummary,
  receiveOrderItems,
  updateOrderStatus,
  updatePurchaseOrder,
} from "./po.controller";

export default async function poRoutes(app: FastifyInstance) {
  // Core CRUD
  app.post("/purchase-orders ", createPurchaseOrder);
  app.get("/purchase-orders ", getAllPurchaseOrders);
  app.get("/purchase-orders/:id", getPurchaseOrderById);
  app.post("/update-purchase-orders/:id", updatePurchaseOrder);
  app.post("/delete-purchase-orders", deletePurchaseOrder);
  // Operations
  app.post("/purchase-orders/:id/status", updateOrderStatus);
  app.post("/purchase-orders/:id/receive", receiveOrderItems);
  // Reports
  app.post("/purchase-orders-summary", getPurchaseOrderSummary);
  app.post("/purchase-orders/pending ", getPendingOrders);
}
