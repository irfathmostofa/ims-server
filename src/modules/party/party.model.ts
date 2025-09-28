import { CrudModel } from "../../core/models/crud.model";
export const partyModel = new CrudModel(
  "party",
  ["code", "branch_id", "type", "name", "phone"],
  ["name", "phone", "email"],
  ["address", "email", "credit_limit", "loyalty_points", "status"]
);
