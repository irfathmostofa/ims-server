import { FastifyInstance } from "fastify";
import { createUser, getUsers } from "./user.controller";

export default async function userRoutes(app: FastifyInstance) {
  app.get("/", getUsers);
  app.post("/create-user", createUser);
}
