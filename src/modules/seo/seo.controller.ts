import { FastifyRequest, FastifyReply } from "fastify";
import { successResponse, errorResponse } from "../../core/utils/response";
import {
  seoMetaModel,
  seoRedirectModel,
  seoKeywordModel,
  seoMapModel,
} from "./seo.model";

// ========== UTILITY FUNCTIONS ==========

/**
 * Parse pagination and filter parameters
 */
const parsePaginationParams = (query: any) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));
  return { page, limit };
};

/**
 * Handle errors consistently
 */
const handleError = (
  reply: FastifyReply,
  error: any,
  message: string,
  statusCode: number = 500,
) => {
  console.error(`[SEO Error]: ${message}`, error);
  reply.code(statusCode).send(errorResponse(message));
};

// ========== SEO META CONTROLLERS ==========

export async function createSeoMeta(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;

    // Validate required fields
    if (!data.entity_type || !data.entity_id) {
      return handleError(
        reply,
        null,
        "Entity type and entity ID are required",
        400,
      );
    }

    const result = await seoMetaModel.create(data);
    reply.code(201).send(successResponse(result, "SEO meta created successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to create SEO meta");
  }
}

export async function getSeoMeta(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const result = await seoMetaModel.findById(parsedId);

    if (!result) {
      return handleError(reply, null, "SEO meta not found", 404);
    }

    reply.send(successResponse(result, "SEO meta fetched successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to fetch SEO meta");
  }
}

export async function getAllSeoMeta(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      entity_type?: string;
      entity_id?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page, limit, entity_type, entity_id } = request.query;
    const { page: parsedPage, limit: parsedLimit } = parsePaginationParams({
      page,
      limit,
    });
    const filters: Record<string, any> = {};
    if (entity_type) filters.entity_type = entity_type;
    if (entity_id) {
      const parsedEntityId = parseInt(entity_id);
      if (!isNaN(parsedEntityId)) {
        filters.entity_id = parsedEntityId;
      }
    }
    const result = await seoMetaModel.findWithPagination(
      parsedPage,
      parsedLimit,
      filters,
    );
    const total = await seoMetaModel.count(filters);

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
          },
        },
        "SEO meta list fetched successfully",
      ),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch SEO meta list");
  }
}

export async function updateSeoMeta(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoMetaModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "SEO meta not found", 404);
    }

    const result = await seoMetaModel.update(parsedId, data);
    return reply.code(200).send(successResponse(result, "SEO meta updated successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to update SEO meta");
  }
}

export async function deleteSeoMeta(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoMetaModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "SEO meta not found", 404);
    }

    const result = await seoMetaModel.delete(parsedId);
    return reply.code(200).send(successResponse(result, "SEO meta deleted successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to delete SEO meta");
  }
}

export async function getSeoByEntity(
  request: FastifyRequest<{
    Params: { entity_type: string; entity_id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { entity_type, entity_id } = request.params;
    const parsedEntityId = parseInt(entity_id);

    if (isNaN(parsedEntityId)) {
      return handleError(reply, null, "Invalid entity ID format", 400);
    }

    const result = await seoMetaModel.findByField("entity_type", entity_type);

    if (!Array.isArray(result)) {
      return reply.send(successResponse(null, "Entity SEO fetched successfully"));
    }

    const entitySeo = result.find(
      (item: any) => item.entity_id === parsedEntityId,
    );

    reply.send(
      successResponse(entitySeo || null, "Entity SEO fetched successfully"),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch entity SEO");
  }
}

// ========== SEO REDIRECT CONTROLLERS ==========

export async function createSeoRedirect(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;

    // Validate required fields
    if (!data.old_url || !data.new_url) {
      return handleError(
        reply,
        null,
        "Old URL and new URL are required",
        400,
      );
    }

    // Set default redirect type if not provided
    if (!data.redirect_type) {
      data.redirect_type = 301;
    }

    const result = await seoRedirectModel.create(data);
    reply.code(201).send(successResponse(result, "Redirect created successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to create redirect");
  }
}

export async function getSeoRedirect(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const result = await seoRedirectModel.findById(parsedId);

    if (!result) {
      return handleError(reply, null, "Redirect not found", 404);
    }

    reply.send(successResponse(result, "Redirect fetched successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to fetch redirect");
  }
}

export async function getAllSeoRedirects(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page, limit } = request.query;
    const { page: parsedPage, limit: parsedLimit } = parsePaginationParams({
      page,
      limit,
    });

    const result = await seoRedirectModel.findWithPagination(
      parsedPage,
      parsedLimit,
    );
    const total = await seoRedirectModel.count();

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
          },
        },
        "Redirects list fetched successfully",
      ),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch redirects list");
  }
}

