import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { templateModel, templateSectionModel } from "./template.model";
import pool from "../../config/db";

export async function createTemplate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.created_by = (req.user as any)?.id;
    const newData = await templateModel.create(fields);
    reply.send(successResponse(newData, "Template created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getTemplates(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await templateModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function getTemplateById(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // 🔹 For a GET request, we should use params (not body)
    const { id } = req.body as { id: number };

    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(ts.* ORDER BY ts.sort_order)
          FILTER (WHERE ts.id IS NOT NULL),
          '[]'
        ) AS sections
      FROM template t
      LEFT JOIN template_section ts ON ts.template_id = t.id
      WHERE t.id = $1
      GROUP BY t.id;
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "Template not found",
      });
    }

    // ✅ Return only the first row (the template with its sections)
    reply.send(successResponse(rows[0], "Template fetched successfully"));
  } catch (err: any) {
    console.error("Error in getTemplateById:", err.message);
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function updateTemplates(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const fields = req.body as Record<string, any>;
    fields.last_update = (req.user as any)?.id;
    const updated = await templateModel.update(id, fields);
    reply.send(successResponse(updated, "Templates updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteTemplates(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await templateModel.delete(id);
    reply.send(successResponse(deleted, "Templates deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function createTemplateSection(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;
    fields.created_by = (req.user as any)?.id;
    const newData = await templateSectionModel.create(fields);
    reply.send(
      successResponse(newData, "Template section created successfully")
    );
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateTemplatesSection(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const fields = req.body as Record<string, any>;
    fields.last_update = (req.user as any)?.id;
    const updated = await templateSectionModel.update(id, fields);
    reply.send(successResponse(updated, "Templates updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
export async function deleteTemplatesSection(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as { id: number };
    const deleted = await templateSectionModel.delete(id);
    reply.send(successResponse(deleted, "Templates deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
