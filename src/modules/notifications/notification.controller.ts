import { FastifyRequest, FastifyReply } from "fastify";
import pool from "../../config/db";
import { NotificationService } from "./Notification.service";

const notificationService = new NotificationService(pool);

// ============================================================================
// TYPES
// ============================================================================

interface NotificationQuery {
  page?: string;
  pageSize?: string;
}

interface NotificationTypeParams {
  type: string;
}

interface NotificationIdParams {
  id: string;
}

interface CreateNotificationBody {
  userId: number;
  title: string;
  message: string;
  type?: "success" | "warning" | "error" | "info";
  entityType?: string;
  entityId?: number;
  link?: string;
}

interface CleanupBody {
  days?: number;
}

// ============================================================================
// GET NOTIFICATIONS - Paginated
// ============================================================================

export async function getNotifications(
  req: FastifyRequest<{ Querystring: NotificationQuery }>,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;
    const page = parseInt(req.query.page || "1");
    const pageSize = parseInt(req.query.pageSize || "10");

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const notifications = await notificationService.getNotificationsPaginated(
      userId,
      page,
      pageSize,
    );

    return reply.status(200).send({
      success: true,
      data: notifications.data,
      pagination: {
        page: notifications.current_page,
        pageSize: notifications.page_size,
        totalCount: notifications.total_count,
        totalPages: notifications.total_pages,
        hasNext: notifications.has_next,
        hasPrev: notifications.has_prev,
      },
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to fetch notifications",
    });
  }
}

// ============================================================================
// GET UNREAD NOTIFICATIONS
// ============================================================================

export async function getUnreadNotifications(
  req: FastifyRequest<{ Querystring: NotificationQuery }>,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;
    const page = parseInt(req.query.page || "1");
    const pageSize = parseInt(req.query.pageSize || "10");

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const notifications = await notificationService.getUnreadNotifications(
      userId,
      pageSize,
      page,
    );

    return reply.status(200).send({
      success: true,
      data: notifications.data,
      pagination: {
        page: notifications.current_page,
        pageSize: notifications.page_size,
        totalCount: notifications.total_count,
        totalPages: notifications.total_pages,
        hasNext: notifications.has_next,
        hasPrev: notifications.has_prev,
      },
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to fetch unread notifications",
    });
  }
}

// ============================================================================
// GET NOTIFICATIONS BY TYPE
// ============================================================================

export async function getNotificationsByType(
  req: FastifyRequest<{
    Params: NotificationTypeParams;
    Querystring: NotificationQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;
    const { type } = req.params;
    const page = parseInt(req.query.page || "1");
    const pageSize = parseInt(req.query.pageSize || "10");

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const validTypes = ["success", "warning", "error", "info"];
    if (!validTypes.includes(type)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const notifications = await notificationService.getNotificationsByType(
      userId,
      type as "success" | "warning" | "error" | "info",
      page,
      pageSize,
    );

    return reply.status(200).send({
      success: true,
      data: notifications.data,
      pagination: {
        page: notifications.current_page,
        pageSize: notifications.page_size,
        totalCount: notifications.total_count,
        totalPages: notifications.total_pages,
        hasNext: notifications.has_next,
        hasPrev: notifications.has_prev,
      },
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to fetch notifications by type",
    });
  }
}

// ============================================================================
// GET DASHBOARD NOTIFICATIONS
// ============================================================================

export async function getDashboardNotifications(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const notifications =
      await notificationService.getDashboardNotifications(userId);

    return reply.status(200).send({
      success: true,
      data: notifications,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to fetch dashboard notifications",
    });
  }
}

// ============================================================================
// GET NOTIFICATION COUNT & STATS
// ============================================================================

export async function getNotificationStats(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const unreadCount = await notificationService.getUnreadCount(userId);
    const stats = await notificationService.getNotificationStats(userId);

    return reply.status(200).send({
      success: true,
      unreadCount,
      stats,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to fetch notification stats",
    });
  }
}

// ============================================================================
// MARK NOTIFICATION AS READ
// ============================================================================

export async function markNotificationAsRead(
  req: FastifyRequest<{ Params: NotificationIdParams }>,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;
    const { id } = req.params;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return reply.status(400).send({
        success: false,
        error: "Invalid notification ID",
      });
    }

    const marked = await notificationService.markAsRead(notificationId);

    return reply.status(200).send({
      success: true,
      marked,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to mark notification as read",
    });
  }
}

// ============================================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================================

export async function markAllNotificationsAsRead(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const count = await notificationService.markAllAsRead(userId);

    return reply.status(200).send({
      success: true,
      markedCount: count,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to mark all notifications as read",
    });
  }
}

// ============================================================================
// CREATE NOTIFICATION
// ============================================================================

export async function createNotification(
  req: FastifyRequest<{ Body: CreateNotificationBody }>,
  reply: FastifyReply,
) {
  try {
    const {
      userId,
      title,
      message,
      type = "info",
      entityType,
      entityId,
      link,
    } = req.body;

    // Validate required fields
    if (!userId || !title || !message) {
      return reply.status(400).send({
        success: false,
        error: "Missing required fields: userId, title, message",
      });
    }

    // Validate type
    const validTypes = ["success", "warning", "error", "info"];
    if (type && !validTypes.includes(type)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const notificationId = await notificationService.createNotification(
      userId,
      title,
      message,
      type,
      entityType,
      entityId,
      link,
    );

    return reply.status(201).send({
      success: true,
      notificationId,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to create notification",
    });
  }
}

// ============================================================================
// DELETE NOTIFICATION
// ============================================================================

export async function deleteNotification(
  req: FastifyRequest<{ Params: NotificationIdParams }>,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;
    const { id } = req.params;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return reply.status(400).send({
        success: false,
        error: "Invalid notification ID",
      });
    }

    const deleted =
      await notificationService.deleteNotification(notificationId);

    return reply.status(200).send({
      success: true,
      deleted,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to delete notification",
    });
  }
}

// ============================================================================
// CLEANUP OLD NOTIFICATIONS (Admin Only)
// ============================================================================

export async function cleanupOldNotifications(
  req: FastifyRequest<{ Body: CleanupBody }>,
  reply: FastifyReply,
) {
  try {
    const userId = (req.user as any)?.id;
    const { days = 30 } = req.body;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized - User ID not found",
      });
    }

    // Check if user is admin (implement your auth logic)
    // if (!req.user?.isAdmin) {
    //   return reply.status(403).send({
    //     success: false,
    //     error: "Forbidden - Admin access required",
    //   });
    // }

    if (days < 1) {
      return reply.status(400).send({
        success: false,
        error: "Days must be greater than 0",
      });
    }

    const deletedCount =
      await notificationService.cleanupOldNotifications(days);

    return reply.status(200).send({
      success: true,
      deletedCount,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "Failed to cleanup notifications",
    });
  }
}
