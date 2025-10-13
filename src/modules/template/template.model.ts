import { CrudModel } from "../../core/models/crud.model";

export const templateModel = new CrudModel(
  "template",
  ["template_name"],
  ["template_name"],
  ["description", "status", "created_by", "last_update"]
);

export const templateSectionModel = new CrudModel(
  "template_section",
  [
    "template_id",
    "section_name",
    "section_key",
    "section_type",
    "config_data",
    "sort_order",
  ],
  [],
  ["status", "created_by", "creation_date", "last_update", "last_update_date"]
);
