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
