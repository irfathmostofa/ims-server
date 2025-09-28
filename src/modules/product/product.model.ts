import { CrudModel } from "../../core/models/crud.model";
export const productCatModel = new CrudModel(
  "product_category",
  ["code", "name"],
  ["name"],
  ["parent_id"]
);
export const UomModel = new CrudModel(
  "uom",
  ["code", "name", "symbol"],
  ["name", "symbol"],
  ["description"]
);
// ========== Initialize Models ==========
export const productModel = new CrudModel(
  "product",
  ["name", "cost_price", "selling_price"], // required fields
  ["code"], // unique fields
  ["category_id", "uom_id", "description", "status"] // optional fields
);

export const productVariantModel = new CrudModel(
  "product_variant",
  ["product_id"], // required fields
  ["code"], // unique fields
  ["name", "additional_price", "status"] // optional fields
);

export const productImageModel = new CrudModel(
  "product_image",
  ["product_id", "url"], // required fields
  ["code"], // unique fields
  ["is_primary"] // optional fields
);

export const productBarcodeModel = new CrudModel(
  "product_barcode",
  ["product_variant_id", "barcode"], // required fields
  ["barcode"], // unique fields
  ["type", "is_primary", "created_by"] // optional fields
);
