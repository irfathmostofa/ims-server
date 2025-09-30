import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import jwt from "fastify-jwt";
import dotenv from "dotenv";
import authPlugin from "../core/plugins/auth";
import userRoutes from "../modules/users/user.routes";
import authRoutes from "../modules/auth/auth.routes";
import setupRoutes from "../modules/setup/setup.routes";
import productRoutes from "../modules/product/product.routes";
import partyRoutes from "../modules/party/party.routes";
import { inventoryRoutes } from "../modules/inventory/inventory.routes";
import salesRoutes from "../modules/sales/sale.routes";
import poRoutes from "../modules/Purchase-Order/po.routes";
import coaRoutes from "../modules/coa/coa.routes";

dotenv.config();

const app = Fastify({ logger: true });

// Middleware
app.register(fastifyCors, {
  origin: "*",
});
app.register(fastifyHelmet);
app.register(authPlugin);
// app.register(jwt, { secret: process.env.JWT_SECRET || "secret" });

// Routes
app.register(userRoutes, { prefix: "/users" });
app.register(setupRoutes, { prefix: "/setup" });
app.register(authRoutes, { prefix: "/auth" });
app.register(productRoutes, { prefix: "/product" });
app.register(partyRoutes, { prefix: "/party" });
app.register(inventoryRoutes, { prefix: "/inventory" });
app.register(salesRoutes, { prefix: "/sales" });
app.register(poRoutes, { prefix: "/po" });
app.register(coaRoutes, { prefix: "/coa" });
export default app;
