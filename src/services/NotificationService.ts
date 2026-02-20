// services/NotificationService.ts - FIXED return types
import { API_BASE_URL } from '../config/api';

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
  unreadCount?: number; // Add this for compatibility
  message?: string;
}

export class NotificationService {
  
  // Get user's notifications
  static async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
    try {
      const response = await fetch(`${API_URL}/?page=${page}&limit=${limit}`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
      
      // Log the actual structure to debug
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

  // Get unread count
  static async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await fetch(`${API_URL}/unread-count`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
      
      // Normalize the response to always have 'count' property
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

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_URL}/${notificationId}/read`, {
        method: "PATCH",
        credentials: 'include'
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

  // Mark all as read
  static async markAllAsRead(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_URL}/mark-all-read`, {
        method: "PATCH",
        credentials: 'include'
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

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_URL}/${notificationId}`, {
        method: "DELETE",
        credentials: 'include'
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
  
  // Helper method to check for specific notification types
  static async hasUnreadNotificationsOfType(type: string): Promise<boolean> {
    try {
      const response = await this.getNotifications(1, 20);
      
      // Check different possible response structures
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
}