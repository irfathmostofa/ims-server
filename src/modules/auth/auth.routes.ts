import { FastifyInstance } from "fastify";
import {
  login,
  profile,
  resendOTP,
  sendOTP,
  verifyOTP,
} from "./auth.controller";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/login", login);
  app.get("/profile", { preHandler: [app.authenticate] }, profile);

  app.post("/send-otp", sendOTP);
  app.post("/verify-otp", verifyOTP);
  app.post("/resend-otp", resendOTP);
}
