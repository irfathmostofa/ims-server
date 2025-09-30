import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";

import {
  brancheModel,
  companyModel,
  roleModel,
  setupDataModel,
} from "./setup.model";
import pool from "../../config/db";
interface ActivityLogData {
  user_id?: number;
  action: string;
  entity: string;
  entity_id?: number;
  description?: string;
  ip_address?: string;
}
// ========== COMPANY ==========
export async function createCompany(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("company", "COM");
    const newCompany = await companyModel.create(fields);
    reply.send(successResponse(newCompany, "Company created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getCompanies(req: FastifyRequest, reply: FastifyReply) {
  try {
    const companies = await companyModel.findAll();
    reply.send(successResponse(companies));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateCompany(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await companyModel.update(id, fields);
    reply.send(successResponse(updated, "Company updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteCompany(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await companyModel.delete(id);
    reply.send(successResponse(deleted, "Company deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== BRANCH ==========
export async function createBranche(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("branch", "BR");
    const newData = await brancheModel.create(fields);
    reply.send(successResponse(newData, "Branch created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getBranches(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await brancheModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateBranche(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await brancheModel.update(id, fields);
    reply.send(successResponse(updated, "Branch updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteBranche(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await brancheModel.delete(id);
    reply.send(successResponse(deleted, "Branch deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

// ========== ROLE ==========
export async function createRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.code = await generatePrefixedId("role", "ROLE");
    const newData = await roleModel.create(fields);
    reply.send(successResponse(newData, "Role created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getRoles(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await roleModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: number };
    const fields = req.body as Record<string, any>;
    const updated = await roleModel.update(id, fields);
    reply.send(successResponse(updated, "Role updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await roleModel.delete(id);
    reply.send(successResponse(deleted, "Role deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function logActivity(
  data: ActivityLogData,
  client?: any
): Promise<void> {
  const queryRunner = client || pool;

  try {
    await queryRunner.query(
      `INSERT INTO activity_log 
        (user_id, action, entity, entity_id, description, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.user_id || null,
        data.action,
        data.entity,
        data.entity_id || null,
        data.description || null,
        data.ip_address || null,
      ]
    );
  } catch (err) {
    console.error("Activity log error:", err);
    // Don't throw error - logging should not break the main operation
  }
}

export function getClientIP(req: FastifyRequest): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string) ||
    req.ip ||
    "unknown"
  );
}

/**
 * Middleware to automatically log activities
 */
export async function autoLogActivity(
  req: FastifyRequest,
  action: string,
  entity: string,
  entity_id?: number,
  description?: string
) {
  await logActivity({
    user_id: (req.user as any)?.id,
    action,
    entity,
    entity_id,
    description,
    ip_address: getClientIP(req),
  });
}
export async function getActivityLogs(
  req: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      user_id?: string;
      action?: string;
      entity?: string;
      entity_id?: string;
      from_date?: string;
      to_date?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const {
      page = "1",
      limit = "50",
      user_id,
      action,
      entity,
      entity_id,
      from_date,
      to_date,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (user_id) {
      conditions.push(`al.user_id = $${paramIndex++}`);
      values.push(parseInt(user_id));
    }

    if (action) {
      conditions.push(`al.action = $${paramIndex++}`);
      values.push(action);
    }

    if (entity) {
      conditions.push(`al.entity = $${paramIndex++}`);
      values.push(entity);
    }

    if (entity_id) {
      conditions.push(`al.entity_id = $${paramIndex++}`);
      values.push(parseInt(entity_id));
    }

    if (from_date) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activity_log al ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get logs with user info
    const logsResult = await pool.query(
      `SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit), offset]
    );

    reply.send({
      success: true,
      data: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get Activity Log Statistics
 */
export async function getActivityStats(
  req: FastifyRequest<{
    Querystring: {
      from_date?: string;
      to_date?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { from_date, to_date } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (from_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(to_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT entity) as entities_affected,
        action,
        COUNT(*) as action_count
      FROM activity_log
      ${whereClause}
      GROUP BY action
      ORDER BY action_count DESC`,
      values
    );

    // Get top users
    const topUsersResult = await pool.query(
      `SELECT 
        al.user_id,
        u.name as user_name,
        COUNT(*) as activity_count
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      GROUP BY al.user_id, u.name
      ORDER BY activity_count DESC
      LIMIT 10`,
      values
    );

    // Get recent entities
    const recentEntitiesResult = await pool.query(
      `SELECT 
        entity,
        COUNT(*) as count
      FROM activity_log
      ${whereClause}
      GROUP BY entity
      ORDER BY count DESC`,
      values
    );

    reply.send({
      success: true,
      data: {
        actions: statsResult.rows,
        top_users: topUsersResult.rows,
        entities: recentEntitiesResult.rows,
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createSetupData(
  req: FastifyRequest<{
    Body: {
      setup_code?: string;
      group_name?: string;
      key_name: string;
      value: any;
      status?: "A" | "I";
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { setup_code, group_name, key_name, value, status } = req.body;

    const setupData = await setupDataModel.create({
      setup_code: setup_code || null,
      group_name: group_name || null,
      key_name,
      value: JSON.stringify(value),
      status: status || "A",
      created_by: (req.user as any)?.id,
    });

    // Log activity
    await autoLogActivity(
      req,
      "CREATE",
      "setup_data",
      setupData.id,
      `Created setup: ${key_name}`
    );

    reply.send({
      success: true,
      data: setupData,
      message: "Setup data created successfully",
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get All Setup Data with Filters
 */
export async function getAllSetupData(
  req: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      group_name?: string;
      status?: string;
      search?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { page = "1", limit = "50", group_name, status, search } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (group_name) {
      conditions.push(`group_name = $${paramIndex++}`);
      values.push(group_name);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(
        `(key_name ILIKE $${paramIndex++} OR setup_code ILIKE $${paramIndex++})`
      );
      values.push(`%${search}%`, `%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM setup_data ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get setup data
    const setupResult = await pool.query(
      `SELECT 
        sd.*,
        u.name as created_by_name,
        u2.name as updated_by_name
      FROM setup_data sd
      LEFT JOIN users u ON sd.created_by = u.id
      LEFT JOIN users u2 ON sd.updated_by = u2.id
      ${whereClause}
      ORDER BY sd.group_name, sd.key_name
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit), offset]
    );

    reply.send({
      success: true,
      data: setupResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get Setup Data by ID
 */
export async function getSetupData(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const setupId = parseInt(req.params.id);

    const { rows } = await pool.query(
      `SELECT 
        sd.*,
        u.name as created_by_name,
        u2.name as updated_by_name
      FROM setup_data sd
      LEFT JOIN users u ON sd.created_by = u.id
      LEFT JOIN users u2 ON sd.updated_by = u2.id
      WHERE sd.id = $1`,
      [setupId]
    );

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Setup data not found",
      });
    }

    reply.send({
      success: true,
      data: rows[0],
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get Setup Data by Code or Key
 */
export async function getSetupByKey(
  req: FastifyRequest<{
    Querystring: {
      setup_code?: string;
      key_name?: string;
      group_name?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { setup_code, key_name, group_name } = req.query;

    if (!setup_code && !key_name) {
      return reply.status(400).send({
        success: false,
        message: "Either setup_code or key_name is required",
      });
    }

    const conditions: string[] = ["status = 'A'"];
    const values: any[] = [];
    let paramIndex = 1;

    if (setup_code) {
      conditions.push(`setup_code = $${paramIndex++}`);
      values.push(setup_code);
    }

    if (key_name) {
      conditions.push(`key_name = $${paramIndex++}`);
      values.push(key_name);
    }

    if (group_name) {
      conditions.push(`group_name = $${paramIndex++}`);
      values.push(group_name);
    }

    const { rows } = await pool.query(
      `SELECT * FROM setup_data WHERE ${conditions.join(" AND ")}`,
      values
    );

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Setup data not found",
      });
    }

    reply.send({
      success: true,
      data: rows.length === 1 ? rows[0] : rows,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Get Grouped Setup Data
 */
export async function getGroupedSetupData(
  req: FastifyRequest<{
    Querystring: {
      status?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { status = "A" } = req.query;

    const { rows } = await pool.query(
      `SELECT 
        group_name,
        json_agg(
          json_build_object(
            'id', id,
            'setup_code', setup_code,
            'key_name', key_name,
            'value', value,
            'status', status
          ) ORDER BY key_name
        ) as items
      FROM setup_data
      WHERE status = $1 AND group_name IS NOT NULL
      GROUP BY group_name
      ORDER BY group_name`,
      [status]
    );

    reply.send({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Update Setup Data
 */
export async function updateSetupData(
  req: FastifyRequest<{
    Params: { id: string };
    Body: {
      setup_code?: string;
      group_name?: string;
      key_name?: string;
      value?: any;
      status?: "A" | "I";
    };
  }>,
  reply: FastifyReply
) {
  try {
    const setupId = parseInt(req.params.id);
    const { value, ...restData } = req.body;

    const updateData: any = { ...restData };
    if (value !== undefined) {
      updateData.value = JSON.stringify(value);
    }
    updateData.updated_by = (req.user as any)?.id;
    updateData.updated_at = new Date();

    const setup = await setupDataModel.update(setupId, updateData);

    // Log activity
    await autoLogActivity(
      req,
      "UPDATE",
      "setup_data",
      setupId,
      `Updated setup: ${setup.key_name}`
    );

    reply.send({
      success: true,
      data: setup,
      message: "Setup data updated successfully",
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Delete Setup Data
 */
export async function deleteSetupData(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const setupId = parseInt(req.params.id);

    const setup = await setupDataModel.findById(setupId);
    if (!setup) {
      return reply.status(404).send({
        success: false,
        message: "Setup data not found",
      });
    }

    await setupDataModel.delete(setupId);

    // Log activity
    await autoLogActivity(
      req,
      "DELETE",
      "setup_data",
      setupId,
      `Deleted setup: ${setup.key_name}`
    );

    reply.send({
      success: true,
      message: "Setup data deleted successfully",
    });
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/**
 * Bulk Create Setup Data
 */
export async function bulkCreateSetupData(
  req: FastifyRequest<{
    Body: {
      items: Array<{
        setup_code?: string;
        group_name?: string;
        key_name: string;
        value: any;
        status?: "A" | "I";
      }>;
    };
  }>,
  reply: FastifyReply
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { items } = req.body;
    const created: any[] = [];

    for (const item of items) {
      const setupData = await setupDataModel.create(
        {
          setup_code: item.setup_code || null,
          group_name: item.group_name || null,
          key_name: item.key_name,
          value: JSON.stringify(item.value),
          status: item.status || "A",
          created_by: (req.user as any)?.id,
        },
        client
      );
      created.push(setupData);
    }

    await client.query("COMMIT");

    // Log activity
    await autoLogActivity(
      req,
      "BULK_CREATE",
      "setup_data",
      undefined,
      `Created ${created.length} setup items`
    );

    reply.send({
      success: true,
      data: created,
      message: `${created.length} setup items created successfully`,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    reply.status(400).send({ success: false, message: err.message });
  } finally {
    client.release();
  }
}
