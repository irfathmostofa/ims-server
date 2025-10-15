import { FastifyInstance } from "fastify";
import {
  cancelOrder,
  createOnlineOrder,
  getCustomerOrder,
  recordOrderPayment,
  updateDeliveryStatus,
  updateOrderStatus,
} from "./order.controller";

export default async function orderRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.post("/create-order", createOnlineOrder);
  app.post("/update-order-status", updateOrderStatus);
  app.post("/update-delivery-status", updateDeliveryStatus);
  app.post("/record-payment", recordOrderPayment);
  app.post("/cancel-order", cancelOrder);
  app.get("/get-order/:id", getCustomerOrder);
}

// ===== EXAMPLE REQUEST BODIES =====

/*
// Create Order
POST /api/orders
{
  "customer_id": 5,
  "delivery_address_id": 10,
  "delivery_method_id": 2,
  "payment_method_id": 1,
  "discount_amount": 50,
  "is_cod": false,
  "items": [
    {
      "product_variant_id": 15,
      "quantity": 2,
      "unit_price": 150.00,
      "discount": 10
    },
    {
      "product_variant_id": 20,
      "quantity": 1,
      "unit_price": 200.00
    }
  ]
}

// Update Order Status
PUT /api/orders/123/status
{
  "order_status": "PROCESSING",
  "payment_status": "PAID"
}

// Update Delivery Status
PUT /api/orders/123/delivery
{
  "tracking_code": "TRK123456789",
  "delivery_status": "SHIPPED",
  "courier_response": {
    "carrier": "DHL",
    "estimated_delivery": "2025-10-10"
  }
}

// Record Payment
POST /api/orders/123/payment
{
  "payment_method_id": 3,
  "transaction_id": "TXN987654321",
  "amount": 440,
  "provider_response": {
    "gateway": "Stripe",
    "payment_intent": "pi_xyz"
  }
}

// Cancel Order
POST /api/orders/123/cancel
{
  "reason": "Customer requested cancellation"
}
*/
