import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import jwt from "fastify-jwt";
import dotenv from "dotenv";

import userRoutes from "../modules/users/user.routes";
// import productRoutes from "../modules/products/product.routes";
// import authRoutes from "../modules/auth/auth.routes";

dotenv.config();

const app = Fastify({ logger: true });

// Middleware
app.register(fastifyCors, {
  origin: "*", // adjust this in production
});
app.register(fastifyHelmet);

app.register(jwt, { secret: process.env.JWT_SECRET || "secret" });

// Routes
app.register(userRoutes, { prefix: "/users" });
// app.register(productRoutes, { prefix: "/products" });
// app.register(authRoutes, { prefix: "/auth" });

export default app;
