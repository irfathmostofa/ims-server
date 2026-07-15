import { CrudModel } from "../../core/models/crud.model";

export const companyModel = new CrudModel(
  "company",
  ["code", "name", "address", "phone", "email"], //required
  ["code", "phone", "email", "website"], //unique
  ["logo"], //optional
);

export const brancheModel = new CrudModel(
  "branch",
  ["code", "company_id", "name", "type", "address", "phone"],
  ["code", "phone"],
);
export const roleModel = new CrudModel(
  "role",
  ["code", "name"],
  ["code"],
  ["description"],
);

export const setupDataModel = new CrudModel(
  "setup_data",
  ["key_name", "value"],
  ["code"],
  ["code", "group_name", "status", "created_by", "updated_by"],
);
export const deliveryMethodModel = new CrudModel(
  "delivery_method",
  ["code", "name"],
  [],
  [
    "api_base_url",
    "api_key",
    "api_secret",
    "auth_token",
    "token_expiry",
    "status",
    "created_by",
    "created_at",
  ],
);

export const paymentMethodModel = new CrudModel(
  "payment_method",
  ["code", "name", "type", "provider"],
  ["code", "name"],
  ["status", "created_by", "created_at"],
);
