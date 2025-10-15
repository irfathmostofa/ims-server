import { FastifyInstance } from "fastify";
import {
  createCustomer,
  createCustomerAddress,
  createUser,
  deleteCustomer,
  deleteCustomerAddress,
  deleteUser,
  getCustomer,
  getCustomerAddress,
  getUsers,
  updateCustomer,
  updateCustomerAddress,
  updateCustomerPassword,
  updateUser,
} from "./user.controller";

export default async function userRoutes(app: FastifyInstance) {
  app.get("/get-user", getUsers);
  app.post("/create-user", createUser);
  app.post("/update-user/:id", updateUser);
  app.post("/delete-user", deleteUser);

  app.get("/get-customer", getCustomer);
  app.post("/create-customer", createCustomer);
  app.post("/update-customer/:id", updateCustomer);
  app.post("/delete-customer", deleteCustomer);

  app.post("/create-customer-address", createCustomerAddress);
  app.post("/update-customer-address/:address_id", updateCustomerAddress);
  app.post("/update-customer-password", updateCustomerPassword);
  app.post("/delete-customer-address", deleteCustomerAddress);
  app.get("/get-customer-address/:id", getCustomerAddress);
}
