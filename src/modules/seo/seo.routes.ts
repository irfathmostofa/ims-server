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
  app.post("/meta", createSeoMeta);

  // Get all SEO meta with pagination and filters
  app.get("/meta", getAllSeoMeta);

  // Get single SEO meta by ID
  app.get("/meta/:id", getSeoMeta);

  // Update SEO meta by ID
  app.put("/meta/:id", updateSeoMeta);

  // Delete SEO meta by ID
  app.delete("/meta/:id", deleteSeoMeta);

  // Get SEO meta by entity type and ID
  app.get("/meta/entity/:entity_type/:entity_id", getSeoByEntity);

  // Create new redirect
  app.post("/redirect", createSeoRedirect);

  // Get all redirects with pagination
  app.get("/redirect", getAllSeoRedirects);

  // Get single redirect by ID
  app.get("/redirect/:id", getSeoRedirect);

  // Update redirect by ID
  app.put("/redirect/:id", updateSeoRedirect);

  // Delete redirect by ID
  app.delete("/redirect/:id", deleteSeoRedirect);

  // Check redirect by old URL (useful for middleware)
  app.get("/redirect/check", checkRedirect);

  // Create new keyword
  app.post("/keyword", createSeoKeyword);

  // Get all keywords with pagination and filters
  app.get("/keyword", getAllSeoKeywords);

  // Get single keyword by ID
  app.get("/keyword/:id", getSeoKeyword);

  // Update keyword by ID
  app.put("/keyword/:id", updateSeoKeyword);

  // Delete keyword by ID
  app.delete("/keyword/:id", deleteSeoKeyword);

  // Get keywords by entity type and ID
  app.get("/keyword/entity/:entity_type/:entity_id", getKeywordsByEntity);

  // Create new sitemap entry
  app.post("/sitemap", createSeoSitemap);

  // Get all sitemap entries with pagination and filters
  app.get("/sitemap", getAllSeoSitemaps);

  // Get single sitemap entry by ID
  app.get("/sitemap/:id", getSeoSitemap);

  // Update sitemap entry by ID
  app.put("/sitemap/:id", updateSeoSitemap);

  // Delete sitemap entry by ID
  app.delete("/sitemap/:id", deleteSeoSitemap);

  // Get sitemap by URL
  app.get("/sitemap/url", getSitemapByUrl);

  // Get sitemaps by priority range
  app.get("/sitemap/priority/range", getSitemapsByPriority);
}
