// services/NotificationService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/notifications`;

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Notification type constants for better type safety
export const NotificationTypes = {
  // Submission related
  SUBMISSION_PENDING: 'SUBMISSION_PENDING',
  SUBMISSION_VERIFIED: 'SUBMISSION_VERIFIED',
  SUBMISSION_REJECTED: 'SUBMISSION_REJECTED',
  SUBMISSION_DECISION: 'SUBMISSION_DECISION',
  
  // Penalty related
  POINT_DEDUCTION: 'POINT_DEDUCTION',
  LATE_SUBMISSION: 'LATE_SUBMISSION',
  NEGLECT_DETECTED: 'NEGLECT_DETECTED',
  
  // Reminder related
  TASK_REMINDER: 'TASK_REMINDER',
  TASK_ACTIVE: 'TASK_ACTIVE',
  
  // Swap related
  SWAP_REQUEST: 'SWAP_REQUEST',
  SWAP_ACCEPTED: 'SWAP_ACCEPTED',
  SWAP_REJECTED: 'SWAP_REJECTED',
  SWAP_CANCELLED: 'SWAP_CANCELLED',
  SWAP_COMPLETED: 'SWAP_COMPLETED',
  SWAP_ADMIN_NOTIFICATION: 'SWAP_ADMIN_NOTIFICATION',
  SWAP_EXPIRED: 'SWAP_EXPIRED',
  
  // Task related
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_OVERDUE: 'TASK_OVERDUE',
  TASK_CREATED: 'TASK_CREATED',
  
  // Group related
  GROUP_INVITE: 'GROUP_INVITE',
  GROUP_JOINED: 'GROUP_JOINED',
  GROUP_CREATED: 'GROUP_CREATED',
  NEW_MEMBER: 'NEW_MEMBER',
  
  // Feedback related
  FEEDBACK_SUBMITTED: 'FEEDBACK_SUBMITTED',
  FEEDBACK_STATUS_UPDATE: 'FEEDBACK_STATUS_UPDATE',
  
  // Points
  POINTS_EARNED: 'POINTS_EARNED',
  
  // Other
  MENTION: 'MENTION',
  REMINDER: 'REMINDER',
  DAILY_TASK_REMINDER: 'DAILY_TASK_REMINDER',
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

export interface NotificationsResponse {
  success: boolean;
  message?: string;
  notifications?: Notification[];
  data?: {
    notifications?: Notification[];
    count?: number;
    unreadCount?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  count?: number;
  unreadCount?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
  unreadCount?: number;
  message?: string;
}

export class NotificationService {
  
  // ========== NO NEED FOR getAuthToken and getHeaders anymore - use TokenUtils directly ==========

  // ========== GET NOTIFICATIONS ==========
  static async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(`${API_URL}/?page=${page}&limit=${limit}`, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      console.log('Notifications response structure:', Object.keys(result));
      
      return result;

    } catch (error: any) {
      console.error("Error getting notifications:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ========== GET UNREAD COUNT ==========
  static async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(`${API_URL}/unread-count`, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      
      return {
        success: result.success,
        count: result.count || result.unreadCount || 0,
        unreadCount: result.unreadCount || result.count || 0,
        message: result.message
      };

    } catch (error: any) {
      console.error("Error getting unread count:", error);
      return {
        success: false,
        count: 0,
        unreadCount: 0
      };
    }
  }

  // ========== MARK NOTIFICATION AS READ ==========
  static async markAsRead(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${notificationId}/read`, {
        method: "PATCH",
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error marking as read:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ========== MARK ALL AS READ ==========
  static async markAllAsRead(): Promise<{ success: boolean; message?: string }> {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/mark-all-read`, {
        method: "PATCH",
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error marking all as read:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ========== DELETE NOTIFICATION ==========
  static async deleteNotification(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${notificationId}`, {
        method: "DELETE",
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error deleting notification:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }
  
  // ========== CHECK FOR SPECIFIC NOTIFICATION TYPES ==========
  static async hasUnreadNotificationsOfType(type: string): Promise<boolean> {
    try {
      const response = await this.getNotifications(1, 20);
      
      const notifications = response.notifications || response.data?.notifications || [];
      
      if (Array.isArray(notifications)) {
        return notifications.some(n => n.type === type && !n.read);
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking for ${type} notifications:`, error);
      return false;
    }
  }

  // ========== CHECK FOR PENALTY NOTIFICATIONS ==========
  static async hasPenaltyNotifications(): Promise<boolean> {
    try {
      const response = await this.getNotifications(1, 20);
      const notifications = response.notifications || response.data?.notifications || [];
      
      if (Array.isArray(notifications)) {
        return notifications.some(n => 
          (n.type === 'POINT_DEDUCTION' || n.type === 'LATE_SUBMISSION' || n.type === 'NEGLECT_DETECTED') 
          && !n.read
        );
      }
      
      return false;
    } catch (error) {
      console.error('Error checking penalty notifications:', error);
      return false;
    }
  }
}