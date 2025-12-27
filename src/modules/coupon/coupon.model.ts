// coupon.model.ts
import { CrudModel } from "../../core/models/crud.model";

export const CouponModel = new CrudModel(
  "coupons",
  [
    "code",
    "description",
    "discount_type",
    "discount_value",
    "start_date",
    "end_date",
  ],
  ["code"],
  [
    "min_purchase_amount",
    "max_discount_amount",
    "usage_limit",
    "usage_count",
    "is_active",
    "applicable_to",
    "created_at",
    "updated_at",
  ]
);

export const CouponApplicableCategoriesModel = new CrudModel(
  "coupon_applicable_categories",
  ["coupon_id", "category_id"],
  ["coupon_id,category_id"],
  ["created_at"]
);

export const CouponApplicableProductsModel = new CrudModel(
  "coupon_applicable_products",
  ["coupon_id", "product_id"],
  ["coupon_id,product_id"],
  ["created_at"]
);

export const CouponUsageHistoryModel = new CrudModel(
  "coupon_usage_history",
  ["coupon_id", "order_id", "user_id", "discount_amount"],
  [],
  ["used_at"]
);
