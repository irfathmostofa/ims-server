import { FastifyRequest, FastifyReply } from "fastify";
import { successResponse, errorResponse } from "../../core/utils/response";
import {
  seoMetaModel,
  seoRedirectModel,
  seoKeywordModel,
  seoMapModel,
} from "./seo.model";

// ========== SEO META CONTROLLERS ==========

export async function createSeoMeta(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;
    const result = await seoMetaModel.create(data);
    reply.send(successResponse(result, "SEO meta created successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to create SEO meta"));
  }
}

export async function getSeoMeta(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const result = await seoMetaModel.findById(parseInt(id));

    if (!result) {
      return reply.send(errorResponse("SEO meta not found"));
    }

    reply.send(successResponse(result, "SEO meta fetched successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to fetch SEO meta"));
  }
}

export async function getAllSeoMeta(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      entity_type?: string;
      entity_id?: number;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page = 1, limit = 10, entity_type, entity_id } = request.query;

    const filters: Record<string, any> = {};
    if (entity_type) filters.entity_type = entity_type;
    if (entity_id) filters.entity_id = entity_id;

    const result = await seoMetaModel.findWithPagination(page, limit, filters);
    const total = await seoMetaModel.count(filters);

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        "SEO meta list fetched successfully",
      ),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch SEO meta list"));
  }
}

export async function updateSeoMeta(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;

    const existing = await seoMetaModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("SEO meta not found"));
    }

    const result = await seoMetaModel.update(parseInt(id), data);
    reply.send(successResponse(result, "SEO meta updated successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to update SEO meta"));
  }
}

export async function deleteSeoMeta(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;

    const existing = await seoMetaModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("SEO meta not found"));
    }

    const result = await seoMetaModel.delete(parseInt(id));
    reply.send(successResponse(result, "SEO meta deleted successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to delete SEO meta"));
  }
}

// Get SEO by entity
export async function getSeoByEntity(
  request: FastifyRequest<{
    Params: { entity_type: string; entity_id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { entity_type, entity_id } = request.params;
    const result = await seoMetaModel.findByField("entity_type", entity_type);

    const entitySeo = result.filter(
      (item: any) => item.entity_id === parseInt(entity_id),
    );

    reply.send(
      successResponse(entitySeo[0] || null, "Entity SEO fetched successfully"),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch entity SEO"));
  }
}

// ========== SEO REDIRECT CONTROLLERS ==========

export async function createSeoRedirect(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;
    const result = await seoRedirectModel.create(data);
    reply.send(successResponse(result, "Redirect created successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to create redirect"));
  }
}

export async function getSeoRedirect(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const result = await seoRedirectModel.findById(parseInt(id));

    if (!result) {
      return reply.send(errorResponse("Redirect not found"));
    }

    reply.send(successResponse(result, "Redirect fetched successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to fetch redirect"));
  }
}

export async function getAllSeoRedirects(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page = 1, limit = 10 } = request.query;

    const result = await seoRedirectModel.findWithPagination(page, limit);
    const total = await seoRedirectModel.count();

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        "Redirects list fetched successfully",
      ),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch redirects list"));
  }
}

export async function updateSeoRedirect(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;

    const existing = await seoRedirectModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("Redirect not found"));
    }

    const result = await seoRedirectModel.update(parseInt(id), data);
    reply.send(successResponse(result, "Redirect updated successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to update redirect"));
  }
}

export async function deleteSeoRedirect(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;

    const existing = await seoRedirectModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("Redirect not found"));
    }

    const result = await seoRedirectModel.delete(parseInt(id));
    reply.send(successResponse(result, "Redirect deleted successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to delete redirect"));
  }
}

// Check redirect by old URL
export async function checkRedirect(
  request: FastifyRequest<{ Querystring: { url: string } }>,
  reply: FastifyReply,
) {
  try {
    const { url } = request.query;
    const result = await seoRedirectModel.findByField("old_url", url);

    reply.send(successResponse(result[0] || null, "Redirect check completed"));
  } catch (error) {
    reply.send(errorResponse("Failed to check redirect"));
  }
}

// ========== SEO KEYWORD CONTROLLERS ==========

export async function createSeoKeyword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;
    const result = await seoKeywordModel.create(data);
    reply.send(successResponse(result, "Keyword created successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to create keyword"));
  }
}

export async function getSeoKeyword(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const result = await seoKeywordModel.findById(parseInt(id));

    if (!result) {
      return reply.send(errorResponse("Keyword not found"));
    }

    reply.send(successResponse(result, "Keyword fetched successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to fetch keyword"));
  }
}

