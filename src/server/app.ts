import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import jwt from "fastify-jwt";
import dotenv from "dotenv";
import authPlugin from "../core/plugins/auth";
import userRoutes from "../modules/users/user.routes";
import authRoutes from "../modules/auth/auth.routes";
import setupRoutes from "../modules/setup/setup.routes";
import fastifyMultipart from "fastify-multipart";
// import productRoutes from "../modules/products/product.routes";
// import authRoutes from "../modules/auth/auth.routes";

dotenv.config();

const app = Fastify({ logger: true });

// Middleware
app.register(fastifyCors, {
  origin: "*", // adjust this in production
});
app.register(fastifyHelmet);
app.register(fastifyMultipart, {
  attachFieldsToBody: true, // optional: attaches fields to req.body
});

app.register(jwt, { secret: process.env.JWT_SECRET || "secret" });

// Routes

app.register(userRoutes, { prefix: "/users" });
app.register(setupRoutes, { prefix: "/setup" });
// app.register(productRoutes, { prefix: "/products" });
// app.register(authRoutes, { prefix: "/auth" });
app.register(authPlugin);
app.register(authRoutes, { prefix: "/auth" });
export default app;
