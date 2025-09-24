import { FastifyRequest, FastifyReply } from "fastify";
import { CrudModel } from "../../core/models/crud.model";
import bcrypt from "bcrypt";
import pool from "../../config/db";
import { successResponse } from "../../core/utils/response";

const userModel = new CrudModel("users");

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const { phone, password } = req.body as any;

  const users = await userModel.findByField("phone", phone);
  if (!users.length) return reply.code(400).send({ message: "User not found" });

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return reply.code(400).send({ message: "Invalid credentials" });

  const token = await reply.jwtSign(user);
  reply.send({ token });
}

export async function profile(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return reply
        .status(401)
        .send({ success: false, message: "Unauthorized" });
    }

    // Fetch user with proper joins
    const { rows } = await pool.query(
      `
      SELECT 
        u.id AS user_id,
        u.code AS user_code,
        u.username,
        u.phone,
        u.address,
        u.image,
        u.password_hash,
        u.status AS user_status,
        u.branch_id,
        u.role_id,
        u.created_at,
       
        
        b.id AS branch_id,
        b.code AS branch_code,
        b.name AS branch_name,
        b.type AS branch_type,
        b.address AS branch_address,
        b.phone AS branch_phone,
        b.status AS branch_status,
        b.company_id AS branch_company_id,
        
        c.id AS company_id,
        c.code AS company_code,
        c.name AS company_name,
        c.address AS company_address,
        c.phone AS company_phone,
        c.email AS company_email,
        c.logo AS company_logo,
        c.website AS company_website,
        c.status AS company_status,
        
        r.id AS role_id,
        r.code AS role_code,
        r.name AS role_name,
        r.description AS role_description
      FROM users u
      JOIN branch b ON b.id = u.branch_id
      JOIN company c ON c.id = b.company_id
      JOIN role r ON r.id = u.role_id
      WHERE u.id = $1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return reply
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    const u = rows[0];

    // Organized response according to your real fields
    const organized = {
      id: u.user_id,
      code: u.user_code,
      username: u.username,

      phone: u.phone,
      address: u.address,
      image: u.image,
      password_hash: u.password_hash,
      status: u.user_status,
      branch_id: u.branch_id,
      role_id: u.role_id,
      created_by: u.created_by,
      created_at: u.created_at,
      updated_by: u.updated_by,
      updated_at: u.updated_at,
      branch: {
        id: u.branch_id,
        code: u.branch_code,
        name: u.branch_name,
        type: u.branch_type,
        address: u.branch_address,
        phone: u.branch_phone,
        status: u.branch_status,
        company_id: u.branch_company_id,
      },
      company: {
        id: u.company_id,
        code: u.company_code,
        name: u.company_name,
        address: u.company_address,
        phone: u.company_phone,
        email: u.company_email,
        logo: u.company_logo,
        website: u.company_website,
        status: u.company_status,
      },
      role: {
        id: u.role_id,
        code: u.role_code,
        name: u.role_name,
        description: u.role_description,
      },
    };

    reply.send(successResponse(organized, "User profile fetched successfully"));
  } catch (err: any) {
    reply.status(500).send({ success: false, message: err.message });
  }
}
