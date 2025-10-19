import { FastifyRequest, FastifyReply } from "fastify";
import { CrudModel } from "../../core/models/crud.model";
import bcrypt from "bcrypt";
import pool from "../../config/db";
import { successResponse } from "../../core/utils/response";
import { customerModel } from "../users/user.model";
import { generatePrefixedId } from "../../core/models/idGenerator";
import { EmailService } from "../../core/services/emailService";
import OTPStore from "../../core/utils/otpStore";
interface SendOTPBody {
  email: string;
  name?: string;
  type: "signup" | "forgot";
}

interface VerifyOTPBody {
  email: string;
  otp: string;
}

const userModel = new CrudModel("users");

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const { phone, password } = req.body as { phone: string; password: string };

  const users = await userModel.findByField("phone", phone);
  if (!users.length) {
    return reply.code(400).send({ message: "Invalid credentials" });
  }

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return reply.code(400).send({ message: "Invalid credentials" });
  }

  const payload = {
    id: user.id,
    phone: user.phone,
    username: user.username,
    role_id: user.role_id,
  };

  const token = await reply.jwtSign(payload);
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
        r.description AS role_description,

        (
          SELECT COALESCE(json_agg(sd.*), '[]'::json)
          FROM setup_data sd
        ) AS setup_data 

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

    const organized = {
      id: u.user_id,
      code: u.user_code,
      username: u.username,
      phone: u.phone,
      address: u.address,
      image: u.image,
      password_hash: u.password_hash,
      status: u.user_status,
      created_at: u.created_at,

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

      setup_data: u.setup_data || [],
    };

    reply.send(successResponse(organized, "User profile fetched successfully"));
  } catch (err: any) {
    reply.status(500).send({ success: false, message: err.message });
  }
}

export async function loginCustomer(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = req.body as any;
    const customers = await customerModel.findByField("email", email);
    if (!customers.length)
      return reply.status(401).send({ message: "Invalid credentials" });

    const customer = customers[0];
    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid)
      return reply.status(401).send({ message: "Invalid credentials" });

    const token = await reply.jwtSign(customer);
    reply.send({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (err: any) {
    reply.status(500).send({ success: false, message: err.message });
  }
}
export async function getCustomerProfile(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const id = (req.user as any)?.id;
    const customer = await customerModel.findById(id);

    if (!customer) {
      return reply.status(404).send({ message: "User not found" });
    }

    reply.send({
      success: true,
      message: "Customer profile fetched successfully",
      user: customer,
    });
  } catch (err: any) {
    reply.status(500).send({ success: false, message: err.message });
  }
}

export async function googleCallback(req: FastifyRequest, reply: FastifyReply) {
  try {
    // 1️⃣ Exchange code for access token
    const tokenResponse = await (
      req.server as any
    ).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);

    // 2️⃣ Get Google user info
    const googleUser = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResponse.access_token}`
    ).then((res) => res.json());

    if (!googleUser.email) {
      return reply.status(400).send({ message: "Google account has no email" });
    }

    // 3️⃣ Check if customer exists
    let customer = await customerModel.findByField("email", googleUser.email);

    // 4️⃣ Create customer if not exists
    if (!customer) {
      const code = await generatePrefixedId("customers", "CUS");
      customer = await customerModel.create({
        code,
        full_name: googleUser.name,
        email: googleUser.email,
        phone: googleUser.phone || "0000000000",
        password_hash: "", // Google login users have no password
      });
    }

    // 5️⃣ Sign JWT
    const token = (req.server as any).jwt.sign(customer);

    // 6️⃣ Return JWT and user info
    reply.send({
      success: true,
      message: "Google login successful",
      token,
      user: customer,
    });
  } catch (err: any) {
    reply.status(500).send({ success: false, message: err.message });
  }
}
// OTP Controller functions

// Send OTP
export async function sendOTP(
  req: FastifyRequest<{ Body: SendOTPBody }>,
  reply: FastifyReply
) {
  try {
    const { email, name, type } = req.body;

    if (!email) {
      return reply.code(400).send({
        success: false,
        message: "Email is required",
      });
    }

    // Send OTP email
    const result = await EmailService.sendOTP(email, name);
    if (!result.success) {
      return reply.code(500).send({
        success: false,
        message: "Failed to send OTP",
      });
    }

    // Store OTP
    if (result.otp) {
      OTPStore.save(email, result.otp, 2);
    }

    return reply.send({
      success: true,
      message: "OTP sent successfully",
      email: email,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
}

// Verify OTP
export async function verifyOTP(
  req: FastifyRequest<{ Body: VerifyOTPBody }>,
  reply: FastifyReply
) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return reply.code(400).send({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Verify OTP
    const result = OTPStore.verify(email, otp);

    if (!result.valid) {
      return reply.code(400).send({
        success: false,
        message: result.message,
      });
    }

    return reply.send({
      success: true,
      message: result.message,
      verified: true,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
}

// Resend OTP
export async function resendOTP(
  req: FastifyRequest<{ Body: { email: string; name?: string } }>,
  reply: FastifyReply
) {
  try {
    const { email, name } = req.body;

    if (!email) {
      return reply.code(400).send({
        success: false,
        message: "Email is required",
      });
    }

    const result = await EmailService.sendOTP(email, name);

    if (!result.success) {
      return reply.code(500).send({
        success: false,
        message: "Failed to resend OTP",
      });
    }

    if (result.otp) {
      OTPStore.save(email, result.otp, 2);
    }

    return reply.send({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
}