export async function updateSeoRedirect(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoRedirectModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "Redirect not found", 404);
    }

    const result = await seoRedirectModel.update(parsedId, data);
    return reply.code(200).send(successResponse(result, "Redirect updated successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to update redirect");
  }
}

export async function deleteSeoRedirect(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoRedirectModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "Redirect not found", 404);
    }

    const result = await seoRedirectModel.delete(parsedId);
    return reply.code(200).send(successResponse(result, "Redirect deleted successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to delete redirect");
  }
}

export async function checkRedirect(
  request: FastifyRequest<{ Querystring: { url: string } }>,
  reply: FastifyReply,
) {
  try {
    const { url } = request.query;

    if (!url) {
      return handleError(reply, null, "URL is required", 400);
    }

    const result = await seoRedirectModel.findByField("old_url", url);

    if (!Array.isArray(result)) {
      return reply.send(
        successResponse(null, "Redirect check completed"),
      );
    }

    reply.send(
      successResponse(result[0] || null, "Redirect check completed"),
    );
  } catch (error) {
    handleError(reply, error, "Failed to check redirect");
  }
}

// ========== SEO KEYWORD CONTROLLERS ==========

export async function createSeoKeyword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;

    // Validate required fields
    if (!data.keyword) {
      return handleError(reply, null, "Keyword is required", 400);
    }

    const result = await seoKeywordModel.create(data);
    reply.code(201).send(successResponse(result, "Keyword created successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to create keyword");
  }
}

export async function getSeoKeyword(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const result = await seoKeywordModel.findById(parsedId);

    if (!result) {
      return handleError(reply, null, "Keyword not found", 404);
    }

    reply.send(successResponse(result, "Keyword fetched successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to fetch keyword");
  }
}

export async function getAllSeoKeywords(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      entity_type?: string;
      entity_id?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page, limit, entity_type, entity_id } = request.query;
    const { page: parsedPage, limit: parsedLimit } = parsePaginationParams({
      page,
      limit,
    });

    const filters: Record<string, any> = {};
    if (entity_type) filters.entity_type = entity_type;
    if (entity_id) {
      const parsedEntityId = parseInt(entity_id);
      if (!isNaN(parsedEntityId)) {
        filters.entity_id = parsedEntityId;
      }
    }

    const result = await seoKeywordModel.findWithPagination(
      parsedPage,
      parsedLimit,
      filters,
    );
    const total = await seoKeywordModel.count(filters);

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
          },
        },
        "Keywords list fetched successfully",
      ),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch keywords list");
  }
}

export async function updateSeoKeyword(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoKeywordModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "Keyword not found", 404);
    }

    const result = await seoKeywordModel.update(parsedId, data);
    return reply.code(200).send(successResponse(result, "Keyword updated successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to update keyword");
  }
}

export async function deleteSeoKeyword(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoKeywordModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "Keyword not found", 404);
    }

    const result = await seoKeywordModel.delete(parsedId);
    return reply.code(200).send(successResponse(result, "Keyword deleted successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to delete keyword");
  }
}

