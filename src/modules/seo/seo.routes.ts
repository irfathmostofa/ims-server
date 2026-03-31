import { FastifyInstance } from "fastify";
import {
  // SEO Meta
  createSeoMeta,
  getSeoMeta,
  getAllSeoMeta,
  updateSeoMeta,
  deleteSeoMeta,
  getSeoByEntity,

  // SEO Redirect
  createSeoRedirect,
  getSeoRedirect,
  getAllSeoRedirects,
  updateSeoRedirect,
  deleteSeoRedirect,
  checkRedirect,

  // SEO Keyword
  createSeoKeyword,
  getSeoKeyword,
  getAllSeoKeywords,
  updateSeoKeyword,
  deleteSeoKeyword,
  getKeywordsByEntity,

  // SEO Sitemap
  createSeoSitemap,
  getSeoSitemap,
  getAllSeoSitemaps,
  updateSeoSitemap,
  deleteSeoSitemap,
  getSitemapByUrl,
  getSitemapsByPriority,
} from "./seo.controller";

export default async function seoRoutes(app: FastifyInstance) {
  // ===== SEO META ROUTES =====
  // IMPORTANT: Specific routes MUST come before parameterized routes
  // This prevents /meta/entity/:type/:id from matching /meta/:id

  // Create new SEO meta
  app.post("/meta", createSeoMeta);

  // Get SEO meta by entity type and ID (specific route)
  app.get("/meta/entity/:entity_type/:entity_id", getSeoByEntity);

  // Update SEO meta by ID (POST for update)
  app.post("/update-meta/:id", updateSeoMeta);

  // Delete SEO meta by ID
  app.post("/delete-meta/:id", deleteSeoMeta);

  // Get single SEO meta by ID (parameterized - goes last)
  app.get("/meta/:id", getSeoMeta);

  // Get all SEO meta with pagination and filters (GET without ID)
  app.get("/meta", getAllSeoMeta);

  // ===== SEO REDIRECT ROUTES =====

  // Create new redirect
  app.post("/redirect", createSeoRedirect);

  // Check redirect by old URL (specific route with query param)
  app.get("/redirect/check", checkRedirect);

  // Update redirect by ID
  app.post("/update-redirect/:id", updateSeoRedirect);

  // Delete redirect by ID
  app.post("/delete-redirect/:id", deleteSeoRedirect);

  // Get single redirect by ID (parameterized - goes last)
  app.get("/redirect/:id", getSeoRedirect);

  // Get all redirects with pagination
  app.get("/redirect", getAllSeoRedirects);

  // ===== SEO KEYWORD ROUTES =====

  // Create new keyword
  app.post("/keyword", createSeoKeyword);

  // Get keywords by entity type and ID (specific route)
  app.get("/keyword/entity/:entity_type/:entity_id", getKeywordsByEntity);

  // Update keyword by ID
  app.post("/update-keyword/:id", updateSeoKeyword);

  // Delete keyword by ID
  app.post("/delete-keyword/:id", deleteSeoKeyword);

  // Get single keyword by ID (parameterized - goes last)
  app.get("/keyword/:id", getSeoKeyword);

  // Get all keywords with pagination and filters
  app.get("/keyword", getAllSeoKeywords);

  // ===== SEO SITEMAP ROUTES =====

  // Create new sitemap entry
  app.post("/sitemap", createSeoSitemap);

  // Get sitemap by URL (specific route with query param)
  app.get("/sitemap/url", getSitemapByUrl);

  // Get sitemaps by priority range (specific route)
  app.get("/sitemap/priority/range", getSitemapsByPriority);

  // Update sitemap entry by ID
  app.post("/update-sitemap/:id", updateSeoSitemap);

  // Delete sitemap entry by ID
  app.post("/delete-sitemap/:id", deleteSeoSitemap);

  // Get single sitemap entry by ID (parameterized - goes last)
  app.get("/sitemap/:id", getSeoSitemap);

  // Get all sitemap entries with pagination and filters (goes last)
  app.get("/sitemap", getAllSeoSitemaps);
}
