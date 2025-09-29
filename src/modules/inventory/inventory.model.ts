import { CrudModel } from "../../core/models/crud.model";

// Inventory Stock
export const inventoryStockModel = new CrudModel(
  "inventory_stock",
  ["branch_id", "product_variant_id"],
  ["branch_id,product_variant_id"], // unique constraint
  ["quantity"]
);

// Stock Transactions
export const stockTransactionModel = new CrudModel(
  "stock_transaction",
  ["branch_id", "product_variant_id", "type", "quantity", "direction"],
  [],
  ["reference_id"]
);

// Product Transfer
export const productTransferModel = new CrudModel(
  "product_transfer",
  ["from_branch_id", "to_branch_id", "transfer_date"],
  ["reference_no"],
  ["status"]
);

// Product Transfer Items
export const productTransferItemsModel = new CrudModel(
  "product_transfer_items",
  ["transfer_id", "product_variant_id", "quantity"],
  [],
  []
);
