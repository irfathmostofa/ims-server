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
  // Apply authentication hook to all routes
  //   app.addHook("onRequest", app.authenticate);
  // Create new SEO meta
  app.post("/seo/meta", createSeoMeta);

  // Get all SEO meta with pagination and filters
  app.get("/seo/meta", getAllSeoMeta);

  // Get single SEO meta by ID
  app.get("/seo/meta/:id", getSeoMeta);

  // Update SEO meta by ID
  app.put("/seo/meta/:id", updateSeoMeta);

  // Delete SEO meta by ID
  app.delete("/seo/meta/:id", deleteSeoMeta);

  // Get SEO meta by entity type and ID
  app.get("/seo/meta/entity/:entity_type/:entity_id", getSeoByEntity);

  // Create new redirect
  app.post("/seo/redirect", createSeoRedirect);

  // Get all redirects with pagination
  app.get("/seo/redirect", getAllSeoRedirects);

  // Get single redirect by ID
  app.get("/seo/redirect/:id", getSeoRedirect);

  // Update redirect by ID
  app.put("/seo/redirect/:id", updateSeoRedirect);

  // Delete redirect by ID
  app.delete("/seo/redirect/:id", deleteSeoRedirect);

  // Check redirect by old URL (useful for middleware)
  app.get("/seo/redirect/check", checkRedirect);

  // Create new keyword
  app.post("/seo/keyword", createSeoKeyword);

  // Get all keywords with pagination and filters
  app.get("/seo/keyword", getAllSeoKeywords);

  // Get single keyword by ID
  app.get("/seo/keyword/:id", getSeoKeyword);

  // Update keyword by ID
  app.put("/seo/keyword/:id", updateSeoKeyword);

  // Delete keyword by ID
  app.delete("/seo/keyword/:id", deleteSeoKeyword);

  // Get keywords by entity type and ID
  app.get("/seo/keyword/entity/:entity_type/:entity_id", getKeywordsByEntity);

  // Create new sitemap entry
  app.post("/seo/sitemap", createSeoSitemap);

  // Get all sitemap entries with pagination and filters
  app.get("/seo/sitemap", getAllSeoSitemaps);

  // Get single sitemap entry by ID
  app.get("/seo/sitemap/:id", getSeoSitemap);

  // Update sitemap entry by ID
  app.put("/seo/sitemap/:id", updateSeoSitemap);

  // Delete sitemap entry by ID
  app.delete("/seo/sitemap/:id", deleteSeoSitemap);

  // Get sitemap by URL
  app.get("/seo/sitemap/url", getSitemapByUrl);

  // Get sitemaps by priority range
  app.get("/seo/sitemap/priority/range", getSitemapsByPriority);
}
