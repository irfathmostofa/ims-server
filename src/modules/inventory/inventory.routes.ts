import { FastifyInstance } from "fastify";
import {
  addStock,
  listStock,
  createStockTransaction,
  createProductTransfer,
  receiveProductTransfer,
  cancelProductTransfer,
  getStockAdjustments,
} from "./inventory.controller";

export async function inventoryRoutes(app: FastifyInstance) {
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
}
