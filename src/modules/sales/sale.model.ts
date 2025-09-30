import { CrudModel } from "../../core/models/crud.model";

// ===== MODEL DEFINITIONS =====
export const invoiceModel = new CrudModel(
  "invoice",
  ["code", "branch_id", "type", "total_amount"],
  ["code"],
  ["party_id", "invoice_date", "paid_amount", "status", "created_by"]
);

export const invoiceItemModel = new CrudModel(
  "invoice_items",
  ["invoice_id", "product_variant_id", "quantity", "unit_price"],
  [],
  ["discount", "created_by"]
);

export const paymentModel = new CrudModel(
  "payments",
  ["invoice_id", "method", "amount"],
  [],
  ["payment_date", "reference_no", "created_by"]
);
