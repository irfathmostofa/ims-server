import { CrudModel } from "../../core/models/crud.model";

export const userModel = new CrudModel(
  "users",
  [
    "code",
    "branch_id",
    "username",
    "phone",
    "address",
    "password_hash",
    "role_id",
  ],
  ["username", "phone"]
);
export const customerModel = new CrudModel(
  "customer",
  ["code", "full_name", "phone", "password_hash"],
  ["email", "phone"],
  ["email"]
);
export const customerAddressModel = new CrudModel(
  "customer_address",
  ["customer_id", "label", "address_line", "postal_code"],
  [],
  ["city", "area"]
);