export async function getKeywordsByEntity(
  request: FastifyRequest<{
    Params: { entity_type: string; entity_id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { entity_type, entity_id } = request.params;
    const parsedEntityId = parseInt(entity_id);

    if (isNaN(parsedEntityId)) {
      return handleError(reply, null, "Invalid entity ID format", 400);
    }

    const result = await seoKeywordModel.findByField(
      "entity_type",
      entity_type,
    );

    if (!Array.isArray(result)) {
      return reply.send(
        successResponse([], "Entity keywords fetched successfully"),
      );
    }

    const entityKeywords = result.filter(
      (item: any) => item.entity_id === parsedEntityId,
    );

    reply.send(
      successResponse(entityKeywords, "Entity keywords fetched successfully"),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch entity keywords");
  }
}

// ========== SEO SITEMAP CONTROLLERS ==========

export async function createSeoSitemap(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;

    // Validate required fields
    if (!data.url) {
      return handleError(reply, null, "URL is required", 400);
    }

    // Set default priority if not provided
    if (data.priority === undefined || data.priority === null) {
      data.priority = 0.5;
    }

    const result = await seoMapModel.create(data);
    reply.code(201).send(successResponse(result, "Sitemap entry created successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to create sitemap entry");
  }
}

export async function getSeoSitemap(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const result = await seoMapModel.findById(parsedId);

    if (!result) {
      return handleError(reply, null, "Sitemap entry not found", 404);
    }

    reply.send(successResponse(result, "Sitemap entry fetched successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to fetch sitemap entry");
  }
}

export async function getAllSeoSitemaps(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      change_freq?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page, limit, change_freq } = request.query;
    const { page: parsedPage, limit: parsedLimit } = parsePaginationParams({
      page,
      limit,
    });

    const filters: Record<string, any> = {};
    if (change_freq) filters.change_freq = change_freq;

    const result = await seoMapModel.findWithPagination(
      parsedPage,
      parsedLimit,
      filters,
    );
    const total = await seoMapModel.count(filters);

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
          },
        },
        "Sitemap list fetched successfully",
      ),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch sitemap list");
  }
}

export async function updateSeoSitemap(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoMapModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "Sitemap entry not found", 404);
    }

    const result = await seoMapModel.update(parsedId, data);
    return reply.code(200).send(successResponse(result, "Sitemap entry updated successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to update sitemap entry");
  }
}

export async function deleteSeoSitemap(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return handleError(reply, null, "Invalid ID format", 400);
    }

    const existing = await seoMapModel.findById(parsedId);
    if (!existing) {
      return handleError(reply, null, "Sitemap entry not found", 404);
    }

    const result = await seoMapModel.delete(parsedId);
    return reply.code(200).send(successResponse(result, "Sitemap entry deleted successfully"));
  } catch (error) {
    handleError(reply, error, "Failed to delete sitemap entry");
  }
}

export async function getSitemapByUrl(
  request: FastifyRequest<{ Querystring: { url: string } }>,
  reply: FastifyReply,
) {
  try {
    const { url } = request.query;

    if (!url) {
      return handleError(reply, null, "URL is required", 400);
    }

    const result = await seoMapModel.findByField("url", url);

    if (!Array.isArray(result)) {
      return reply.send(
        successResponse(null, "Sitemap URL check completed"),
      );
    }

    reply.send(
      successResponse(result[0] || null, "Sitemap URL check completed"),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch sitemap by URL");
  }
}

export async function getSitemapsByPriority(
  request: FastifyRequest<{
    Querystring: {
      min_priority?: string;
      max_priority?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const minPriority = parseFloat(request.query.min_priority || "0");
    const maxPriority = parseFloat(request.query.max_priority || "1");

    if (isNaN(minPriority) || isNaN(maxPriority)) {
      return handleError(
        reply,
        null,
        "Invalid priority values (must be numbers between 0 and 1)",
        400,
      );
    }

    const allSitemaps = await seoMapModel.findAll();

    if (!Array.isArray(allSitemaps)) {
      return reply.send(successResponse([], "Sitemaps by priority fetched successfully"));
    }

    const filteredSitemaps = allSitemaps.filter(
      (item: any) =>
        item.priority >= minPriority && item.priority <= maxPriority,
    );

    reply.send(
      successResponse(
        filteredSitemaps,
        "Sitemaps by priority fetched successfully",
      ),
    );
  } catch (error) {
    handleError(reply, error, "Failed to fetch sitemaps by priority");
  }
}