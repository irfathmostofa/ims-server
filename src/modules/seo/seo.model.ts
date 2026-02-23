import { CrudModel } from "../../core/models/crud.model";

// ===== SEO META MODEL =====
export const seoMetaModel = new CrudModel(
  "seo_meta",
  ["entity_type", "entity_id"], // required fields
  ["entity_type", "entity_id"], // unique constraint (composite unique)
  [
    "meta_title",
    "meta_description",
    "meta_keywords",
    "canonical_url",
    "og_title",
    "og_description",
    "og_image",
    "twitter_title",
    "twitter_description",
    "twitter_image",
    "schema_json",
    "is_index",
    "is_follow",
  ], // optional fields
);

// ===== SEO REDIRECT MODEL =====
export const seoRedirectModel = new CrudModel(
  "seo_redirect",
  ["old_url", "new_url"], // required fields
  ["old_url"], // unique fields
  ["redirect_type"], // optional fields (with default values)
);

// ===== SEO KEYWORD MODEL =====
export const seoKeywordModel = new CrudModel(
  "seo_keyword",
  ["keyword"], // required fields
  [], // no unique constraints (composite unique might be needed but not specified)
  ["entity_type", "entity_id"], // optional fields
);

// ===== SEO SITEMAP MODEL =====
export const seoMapModel = new CrudModel(
  "seo_sitemap",
  ["url"], // required fields
  ["url"], // unique fields
  ["priority", "change_freq", "last_modified"], // optional fields (with default values)
);
