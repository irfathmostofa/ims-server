import { FastifyInstance } from "fastify";
import {
  createGRN,
  createPurchaseOrder,
  deleteGRN,
  deletePurchaseOrder,
  getAllPurchaseOrders,
  getGRNById,
  getPendingOrders,
  getPurchaseOrderById,
  getPurchaseOrderSummary,
  listGRNs,
  receiveOrderItems,
  updateGRN,
  updateGRNStatus,
  updateOrderStatus,
  updatePurchaseOrder,
} from "./po.controller";

export default async function poRoutes(app: FastifyInstance) {
  // Core CRUD
  app.post("/purchase-orders", createPurchaseOrder);
  app.post("/get-purchase-orders", getAllPurchaseOrders);
  app.get("/purchase-orders/:id", getPurchaseOrderById);
  app.post("/update-purchase-orders/:id", updatePurchaseOrder);
  app.post("/delete-purchase-orders", deletePurchaseOrder);
  // Operations
  app.post("/purchase-orders/:id/status", updateOrderStatus);
  app.post("/purchase-orders/:id/receive", receiveOrderItems);
  // Reports
  app.post("/purchase-orders-summary", getPurchaseOrderSummary);
  app.post("/purchase-orders/pending ", getPendingOrders);
  //  GRN (Receive PO items)
  app.post("/grn", createGRN);
  app.get("/grn/:id", getGRNById);
  app.post("/update-grn/:id", updateGRN);
  app.post("/update-status-grn/:id/status", updateGRNStatus);
  app.post("/delete-grn", deleteGRN);
  app.post("/grns", listGRNs);
}
