import { CrudModel } from "../../core/models/crud.model";
export const partyModel = new CrudModel(
  "party",
  ["code", "branch_id", "type", "phone"],
  ["name", "phone", "email"],
  ["name","address", "email", "credit_limit", "loyalty_points", "status"]
);
