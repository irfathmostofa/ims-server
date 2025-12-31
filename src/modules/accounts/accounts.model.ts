import { CrudModel } from "../../core/models/crud.model";

// Account Head
export const accountHeadModel = new CrudModel(
  "account_head",
  ["code", "name", "type"],
  ["code"],
  ["parent_id", "status"]
);

// Account
export const accountModel = new CrudModel(
  "account",
  ["branch_id", "head_id", "code", "name"],
  ["code"],
  ["account_no", "opening_balance", "opening_balance_type", "status"]
);

// Accounting Period
export const accountingPeriodModel = new CrudModel(
  "accounting_period",
  ["start_date", "end_date"],
  [],
  ["is_closed"]
);

// Journal Entry
export const journalEntryModel = new CrudModel(
  "journal_entry",
  ["branch_id", "entry_no", "entry_date", "period_id"],
  ["entry_no"],
  ["source_module", "source_id", "narration"]
);

// Journal Line
export const journalLineModel = new CrudModel(
  "journal_line",
  ["journal_entry_id", "account_id"],
  [],
  ["debit", "credit"]
);
