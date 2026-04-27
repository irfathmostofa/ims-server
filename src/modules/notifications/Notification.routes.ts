import { FastifyInstance } from "fastify";
import {
  getNotifications,
  getUnreadNotifications,
  getNotificationsByType,
  getDashboardNotifications,
  getNotificationStats,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotification,
  cleanupOldNotifications,
} from "./notification.controller";

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

export async function notificationRoutes(app: FastifyInstance) {
  // Apply authentication middleware to all routes
  app.addHook("onRequest", app.authenticate);

  // ============================================================================
  // GET ROUTES
  // ============================================================================

  /**
   * GET /notifications
   * Get paginated notifications
   * Query params: page (default: 1), pageSize (default: 10)
   */
  app.get(
    "/notifications",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "string", description: "Page number" },
            pageSize: { type: "string", description: "Items per page" },
          },
        },
        response: {
          200: {
            description: "Successful response",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: { type: "array" },
              pagination: { type: "object" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
          },
          500: {
            description: "Server error",
            type: "object",
          },
        },
      },
    },
    getNotifications,
  );

  /**
   * GET /notifications/unread
   * Get unread notifications with pagination
   * Query params: page (default: 1), pageSize (default: 10)
   */
  app.get(
    "/notifications/unread",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "string" },
            pageSize: { type: "string" },
          },
        },
      },
    },
    getUnreadNotifications,
  );

  /**
   * GET /notifications/by-type/:type
   * Get notifications filtered by type
   * Params: type (success, warning, error, info)
   * Query params: page (default: 1), pageSize (default: 10)
   */
  app.get(
    "/notifications/by-type/:type",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["success", "warning", "error", "info"],
              description: "Notification type",
            },
          },
          required: ["type"],
        },
        querystring: {
          type: "object",
          properties: {
            page: { type: "string" },
            pageSize: { type: "string" },
          },
        },
      },
    },
    getNotificationsByType,
  );

  /**
   * GET /notifications/dashboard
   * Get dashboard notifications (latest 10)
   */
  app.get(
    "/notifications/dashboard",
    {
      schema: {},
    },
    getDashboardNotifications,
  );

  /**
   * GET /notifications/count
   * Get unread count and statistics
   */
  app.get(
    "/notifications/count",
    {
      schema: {},
    },
    getNotificationStats,
  );

  // ============================================================================
  // PUT ROUTES
  // ============================================================================

  /**
   * PUT /notifications/:id/read
   * Mark a single notification as read
   */
  app.put(
    "/notifications/:id/read",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Notification ID" },
          },
          required: ["id"],
        },
      },
    },
    markNotificationAsRead,
  );

  /**
   * PUT /notifications/read-all
   * Mark all notifications as read
   */
  app.put(
    "/notifications/read-all",
    {
      schema: {},
    },
    markAllNotificationsAsRead,
  );

  // ============================================================================
  // POST ROUTES
  // ============================================================================

  /**
   * POST /notifications
   * Create a new notification
   */
  app.post(
    "/notifications",
    {
      schema: {
        body: {
          type: "object",
          required: ["userId", "title", "message"],
          properties: {
            userId: { type: "number", description: "User ID" },
            title: { type: "string", description: "Notification title" },
            message: { type: "string", description: "Notification message" },
            type: {
              type: "string",
              enum: ["success", "warning", "error", "info"],
              default: "info",
              description: "Notification type",
            },
            entityType: {
              type: "string",
              description: "Entity type (order, product, payment, etc.)",
            },
            entityId: { type: "number", description: "Entity ID" },
            link: { type: "string", description: "Link to resource" },
          },
        },
      },
    },
    createNotification,
  );

  /**
   * POST /notifications/cleanup
   * Clean up old notifications (admin only)
   */
  app.post(
    "/notifications/cleanup",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            days: {
              type: "number",
              default: 30,
              description: "Delete notifications older than N days",
            },
          },
        },
      },
    },
    cleanupOldNotifications,
  );

  // ============================================================================
  // DELETE ROUTES
  // ============================================================================

  /**
   * DELETE /notifications/:id
   * Delete a notification
   */
  app.delete(
    "/notifications/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Notification ID" },
          },
          required: ["id"],
        },
      },
    },
    deleteNotification,
  );
}

// ============================================================================
// USAGE IN MAIN APP
// ============================================================================

/*
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { notificationRoutes } from "./routes/notification.routes";

const app = Fastify({ logger: true });

// Register JWT plugin
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "your-secret-key",
});

// Custom decorator for authentication
app.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    reply.status(401).send({ success: false, error: "Unauthorized" });
  }
});

// Register notification routes with /api/notifications prefix
app.register(notificationRoutes, { prefix: "/api/notifications" });

app.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server running on ${address}`);
});
*/
