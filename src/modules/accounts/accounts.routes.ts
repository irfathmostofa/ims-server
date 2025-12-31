import { FastifyInstance } from "fastify";
import {
  createAccountHead,
  listAccountHeads,
  createAccount,
  listAccounts,
  createAccountingPeriod,
  listAccountingPeriods,
  createJournalEntry,
  listJournalEntries,
  updateAccountHead,
  deleteAccountHead,
  updateAccount,
  deleteAccount,
  updateAccountingPeriod,
  deleteAccountingPeriod,
  updateJournalEntry,
  deleteJournalEntry,
} from "./accounts.controller";

export async function accountRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  // Account Head
  app.post("/account-head", createAccountHead);
  app.get("/account-heads", listAccountHeads);
  app.post("update-account-head/:id", updateAccountHead);
  app.post("delete-account-head/:id", deleteAccountHead);
  // Accounts
  app.post("/account", createAccount);
  app.get("/accounts", listAccounts);
  app.post("update-account/:id", updateAccount);
  app.post("delete-account/:id", deleteAccount);

  // Accounting Periods
  app.post("/accounting-period", createAccountingPeriod);
  app.get("/accounting-periods", listAccountingPeriods);
  app.post("update-accounting-period/:id", updateAccountingPeriod);
  app.post("delete-accounting-period/:id", deleteAccountingPeriod);
  // Journal Entries
  app.post("/journal-entry", createJournalEntry);
  app.get("/journal-entries", listJournalEntries);
  app.post("update-journal-entry/:id", updateJournalEntry);
  app.post("delete-journal-entry/:id", deleteJournalEntry);
}
