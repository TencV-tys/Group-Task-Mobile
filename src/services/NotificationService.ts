import { API_BASE_URL } from '../config/api';

const API_URL = `${API_BASE_URL}/api/notifications`;

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  
  // Get user's notifications
  static async getNotifications(page: number = 1, limit: number = 20) {
    try {
      const response = await fetch(`${API_URL}/?page=${page}&limit=${limit}`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
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
  static async getUnreadCount() {
    try {
      const response = await fetch(`${API_URL}/unread-count`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error getting unread count:", error);
      return {
        success: false,
        count: 0
      };
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
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
  static async markAllAsRead() {
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
  static async deleteNotification(notificationId: string) {
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
}