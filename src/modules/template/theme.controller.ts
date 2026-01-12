import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import pool from "../../config/db";
import {
  activeThemeCacheModel,
  componentTypeModel,
  componentVariantModel,
  themeModel,
  themeSectionModel,
} from "./theme.model";

/* ===================== THEMES ===================== */

export async function createTheme(req: FastifyRequest, reply: FastifyReply) {
  try {
    const fields = req.body as Record<string, any>;
    fields.created_by = (req.user as any)?.id;

    const data = await themeModel.create(fields);
    reply.send(successResponse(data, "Theme created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getThemes(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await themeModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getThemeById(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as any;

    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(ts ORDER BY ts.order_index)
          FILTER (WHERE ts.id IS NOT NULL),
          '[]'
        ) AS sections
      FROM themes t
      LEFT JOIN theme_sections ts ON ts.theme_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `;

    const { rows } = await pool.query(query, [id]);

    if (!rows.length) {
      return reply.status(404).send({
        success: false,
        message: "Theme not found",
      });
    }

    reply.send(successResponse(rows[0]));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateTheme(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as any;
    const fields = req.body as Record<string, any>;
    fields.last_update = (req.user as any)?.id;

    const data = await themeModel.update(id, fields);
    reply.send(successResponse(data, "Theme updated successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteTheme(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.body as any;
    const data = await themeModel.delete(id);
    reply.send(successResponse(data, "Theme deleted successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/* ===================== COMPONENT TYPES ===================== */

export async function createComponentType(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await componentTypeModel.create(req.body as any);
    reply.send(successResponse(data, "Component type created"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getComponentTypes(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await componentTypeModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/* ===================== COMPONENT VARIANTS ===================== */

export async function createComponentVariant(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await componentVariantModel.create(req.body as any);
    reply.send(successResponse(data, "Component variant created"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getComponentVariants(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await componentVariantModel.findAll();
    reply.send(successResponse(data));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

/* ===================== THEME SECTIONS ===================== */

export async function createThemeSection(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const fields = req.body as Record<string, any>;
    fields.created_by = (req.user as any)?.id;

    const data = await themeSectionModel.create(fields);
    reply.send(successResponse(data, "Theme section created"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateThemeSection(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as any;
    const fields = req.body as Record<string, any>;
    fields.last_update = (req.user as any)?.id;

    const data = await themeSectionModel.update(id, fields);
    reply.send(successResponse(data, "Theme section updated"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteThemeSection(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = req.body as any;
    const data = await themeSectionModel.delete(id);
    reply.send(successResponse(data, "Theme section deleted"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}

export async function getActiveTheme(req: FastifyRequest, reply: FastifyReply) {
  try {
    /* 1️⃣ Get the active theme */
    const {
      rows: [theme],
    } = await pool.query(`
      SELECT *
      FROM themes
      WHERE is_active = true
        AND is_default = true
        AND status = 'published'
      LIMIT 1
    `);

    if (!theme) throw new Error("No active theme found");

    /* 2️⃣ Check cache first */
    const {
      rows: [cache],
    } = await pool.query(
      `
      SELECT theme_data
      FROM active_theme_cache
      WHERE theme_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
      `,
      [theme.id]
    );

    if (cache) {
      return reply.send(
        successResponse(cache.theme_data, "Active theme (cached)")
      );
    }

    /* 3️⃣ Compile theme sections grouped by position */
    const {
      rows: [compiledTheme],
    } = await pool.query(
      `
      SELECT 
        t.*,
        json_build_object(
          'header', COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ts.id,
                  'name', ts.name,
                  'section_key', ts.section_key,
                  'order_index', ts.order_index,
                  'is_visible', ts.is_visible,
                  'config_data', ts.config_data,
                  'content', ts.content,
                  'css_overrides', ts.css_overrides,
                  'responsive_config', ts.responsive_config,
                  'animation_settings', ts.animation_settings,
                  'seo_settings', ts.seo_settings,
                  'component', json_build_object(
                    'variant_id', cv.id,
                    'variant_name', cv.variant_name,
                    'component_path', cv.component_path,
                    'default_config', cv.default_config,
                    'css_template', cv.css_template
                  )
                )
                ORDER BY ts.order_index
              )
              FROM theme_sections ts
              LEFT JOIN component_variants cv ON cv.id = ts.component_variant_id
              WHERE ts.theme_id = t.id
                AND ts.is_visible = true
                AND ts.position = 'HEADER'
            ),
            '[]'::json
          ),
          'content', COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ts.id,
                  'name', ts.name,
                  'section_key', ts.section_key,
                  'order_index', ts.order_index,
                  'is_visible', ts.is_visible,
                  'config_data', ts.config_data,
                  'content', ts.content,
                  'css_overrides', ts.css_overrides,
                  'responsive_config', ts.responsive_config,
                  'animation_settings', ts.animation_settings,
                  'seo_settings', ts.seo_settings,
                  'component', json_build_object(
                    'variant_id', cv.id,
                    'variant_name', cv.variant_name,
                    'component_path', cv.component_path,
                    'default_config', cv.default_config,
                    'css_template', cv.css_template
                  )
                )
                ORDER BY ts.order_index
              )
              FROM theme_sections ts
              LEFT JOIN component_variants cv ON cv.id = ts.component_variant_id
              WHERE ts.theme_id = t.id
                AND ts.is_visible = true
                AND ts.position = 'CONTENT'
            ),
            '[]'::json
          ),
          'footer', COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ts.id,
                  'name', ts.name,
                  'section_key', ts.section_key,
                  'order_index', ts.order_index,
                  'is_visible', ts.is_visible,
                  'config_data', ts.config_data,
                  'content', ts.content,
                  'css_overrides', ts.css_overrides,
                  'responsive_config', ts.responsive_config,
                  'animation_settings', ts.animation_settings,
                  'seo_settings', ts.seo_settings,
                  'component', json_build_object(
                    'variant_id', cv.id,
                    'variant_name', cv.variant_name,
                    'component_path', cv.component_path,
                    'default_config', cv.default_config,
                    'css_template', cv.css_template
                  )
                )
                ORDER BY ts.order_index
              )
              FROM theme_sections ts
              LEFT JOIN component_variants cv ON cv.id = ts.component_variant_id
              WHERE ts.theme_id = t.id
                AND ts.is_visible = true
                AND ts.position = 'FOOTER'
            ),
            '[]'::json
          )
        ) as sections
      FROM themes t
      WHERE t.id = $1
      `,
      [theme.id]
    );

    // No need to transform since the query already returns the correct structure
    const finalTheme = {
      ...compiledTheme,
      // The 'sections' field is already correctly structured from the SQL query
    };

    /* 4️⃣ Save to cache */
    await activeThemeCacheModel.create({
      theme_id: theme.id,
      theme_data: finalTheme,
      hash: `${theme.id}-${Date.now()}`,
    });

    /* 5️⃣ Return compiled theme */
    reply.send(successResponse(finalTheme, "Active theme loaded successfully"));
  } catch (err: any) {
    reply.status(500).send({ success: false, message: err.message });
  }
}