export async function getAllSeoKeywords(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      entity_type?: string;
      entity_id?: number;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page = 1, limit = 10, entity_type, entity_id } = request.query;

    const filters: Record<string, any> = {};
    if (entity_type) filters.entity_type = entity_type;
    if (entity_id) filters.entity_id = entity_id;

    const result = await seoKeywordModel.findWithPagination(
      page,
      limit,
      filters,
    );
    const total = await seoKeywordModel.count(filters);

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        "Keywords list fetched successfully",
      ),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch keywords list"));
  }
}

export async function updateSeoKeyword(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;

    const existing = await seoKeywordModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("Keyword not found"));
    }

    const result = await seoKeywordModel.update(parseInt(id), data);
    reply.send(successResponse(result, "Keyword updated successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to update keyword"));
  }
}

export async function deleteSeoKeyword(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;

    const existing = await seoKeywordModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("Keyword not found"));
    }

    const result = await seoKeywordModel.delete(parseInt(id));
    reply.send(successResponse(result, "Keyword deleted successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to delete keyword"));
  }
}

// Get keywords by entity
export async function getKeywordsByEntity(
  request: FastifyRequest<{
    Params: { entity_type: string; entity_id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { entity_type, entity_id } = request.params;
    const result = await seoKeywordModel.findByField(
      "entity_type",
      entity_type,
    );

    const entityKeywords = result.filter(
      (item: any) => item.entity_id === parseInt(entity_id),
    );

    reply.send(
      successResponse(entityKeywords, "Entity keywords fetched successfully"),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch entity keywords"));
  }
}

// ========== SEO SITEMAP CONTROLLERS ==========

export async function createSeoSitemap(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = request.body as Record<string, any>;
    const result = await seoMapModel.create(data);
    reply.send(successResponse(result, "Sitemap entry created successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to create sitemap entry"));
  }
}

export async function getSeoSitemap(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const result = await seoMapModel.findById(parseInt(id));

    if (!result) {
      return reply.send(errorResponse("Sitemap entry not found"));
    }

    reply.send(successResponse(result, "Sitemap entry fetched successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to fetch sitemap entry"));
  }
}

export async function getAllSeoSitemaps(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      change_freq?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page = 1, limit = 10, change_freq } = request.query;

    const filters: Record<string, any> = {};
    if (change_freq) filters.change_freq = change_freq;

    const result = await seoMapModel.findWithPagination(page, limit, filters);
    const total = await seoMapModel.count(filters);

    reply.send(
      successResponse(
        {
          data: result,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        "Sitemap list fetched successfully",
      ),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch sitemap list"));
  }
}

export async function updateSeoSitemap(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const data = request.body as Record<string, any>;

    const existing = await seoMapModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("Sitemap entry not found"));
    }

    const result = await seoMapModel.update(parseInt(id), data);
    reply.send(successResponse(result, "Sitemap entry updated successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to update sitemap entry"));
  }
}

export async function deleteSeoSitemap(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;

    const existing = await seoMapModel.findById(parseInt(id));
    if (!existing) {
      return reply.send(errorResponse("Sitemap entry not found"));
    }

    const result = await seoMapModel.delete(parseInt(id));
    reply.send(successResponse(result, "Sitemap entry deleted successfully"));
  } catch (error) {
    reply.send(errorResponse("Failed to delete sitemap entry"));
  }
}

// Get sitemap by URL
export async function getSitemapByUrl(
  request: FastifyRequest<{ Querystring: { url: string } }>,
  reply: FastifyReply,
) {
  try {
    const { url } = request.query;
    const result = await seoMapModel.findByField("url", url);

    reply.send(
      successResponse(result[0] || null, "Sitemap URL check completed"),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch sitemap by URL"));
  }
}

// Get sitemaps by priority range
export async function getSitemapsByPriority(
  request: FastifyRequest<{
    Querystring: {
      min_priority?: number;
      max_priority?: number;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { min_priority = 0, max_priority = 1 } = request.query;

    const allSitemaps = await seoMapModel.findAll();
    const filteredSitemaps = allSitemaps.filter(
      (item: any) =>
        item.priority >= min_priority && item.priority <= max_priority,
    );

    reply.send(
      successResponse(
        filteredSitemaps,
        "Sitemaps by priority fetched successfully",
      ),
    );
  } catch (error) {
    reply.send(errorResponse("Failed to fetch sitemaps by priority"));
  }
}
