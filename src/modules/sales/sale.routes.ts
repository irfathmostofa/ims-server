import { FastifyInstance } from "fastify";
import {
  addPayment,
  createInvoice,
  deleteInvoice,
  deletePayment,
  getAllInvoices,
  getInvoice,
  getInvoicePayments,
  getInvoiceSummary,
  updateInvoice,
} from "./sale.controller";

export default async function invoiceRoutes(fastify: FastifyInstance) {
  // ===== INVOICE ROUTES =====

  fastify.post("/invoices", createInvoice);

  /**
   * Get all invoices with filters and pagination
   * GET /api/invoices?page=1&limit=10&type=SALE&status=PAID&branch_id=1&party_id=5&from_date=2025-01-01&to_date=2025-12-31
   */
  fastify.get("/invoices", getAllInvoices);

  /**
   * Get single invoice by ID with items and payments
   * GET /api/invoices/:id
   */
  fastify.get("/invoices/:id", getInvoice);

  /**
   * Update invoice details and/or items
   * PUT /api/invoices/:id
   * Body: { branch_id?, party_id?, invoice_date?, items[]? }
   */
  fastify.put("/invoices/:id", updateInvoice);

  /**
   * Delete invoice (cascades to items and payments)
   * DELETE /api/invoices/:id
   */
  fastify.delete("/invoices/:id", deleteInvoice);

  // ===== PAYMENT ROUTES =====

  /**
   * Add payment to invoice
   * POST /api/invoices/:id/payments
   * Body: { method, amount, reference_no? }
   */
  fastify.post("/invoices/:id/payments", addPayment);

  /**
   * Get all payments for an invoice
   * GET /api/invoices/:id/payments
   */
  fastify.get("/invoices/:id/payments", getInvoicePayments);

  /**
   * Delete a payment
   * DELETE /api/payments/:id
   */
  fastify.delete("/payments/:id", deletePayment);

  // ===== REPORTING ROUTES =====

  /**
   * Get invoice summary with filters
   * GET /api/invoices/summary?type=SALE&branch_id=1&from_date=2025-01-01&to_date=2025-12-31
   */
  fastify.get("/invoices/summary", getInvoiceSummary);
}

// ===== USAGE IN MAIN APP =====

/*
// app.ts or server.ts

import invoiceRoutes from "./routes/invoiceRoutes";
import { invoiceMainRoutes, paymentRoutes } from "./routes/invoice.routes";

// Option 1: Single route file
app.register(invoiceRoutes, { prefix: "/api" });

// Option 2: Multiple route files with prefix
app.register(invoiceMainRoutes, { prefix: "/api/invoices" });
app.register(paymentRoutes, { prefix: "/api" });
*/

// ===== EXAMPLE REQUESTS =====

/*
// 1. Create Invoice (Sale)
POST /api/invoices
{
  "branch_id": 1,
  "party_id": 5,
  "type": "SALE",
  "invoice_date": "2025-09-30",
  "items": [
    {
      "product_variant_id": 10,
      "quantity": 5,
      "unit_price": 150,
      "discount": 50
    },
    {
      "product_variant_id": 11,
      "quantity": 2,
      "unit_price": 200
    }
  ],
  "payments": [
    {
      "method": "CASH",
      "amount": 500,
      "reference_no": "CASH-001"
    }
  ]
}

// 2. Create Invoice (Purchase)
POST /api/invoices
{
  "branch_id": 1,
  "party_id": 8,
  "type": "PURCHASE",
  "items": [
    {
      "product_variant_id": 15,
      "quantity": 100,
      "unit_price": 50,
      "discount": 200
    }
  ]
}

// 3. Get All Sales Invoices
GET /api/invoices?type=SALE&page=1&limit=20

// 4. Get Paid Invoices for Branch
GET /api/invoices?branch_id=1&status=PAID&from_date=2025-01-01&to_date=2025-12-31

// 5. Get Invoice with Details
GET /api/invoices/123

// 6. Update Invoice Items
PUT /api/invoices/123
{
  "items": [
    {
      "product_variant_id": 10,
      "quantity": 10,
      "unit_price": 140,
      "discount": 100
    }
  ]
}

// 7. Add Payment to Invoice
POST /api/invoices/123/payments
{
  "method": "BANK",
  "amount": 500,
  "reference_no": "TXN123456"
}

// 8. Get Invoice Payments
GET /api/invoices/123/payments

// 9. Delete Payment
DELETE /api/payments/45

// 10. Get Sales Summary
GET /api/invoices/summary?type=SALE&from_date=2025-01-01&to_date=2025-12-31

Response:
{
  "success": true,
  "data": {
    "total_invoices": "150",
    "total_amount": "500000.00",
    "total_paid": "450000.00",
    "total_due": "50000.00",
    "paid_count": "120",
    "partial_count": "20",
    "due_count": "10"
  }
}

// 11. Delete Invoice
DELETE /api/invoices/123
*/

// ===== ROUTE PROTECTION (Optional) =====

/*
// Add authentication middleware
import { authenticate } from "../middleware/auth";

fastify.addHook("onRequest", authenticate);

// Or protect specific routes
fastify.post("/invoices", { onRequest: [authenticate] }, createInvoice);

// Role-based access
import { authorize } from "../middleware/authorize";

fastify.delete("/invoices/:id", {
  onRequest: [authenticate, authorize(["admin", "manager"])]
}, deleteInvoice);
*/
