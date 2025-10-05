import { CrudModel } from "../../core/models/crud.model";

export const orderOnlineModel = new CrudModel(
  "order_online",
  [
    "code",
    "customer_id",
    "delivery_address_id",
    "delivery_method_id",
    "payment_method_id",
    "total_amount",
    "discount_amount",
    "net_amount",
    "is_cod",
    "order_status",
    "payment_status",
  ],
  [],
  [
    "discount_amount",
    "net_amount",
    "is_cod",
    "order_status",
    "payment_status",
    "status",
    "created_by",
    "creation_date",
  ]
);
export const orderItemOnlineModel = new CrudModel(
  "order_item_online",
  ["order_id", "product_variant_id", "quantity", "unit_price"],
  [],
  ["discount"]
);
export const orderDeliveryModel = new CrudModel(
  "order_delivery",
  ["order_id", "delivery_method_id", "tracking_code", "delivery_status"],
  [],
  [
    "tracking_code",
    "delivery_status",
    "cod_amount",
    "cod_collected",
    "cod_collected_date",
    "courier_response",
    "status",
    "created_by",
    "creation_date",
  ]
);

export const orderPaymentOnlineModel = new CrudModel(
  "order_payment_online",
  [
    "order_id",
    "payment_method_id",
    "transaction_id",
    "amount",
    "status",
    "paid_at",
    "record_status",
  ],
  ["transaction_id"],
  [
    "transaction_id",
    "amount",
    "status",
    "provider_response",
    "paid_at",
    "record_status",
    "created_by",
    "creation_date",
  ]
);
