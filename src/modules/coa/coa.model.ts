import { CrudModel } from "../../core/models/crud.model";

// ===== MODEL DEFINITIONS =====
export const coaModel = new CrudModel(
  "coa",
  ["code", "name", "type"],
  ["code"],
  ["parent_id", "created_by"]
);

export const journalEntryModel = new CrudModel(
  "journal_entry",
  ["code", "entry_date"],
  ["code"],
  ["reference_type", "reference_id", "created_by"]
);

export const journalLineModel = new CrudModel(
  "journal_lines",
  ["journal_id", "account_id"],
  [],
  ["debit", "credit", "created_by"]
);
