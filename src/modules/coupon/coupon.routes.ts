import { FastifyInstance } from "fastify";
import {
  applyCoupon,
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  validateCoupon,
} from "./coupon.controller";
export async function CouponRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.post("/create", createCoupon);
  app.post("/get-all", getAllCoupons);
  app.post("/get-by-id", getCouponById);
  app.post("/update", updateCoupon);
  app.post("/delete", deleteCoupon);
  app.post("/validate", validateCoupon);
  app.post("/apply", applyCoupon);
}
