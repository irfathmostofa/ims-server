import { FastifyInstance } from "fastify";
import {
  addPayment,
  createInvoice,
  deleteInvoice,
  deletePayment,
  getAllInvoices,
  getAllPayments,
  getInvoice,
  getInvoicePayments,
  getInvoiceSummary,
  updateInvoice,
} from "./sale.controller";

export default async function salesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.post("/create-invoices", createInvoice);

  app.post("/get-All-invoices", getAllInvoices);

  app.get("/get-invoices/:id", getInvoice);

  app.post("/update-invoices/:id", updateInvoice);

  app.post("/delete-invoices/:id", deleteInvoice);

  app.post("/create-invoices/:id", addPayment);
  app.post("/get-payments", getAllPayments);

  app.get("/get-invoices/:id/payments", getInvoicePayments);

  app.post("/delete-payments/:id", deletePayment);

  app.get("/get-invoices/summary", getInvoiceSummary);
}
