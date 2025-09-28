import { CrudModel } from "../../core/models/crud.model";

// ========== Initialize Models ==========
export const purchaseOrderModel = new CrudModel(
  "purchase_order",
  ["branch_id", "supplier_id"], // required fields
  ["code"], // unique fields
  [
    "order_date",
    "expected_date",
    "delivery_date",
    "total_amount",
    "tax_amount",
    "discount_amount",
    "status",
    "notes",
    "created_by",
  ] // optional fields
);

export const purchaseOrderItemModel = new CrudModel(
  "purchase_order_items",
  ["order_id", "product_variant_id", "quantity", "unit_price"], // required fields
  [], // unique fields
  ["discount", "tax_rate", "received_quantity", "notes"] // optional fields
);
