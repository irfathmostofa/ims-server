import { FastifyInstance } from "fastify";
import {
  addStock,
  listStock,
  createStockTransaction,
  createProductTransfer,
  receiveProductTransfer,
  cancelProductTransfer,
  getStockAdjustments,
  saleStock,
  transferStock,
  adjustStock,
  returnStock,
  createRequisition,
  getRequisitionById,
  approveAndTransferRequisition,
  getRequisition,
} from "./inventory.controller";

export async function inventoryRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  // Inventory Stock
  app.post("/stock", addStock);
  app.get("/stock", listStock);
  app.get("/stock/adjustments", getStockAdjustments);
  // Stock Transactions
  app.post("/create-stock/transaction", createStockTransaction);

  // Product Transfers
  app.post("/create-transfer", createProductTransfer);
  app.post("/receive-transfer/:id/receive", receiveProductTransfer);
  app.post("/cancel-transfer/:id/cancel", cancelProductTransfer);

  app.post("/sale-stock", saleStock);
  app.post("/transfer-stock", transferStock);
  app.post("/adjust-stock", adjustStock);
  app.post("/return-stock", returnStock);

  // requisition

  app.post("/create-requisition", createRequisition);
  app.get("/get-requisition", getRequisitionById);
  app.get("/get-all-requisition", getRequisition);
  app.post("/approve-requisition", approveAndTransferRequisition);
}
