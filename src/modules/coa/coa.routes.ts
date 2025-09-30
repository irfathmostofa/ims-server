import { FastifyInstance } from "fastify";
import {
  // COA Controllers
  createCOA,
  getAllCOA,
  getCOATree,
  getCOA,
  updateCOA,
  deleteCOA,
  getAccountBalance,
  getAccountLedger,
  // Journal Entry Controllers
  createJournalEntry,
  getJournalEntry,
  getAllJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  // Reports
  getTrialBalance,
} from "./coa.controller";

export default async function coaRoutes(fastify: FastifyInstance) {
  // ===== CHART OF ACCOUNTS (COA) ROUTES =====

  /**
   * Create new COA account
   * POST /api/coa
   * Body: { code, parent_id?, name, type }
   */
  fastify.post("/coa", createCOA);

  /**
   * Get all COA accounts (flat list) with filters
   * GET /api/coa?type=ASSET&parent_id=1&search=cash
   */
  fastify.get("/coa", getAllCOA);

  /**
   * Get COA hierarchy tree
   * GET /api/coa/tree?type=ASSET
   */
  fastify.get("/coa/tree", getCOATree);

  /**
   * Get account balance
   * GET /api/coa/:id/balance?from_date=2025-01-01&to_date=2025-12-31
   */
  fastify.get("/coa/:id/balance", getAccountBalance);

  /**
   * Get account ledger (statement)
   * GET /api/coa/:id/ledger?from_date=2025-01-01&to_date=2025-12-31&page=1&limit=50
   */
  fastify.get("/coa/:id/ledger", getAccountLedger);

  /**
   * Get single COA account by ID
   * GET /api/coa/:id
   */
  fastify.get("/coa/:id", getCOA);

  /**
   * Update COA account
   * PUT /api/coa/:id
   * Body: { code?, parent_id?, name?, type? }
   */
  fastify.put("/coa/:id", updateCOA);

  /**
   * Delete COA account
   * DELETE /api/coa/:id
   */
  fastify.delete("/coa/:id", deleteCOA);

  // ===== JOURNAL ENTRY ROUTES =====

  /**
   * Create journal entry
   * POST /api/journal-entries
   * Body: { entry_date?, reference_type?, reference_id?, lines[] }
   */
  fastify.post("/journal-entries", createJournalEntry);

  /**
   * Get all journal entries with filters
   * GET /api/journal-entries?page=1&limit=10&account_id=5&from_date=2025-01-01&to_date=2025-12-31
   */
  fastify.get("/journal-entries", getAllJournalEntries);

  /**
   * Get single journal entry by ID
   * GET /api/journal-entries/:id
   */
  fastify.get("/journal-entries/:id", getJournalEntry);

  /**
   * Update journal entry
   * PUT /api/journal-entries/:id
   * Body: { entry_date?, reference_type?, reference_id?, lines[]? }
   */
  fastify.put("/journal-entries/:id", updateJournalEntry);

  /**
   * Delete journal entry
   * DELETE /api/journal-entries/:id
   */
  fastify.delete("/journal-entries/:id", deleteJournalEntry);

  // ===== REPORTING ROUTES =====

  /**
   * Get trial balance
   * GET /api/reports/trial-balance?as_of_date=2025-12-31
   */
  fastify.get("/reports/trial-balance", getTrialBalance);
}

// ===== USAGE IN MAIN APP =====

/*
// app.ts or server.ts

import accountingRoutes from "./routes/accountingRoutes";
import { coaRoutes, journalRoutes, reportsRoutes } from "./routes/accounting";

// Option 1: Single route file
app.register(accountingRoutes, { prefix: "/api" });

// Option 2: Modular routes with prefixes
app.register(coaRoutes, { prefix: "/api/coa" });
app.register(journalRoutes, { prefix: "/api/journal-entries" });
app.register(reportsRoutes, { prefix: "/api/reports" });
*/

// ===== EXAMPLE REQUESTS =====

