import { CrudModel } from "../../core/models/crud.model";

export const companyModel = new CrudModel(
  "company",
  [
    "code",
    "name",
    "address",
    "phone",
    "email",
    "logo",
    "website",
    "created_by",
  ],
  ["code", "name", "address", "phone", "email"]
);

export const brancheModel = new CrudModel(
  "branch",
  ["code", "company_id", "name", "type", "address", "phone", "created_by"],
  ["code", "company_id", "name", "type", "address", "phone", "created_by"]
);
export const roleModel = new CrudModel(
  "role",
  ["code", "name", "description"],
  ["code", "name"]
);
