import { CrudModel } from "../../core/models/crud.model";

/* ================= THEMES ================= */
export const themeModel = new CrudModel(
  "themes",
  ["name", "slug"],
  ["name", "slug"],
  [
    "description",
    "is_active",
    "is_default",
    "status",
    "global_css",
    "global_settings",
    "published_at",
  ]
);

/* ================= COMPONENT TYPES ================= */
export const componentTypeModel = new CrudModel(
  "component_types",
  ["name", "display_name"],
  ["name"],
  ["display_name", "category", "icon", "max_instances", "is_active"]
);

/* ================= COMPONENT VARIANTS ================= */
export const componentVariantModel = new CrudModel(
  "component_variants",
  ["component_type_id", "variant_name"],
  ["component_type_id"],
  [
    "display_name",
    "description",
    "thumbnail_url",
    "component_path",
    "config_schema",
    "default_config",
    "css_template",
    "version",
    "is_active",
    "sort_order",
  ]
);

/* ================= THEME SECTIONS ================= */
export const themeSectionModel = new CrudModel(
  "theme_sections",
  ["theme_id", "section_key"],
  [],
  [
    "component_variant_id",
    "name",
    "order_index",
    "is_visible",
    "config_data",
    "css_overrides",
    "content",
    "responsive_config",
    "animation_settings",
    "seo_settings",
  ]
);

/* ================= ACTIVE THEME CACHE ================= */
export const activeThemeCacheModel = new CrudModel(
  "active_theme_cache",
  ["theme_id"],
  ["theme_id"],
  ["theme_data", "hash", "expires_at"]
);
