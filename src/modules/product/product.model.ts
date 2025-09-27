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
