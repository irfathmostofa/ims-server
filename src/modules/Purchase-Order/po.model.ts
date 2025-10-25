import { CrudModel } from "../../core/models/crud.model";

// ========== Initialize Models ==========
export const purchaseOrderModel = new CrudModel(
  "purchase_order",
  ["code", "branch_id", "supplier_id", "order_date"], // required fields
  ["code"], // unique fields
  ["expected_date", "delivery_date", "notes", "status"] // optional fields
);

export const purchaseOrderItemsModel = new CrudModel(
  "purchase_order_items",
  ["order_id", "product_variant_id", "quantity", "unit_price"],
  [], // no unique fields
  ["discount", "tax_rate", "notes"] // optional
);
export const grnModel = new CrudModel(
  "goods_received_note",
  ["code", "purchase_order_id", "received_by"], // required
  ["code"], // unique
  ["status", "notes", "received_date"] // optional
);

export const grnItemsModel = new CrudModel(
  "grn_items",
  ["grn_id", "product_variant_id", "ordered_quantity", "received_quantity"],
  [], // no unique fields
  ["notes"] // optional
);
