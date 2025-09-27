import { FastifyInstance } from "fastify";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "./user.controller";

export default async function userRoutes(app: FastifyInstance) {
  app.get("/get-user", getUsers);
  app.post("/create-user", createUser);
  app.post("/update-user/:id", updateUser);
  app.post("/delete-user", deleteUser);
}
