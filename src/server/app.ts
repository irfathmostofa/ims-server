import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import jwt from "fastify-jwt";
import dotenv from "dotenv";
import authPlugin from "../core/plugins/auth";
import userRoutes from "../modules/users/user.routes";
import authRoutes from "../modules/auth/auth.routes";
import setupRoutes from "../modules/setup/setup.routes";

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
export default app;
