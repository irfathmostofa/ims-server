import { CrudModel } from "../../core/models/crud.model";
export const productCatModel = new CrudModel(
  "category", // table name
  ["name", "slug"], // required
  ["code"], // unique
  ["code", "parent_id"] // optional
);
export const UomModel = new CrudModel(
  "uom",
  ["code", "name", "symbol"],
  ["name", "symbol"],
  ["description"]
);
export const productModel = new CrudModel(
  "product",
  ["code", "uom_id", "name", "cost_price", "selling_price"], // required
  ["code"], // unique
  ["description", "status", "created_by", "updated_by"] // optional
);

export const productCategoryModel = new CrudModel(
  "product_categories",
  ["product_id", "category_id"],
  [],
  ["is_primary", "created_by"]
);

export const productVariantModel = new CrudModel(
  "product_variant",
  ["product_id", "code"],
  ["code"],
  ["name", "additional_price", "status", "created_by"]
);

export const productImageModel = new CrudModel(
  "product_image",
  ["product_id", "code", "url"],
  ["code"],
  ["alt_text", "is_primary", "status", "created_by"]
);

export const productBarcodeModel = new CrudModel(
  "product_barcode",
  ["product_variant_id", "barcode"],
  ["barcode"],
  ["type", "is_primary", "status", "created_by"]
);

export const productReviewModel = new CrudModel(
  "product_review",
  ["order_id", "product_id", "customer_id", "rating", "title", "comment"], // required
  [], // unique
  ["helpful_count", "status", "creation_date"] // optional
);
