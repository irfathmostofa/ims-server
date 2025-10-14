import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import bcrypt from "bcrypt";
import { generatePrefixedId } from "../../core/models/idGenerator";
import { customerAddressModel, customerModel, userModel } from "./user.model";
import pool from "../../config/db";

export async function getUsers(req: FastifyRequest, reply: FastifyReply) {
  try {
    const users = await userModel.findAll();
    reply.send(successResponse(users));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userData = req.body as Record<string, any>;

    userData.password_hash = await bcrypt.hash(userData.password_hash, 10);
    userData.code = await generatePrefixedId("users", "USR");

    const newUser = await userModel.create(userData);
    reply.send(successResponse(newUser, "User created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await userModel.update(id, fields);
    reply.send(successResponse(updated, "User updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await userModel.delete(id);
    reply.send(successResponse(deleted, "User deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getCustomer(req: FastifyRequest, reply: FastifyReply) {
  try {
    const customer = await customerModel.findAll();
    reply.send(successResponse(customer));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createCustomer(req: FastifyRequest, reply: FastifyReply) {
  try {
    const customerData = req.body as any;

    // hash password
    customerData.password_hash = await bcrypt.hash(
      customerData.password_hash,
      10
    );

    customerData.code = await generatePrefixedId("customer", "CUS");
    const newUser = await customerModel.create(customerData);
    const token = await reply.jwtSign(newUser);
    reply.send(successResponse(token, "Customer created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateCustomer(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await customerModel.update(id, fields);
    reply.send(successResponse(updated, "User updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateCustomerPassword(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { email, password_hash } = req.body as {
      email: string;
      password_hash: string;
    };

    if (!password_hash) {
      reply
        .status(400)
        .send({ success: false, message: "Password is required" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);

    // Use raw query to update password
    const result = await pool.query(
      `UPDATE customer SET password_hash = $1 WHERE email = $2 RETURNING *`,
      [hashedPassword, email]
    );

    reply.send(successResponse(result, "Password updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteCustomer(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { customer_id } = req.body as { customer_id: number };
    const deleted = await customerModel.delete(customer_id);
    reply.send(successResponse(deleted, "User deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createCustomerAddress(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const AddressData = req.body as Record<string, any>;

    const newUser = await customerAddressModel.create(AddressData);
    reply.send(successResponse(newUser, "Address created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateCustomerAddress(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await customerAddressModel.update(id, fields);
    reply.send(successResponse(updated, "Address updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteCustomerAddress(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await customerAddressModel.delete(id);
    reply.send(successResponse(deleted, "Address deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getCustomerAddress(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.params as { id: number };
    const address = await customerAddressModel.findByField("id", id);
    reply.send(successResponse(address));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
