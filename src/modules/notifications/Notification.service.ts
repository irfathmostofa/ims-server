import { Pool, QueryResult } from "pg";

// ============================================================================
// TYPES
// ============================================================================

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  entity_type?: string;
  entity_id?: number;
  link?: string;
  read: boolean;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationWithTime extends Notification {
  time: string;
}

export interface PaginatedNotifications {
  data: NotificationWithTime[];
  total_count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface UnreadCount {
  user_id: number;
  unread_count: number;
  warning_count: number;
  error_count: number;
}

export interface NotificationStats {
  total: number;
  read_count: number;
  unread_count: number;
  success_count: number;
  warning_count: number;
  error_count: number;
  info_count: number;
}

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export class NotificationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get paginated notifications for a user
   * @param userId - User ID
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 10)
   * @returns PaginatedNotifications
   */
  async getNotificationsPaginated(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<PaginatedNotifications> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM get_notifications_paginated($1, $2, $3)",
        [userId, page, pageSize],
      );

      if (result.rows.length === 0) {
        return {
          data: [],
          total_count: 0,
          total_pages: 0,
          current_page: page,
          page_size: pageSize,
          has_next: false,
          has_prev: false,
        };
      }

      const firstRow = result.rows[0];
      const total_count = firstRow.total_count;
      const total_pages = firstRow.total_pages;

      return {
        data: result.rows.map((row) => ({
          ...row,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          read_at: row.read_at ? new Date(row.read_at) : undefined,
        })),
        total_count,
        total_pages,
        current_page: page,
        page_size: pageSize,
        has_next: page < total_pages,
        has_prev: page > 1,
      };
    } catch (error) {
      console.error("Error fetching paginated notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread notifications with pagination
   * @param userId - User ID
   * @param pageSize - Items per page (default: 10)
   * @param page - Page number (default: 1)
   * @returns PaginatedNotifications
   */
  async getUnreadNotifications(
    userId: number,
    pageSize: number = 10,
    page: number = 1,
  ): Promise<PaginatedNotifications> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM get_unread_notifications($1, $2, $3)",
        [userId, pageSize, page],
      );

      if (result.rows.length === 0) {
        return {
          data: [],
          total_count: 0,
          total_pages: 0,
          current_page: page,
          page_size: pageSize,
          has_next: false,
          has_prev: false,
        };
      }

      const firstRow = result.rows[0];
      const total_unread = firstRow.total_unread;
      const total_pages = firstRow.total_pages;

      return {
        data: result.rows.map((row) => ({
          ...row,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
        })),
        total_count: total_unread,
        total_pages,
        current_page: page,
        page_size: pageSize,
        has_next: page < total_pages,
        has_prev: page > 1,
      };
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      throw error;
    }
  }

  /**
   * Get notifications by type with pagination
   * @param userId - User ID
   * @param type - Notification type (success, warning, error, info)
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 10)
   * @returns PaginatedNotifications
   */
  async getNotificationsByType(
    userId: number,
    type: "success" | "warning" | "error" | "info",
    page: number = 1,
    pageSize: number = 10,
  ): Promise<PaginatedNotifications> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM get_notifications_by_type($1, $2, $3, $4)",
        [userId, type, page, pageSize],
      );

      if (result.rows.length === 0) {
        return {
          data: [],
          total_count: 0,
          total_pages: 0,
          current_page: page,
          page_size: pageSize,
          has_next: false,
          has_prev: false,
        };
      }

      const firstRow = result.rows[0];
      const total_count = firstRow.total_count;
      const total_pages = firstRow.total_pages;

      return {
        data: result.rows.map((row) => ({
          ...row,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
        })),
        total_count,
        total_pages,
        current_page: page,
        page_size: pageSize,
        has_next: page < total_pages,
        has_prev: page > 1,
      };
    } catch (error) {
      console.error("Error fetching notifications by type:", error);
      throw error;
    }
  }

  /**
   * Get dashboard notifications (latest 10, unread first)
   * @param userId - User ID
   * @returns Array of notifications
   */
  async getDashboardNotifications(
    userId: number,
  ): Promise<NotificationWithTime[]> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM get_dashboard_notifications($1)",
        [userId],
      );

      return result.rows.map((row) => ({
        ...row,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
    } catch (error) {
      console.error("Error fetching dashboard notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   * @param userId - User ID
   * @returns UnreadCount object
   */
  async getUnreadCount(userId: number): Promise<UnreadCount | null> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM v_notifications_unread_count WHERE user_id = $1",
        [userId],
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   * @param userId - User ID
   * @returns NotificationStats object
   */
  async getNotificationStats(userId: number): Promise<NotificationStats> {
    try {
      const result = await this.pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN read = TRUE THEN 1 END) as read_count,
          COUNT(CASE WHEN read = FALSE THEN 1 END) as unread_count,
          COUNT(CASE WHEN type = 'success' THEN 1 END) as success_count,
          COUNT(CASE WHEN type = 'warning' THEN 1 END) as warning_count,
          COUNT(CASE WHEN type = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN type = 'info' THEN 1 END) as info_count
        FROM notifications
        WHERE user_id = $1`,
        [userId],
      );

      return {
        total: parseInt(result.rows[0].total),
        read_count: parseInt(result.rows[0].read_count),
        unread_count: parseInt(result.rows[0].unread_count),
        success_count: parseInt(result.rows[0].success_count),
        warning_count: parseInt(result.rows[0].warning_count),
        error_count: parseInt(result.rows[0].error_count),
        info_count: parseInt(result.rows[0].info_count),
      };
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      throw error;
    }
  }

  /**
   * Mark a single notification as read
   * @param notificationId - Notification ID
   * @returns boolean - Success status
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        "SELECT mark_notification_read($1)",
        [notificationId],
      );

      return result.rows[0].mark_notification_read === true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - User ID
   * @returns number - Count of marked notifications
   */
  async markAllAsRead(userId: number): Promise<number> {
    try {
      const result = await this.pool.query(
        "SELECT mark_all_notifications_read($1)",
        [userId],
      );

      return result.rows[0].mark_all_notifications_read;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Create a new notification
   * @param userId - User ID
   * @param title - Notification title
   * @param message - Notification message
   * @param type - Notification type
   * @param entityType - Entity type (optional)
   * @param entityId - Entity ID (optional)
   * @param link - Link to related resource (optional)
   * @returns number - Notification ID
   */
  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: "success" | "warning" | "error" | "info" = "info",
    entityType?: string,
    entityId?: number,
    link?: string,
  ): Promise<number> {
    try {
      const result = await this.pool.query(
        "SELECT create_notification($1, $2, $3, $4, $5, $6, $7)",
        [userId, title, message, type, entityType, entityId, link],
      );

      return result.rows[0].create_notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param notificationId - Notification ID
   * @returns boolean - Success status
   */
  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        "DELETE FROM notifications WHERE id = $1",
        [notificationId],
      );

      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  /**
   * Clean up old notifications
   * @param days - Delete notifications older than N days (default: 30)
   * @returns number - Count of deleted notifications
   */
  async cleanupOldNotifications(days: number = 30): Promise<number> {
    try {
      const result = await this.pool.query(
        "SELECT cleanup_old_notifications($1)",
        [days],
      );

      return result.rows[0].cleanup_old_notifications;
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
      throw error;
    }
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://user:password@localhost:5432/database'
});

const notificationService = new NotificationService(pool);

// Example 1: Get paginated notifications
const notifications = await notificationService.getNotificationsPaginated(1, 1, 10);
console.log(notifications);

// Example 2: Get unread notifications
const unread = await notificationService.getUnreadNotifications(1, 10, 1);
console.log(unread);

// Example 3: Get notifications by type
const warnings = await notificationService.getNotificationsByType(1, 'warning', 1, 10);
console.log(warnings);

// Example 4: Get dashboard notifications
const dashboard = await notificationService.getDashboardNotifications(1);
console.log(dashboard);

// Example 5: Get unread count
const unreadCount = await notificationService.getUnreadCount(1);
console.log(unreadCount);

// Example 6: Get stats
const stats = await notificationService.getNotificationStats(1);
console.log(stats);

// Example 7: Mark as read
const marked = await notificationService.markAsRead(1);
console.log(marked);

// Example 8: Create notification
const notificationId = await notificationService.createNotification(
  1,
  'New Order Received',
  'Order #INV-2024-001 has been placed',
  'success',
  'order',
  12,
  '/orders/12'
);
console.log(notificationId);
*/