/*
// 1. Create Parent Account (Asset)
POST /api/coa
{
  "code": "1000",
  "name": "Assets",
  "type": "ASSET"
}

// 2. Create Child Account (Cash)
POST /api/coa
{
  "code": "1001",
  "parent_id": 1,
  "name": "Cash",
  "type": "ASSET"
}

// 3. Create Multiple Accounts
POST /api/coa
{
  "code": "2000",
  "name": "Liabilities",
  "type": "LIABILITY"
}

POST /api/coa
{
  "code": "3000",
  "name": "Revenue",
  "type": "INCOME"
}

POST /api/coa
{
  "code": "4000",
  "name": "Expenses",
  "type": "EXPENSE"
}

// 4. Get All Asset Accounts
GET /api/coa?type=ASSET

// 5. Get COA Tree
GET /api/coa/tree

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "1000",
      "name": "Assets",
      "type": "ASSET",
      "children": [
        {
          "id": 2,
          "code": "1001",
          "name": "Cash",
          "type": "ASSET"
        }
      ]
    },
    {
      "id": 3,
      "code": "2000",
      "name": "Liabilities",
      "type": "LIABILITY"
    }
  ]
}

// 6. Create Journal Entry (Sale Transaction)
POST /api/journal-entries
{
  "entry_date": "2025-09-30",
  "reference_type": "INVOICE",
  "reference_id": 123,
  "lines": [
    {
      "account_id": 2,
      "debit": 1000,
      "credit": 0
    },
    {
      "account_id": 5,
      "debit": 0,
      "credit": 1000
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "code": "JE-00001",
    "entry_date": "2025-09-30",
    "reference_type": "INVOICE",
    "reference_id": 123,
    "lines": [
      {
        "id": 1,
        "journal_id": 1,
        "account_id": 2,
        "account_name": "Cash",
        "account_code": "1001",
        "debit": "1000.00",
        "credit": "0.00"
      },
      {
        "id": 2,
        "journal_id": 1,
        "account_id": 5,
        "account_name": "Revenue",
        "account_code": "3000",
        "debit": "0.00",
        "credit": "1000.00"
      }
    ],
    "total_debit": 1000,
    "total_credit": 1000
  },
  "message": "Journal entry created successfully"
}

// 7. Get Journal Entries for Specific Account
GET /api/journal-entries?account_id=2&page=1&limit=10

// 8. Get Account Balance
GET /api/coa/2/balance?from_date=2025-01-01&to_date=2025-12-31

Response:
{
  "success": true,
  "data": {
    "account_id": 2,
    "account_name": "Cash",
    "account_type": "ASSET",
    "total_debit": 5000,
    "total_credit": 2000,
    "balance": 3000,
    "period": {
      "from": "2025-01-01",
      "to": "2025-12-31"
    }
  }
}

// 9. Get Account Ledger (Statement)
GET /api/coa/2/ledger?from_date=2025-01-01&to_date=2025-12-31&page=1&limit=50

Response:
{
  "success": true,
  "data": {
    "account": {
      "id": 2,
      "name": "Cash",
      "code": "1001",
      "type": "ASSET"
    },
    "opening_balance": 0,
    "entries": [
      {
        "journal_id": 1,
        "journal_code": "JE-00001",
        "entry_date": "2025-09-30",
        "reference_type": "INVOICE",
        "reference_id": 123,
        "debit": "1000.00",
        "credit": "0.00",
        "balance": 1000
      }
    ],
    "closing_balance": 1000
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}

// 10. Get Trial Balance
GET /api/reports/trial-balance?as_of_date=2025-12-31

Response:
{
  "success": true,
  "data": {
    "as_of_date": "2025-12-31",
    "accounts": [
      {
        "id": 2,
        "code": "1001",
        "name": "Cash",
        "type": "ASSET",
        "total_debit": "5000.00",
        "total_credit": "2000.00",
        "balance": "3000.00"
      },
      {
        "id": 5,
        "code": "3000",
        "name": "Revenue",
        "type": "INCOME",
        "total_debit": "0.00",
        "total_credit": "5000.00",
        "balance": "-5000.00"
      }
    ],
    "totals": {
      "total_debit": 5000,
      "total_credit": 5000
    },
    "is_balanced": true
  }
}

// 11. Update Journal Entry
PUT /api/journal-entries/1
{
  "entry_date": "2025-10-01",
  "lines": [
    {
      "account_id": 2,
      "debit": 1500,
      "credit": 0
    },
    {
      "account_id": 5,
      "debit": 0,
      "credit": 1500
    }
  ]
}

// 12. Update COA Account
PUT /api/coa/2
{
  "name": "Cash in Bank",
  "code": "1001-A"
}

// 13. Delete Journal Entry
DELETE /api/journal-entries/1

// 14. Delete COA Account
DELETE /api/coa/10

// 15. Search Accounts
GET /api/coa?search=cash

// 16. Get Root Accounts Only
GET /api/coa?parent_id=null

// 17. Get Asset Tree Only
GET /api/coa/tree?type=ASSET
*/

// ===== ROUTE PROTECTION (Optional) =====

/*
// Add authentication middleware
import { authenticate } from "../middleware/auth";

fastify.addHook("onRequest", authenticate);

// Or protect specific routes
fastify.post("/coa", { onRequest: [authenticate] }, createCOA);

// Role-based access
import { authorize } from "../middleware/authorize";

fastify.post("/journal-entries", {
  onRequest: [authenticate, authorize(["admin", "accountant"])]
}, createJournalEntry);

fastify.delete("/journal-entries/:id", {
  onRequest: [authenticate, authorize(["admin"])]
}, deleteJournalEntry);
*/
