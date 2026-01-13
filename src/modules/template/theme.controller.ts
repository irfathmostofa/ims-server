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
    const { rows } = await pool.query(`
      SELECT *
      FROM themes
      WHERE is_active = true
        AND status = 'published'
      ORDER BY is_default DESC, created_at DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "No active published theme found",
      });
    }

    const theme = rows[0];

    /* 2️⃣ Check cache first */
    const { rows: cacheRows } = await pool.query(
      `SELECT theme_data FROM active_theme_cache 
       WHERE theme_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY generated_at DESC LIMIT 1`,
      [theme.id]
    );

    if (cacheRows.length > 0 && cacheRows[0].theme_data) {
      return reply.send({
        success: true,
        message: "Active theme (cached)",
        data: cacheRows[0].theme_data,
      });
    }

    /* 3️⃣ Compile theme sections using subqueries (more efficient) */
    const { rows: compiledRows } = await pool.query(
      `SELECT 
        t.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', ts.id,
              'name', ts.name,
              'content', ts.content,
              'component', json_build_object(
                'variant_id', cv.id,
                'variant_name', cv.variant_name,
                'component_path', cv.component_path,
                'default_config', cv.default_config,
                'css_template', cv.css_template
              ),
              'is_visible', ts.is_visible,
              'config_data', ts.config_data,
              'order_index', ts.order_index,
              'section_key', ts.section_key,
              'seo_settings', ts.seo_settings,
              'css_overrides', ts.css_overrides,
              'responsive_config', ts.responsive_config,
              'animation_settings', ts.animation_settings
            ) ORDER BY ts.order_index ASC
          )
          FROM theme_sections ts
          LEFT JOIN component_variants cv ON cv.id = ts.component_variant_id
          WHERE ts.theme_id = t.id 
            AND ts.is_visible = true 
            AND ts.position = 'HEADER'
        ) as header,
        (
          SELECT json_agg(
            json_build_object(
              'id', ts.id,
              'name', ts.name,
              'content', ts.content,
              'component', json_build_object(
                'variant_id', cv.id,
                'variant_name', cv.variant_name,
                'component_path', cv.component_path,
                'default_config', cv.default_config,
                'css_template', cv.css_template
              ),
              'is_visible', ts.is_visible,
              'config_data', ts.config_data,
              'order_index', ts.order_index,
              'section_key', ts.section_key,
              'seo_settings', ts.seo_settings,
              'css_overrides', ts.css_overrides,
              'responsive_config', ts.responsive_config,
              'animation_settings', ts.animation_settings
            ) ORDER BY ts.order_index ASC
          )
          FROM theme_sections ts
          LEFT JOIN component_variants cv ON cv.id = ts.component_variant_id
          WHERE ts.theme_id = t.id 
            AND ts.is_visible = true 
            AND ts.position = 'HERO'
        ) as hero,
        (
          SELECT json_agg(
            json_build_object(
              'id', ts.id,
              'name', ts.name,
              'content', ts.content,
              'component', json_build_object(
                'variant_id', cv.id,
                'variant_name', cv.variant_name,
                'component_path', cv.component_path,
                'default_config', cv.default_config,
                'css_template', cv.css_template
              ),
              'is_visible', ts.is_visible,
              'config_data', ts.config_data,
              'order_index', ts.order_index,
              'section_key', ts.section_key,
              'seo_settings', ts.seo_settings,
              'css_overrides', ts.css_overrides,
              'responsive_config', ts.responsive_config,
              'animation_settings', ts.animation_settings
            ) ORDER BY ts.order_index ASC
          )
          FROM theme_sections ts
          LEFT JOIN component_variants cv ON cv.id = ts.component_variant_id
          WHERE ts.theme_id = t.id 
            AND ts.is_visible = true 
            AND ts.position = 'CONTENT'
        ) as content,
        (
          SELECT json_agg(
            json_build_object(
              'id', ts.id,
              'name', ts.name,
              'content', ts.content,
              'component', json_build_object(
                'variant_id', cv.id,
                'variant_name', cv.variant_name,
                'component_path', cv.component_path,
                'default_config', cv.default_config,
                'css_template', cv.css_template
              ),
              'is_visible', ts.is_visible,
              'config_data', ts.config_data,
              'order_index', ts.order_index,
              'section_key', ts.section_key,
              'seo_settings', ts.seo_settings,
              'css_overrides', ts.css_overrides,
              'responsive_config', ts.responsive_config,
              'animation_settings', ts.animation_settings
            ) ORDER BY ts.order_index ASC
          )
          FROM theme_sections ts
          LEFT JOIN component_variants cv ON cv.id = ts.component_variant_id
          WHERE ts.theme_id = t.id 
            AND ts.is_visible = true 
            AND ts.position = 'FOOTER'
        ) as footer
      FROM themes t
      WHERE t.id = $1`,
      [theme.id]
    );

    if (compiledRows.length === 0) {
      return reply.status(500).send({
        success: false,
        message: "Failed to compile theme sections",
      });
    }

    const compiledTheme = compiledRows[0];

    /* 4️⃣ Create the final theme structure */
    // Combine hero and content sections into single content array
    const heroSections = compiledTheme.hero || [];
    const contentSections = compiledTheme.content || [];

    // Merge hero sections into content array, maintaining order
    const allContentSections = [...heroSections, ...contentSections].sort(
      (a, b) => (a.order_index || 0) - (b.order_index || 0)
    );

    const finalTheme = {
      id: compiledTheme.id,
      name: compiledTheme.name,
      slug: compiledTheme.slug,
      status: compiledTheme.status,
      sections: {
        footer: compiledTheme.footer || [],
        header: compiledTheme.header || [],
        content: allContentSections,
      },
      is_active: compiledTheme.is_active,
      created_at: compiledTheme.created_at,
      global_css: compiledTheme.global_css || {},
      is_default: compiledTheme.is_default,
      updated_at: compiledTheme.updated_at,
      description: compiledTheme.description,
      published_at: compiledTheme.published_at,
      global_settings: compiledTheme.global_settings || {},
    };

    /* 5️⃣ Save to cache - FIXED: Use upsert pattern */
    const crypto = require("crypto");
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(finalTheme))
      .digest("hex");

    // First delete existing cache for this theme
    await pool.query(`DELETE FROM active_theme_cache WHERE theme_id = $1`, [
      theme.id,
    ]);

    // Then insert new cache
    await pool.query(
      `INSERT INTO active_theme_cache (theme_id, theme_data, hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')`,
      [theme.id, finalTheme, hash]
    );

    /* 6️⃣ Return compiled theme */
    return reply.send({
      success: true,
      message: "Active theme loaded successfully",
      data: finalTheme,
    });
  } catch (err: any) {
    console.error("Error in getActiveTheme:", err);
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
