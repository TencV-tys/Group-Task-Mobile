import { API_BASE_URL } from '../config/api';

const API_URL = `${API_BASE_URL}/api/feedback`;

export interface FeedbackData {
  type: string;
  message: string;
  category?: string;
}

export interface Feedback {
  id: string;
  type: string;
  message: string;
  status: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export class FeedbackService {
  
  // Submit feedback
  static async submitFeedback(data: FeedbackData) {
    try {
      if (!data.type || !data.message) {
        return {
          success: false,
          message: "Please fill all required fields"
        };
      }

      const response = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // Get user's feedback history
  static async getMyFeedback(page: number = 1, limit: number = 20) {
    try {
      const response = await fetch(`${API_URL}/my-feedback?page=${page}&limit=${limit}`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error getting feedback:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // Get feedback details
  static async getFeedbackDetails(feedbackId: string) {
    try {
      const response = await fetch(`${API_URL}/${feedbackId}`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error getting feedback details:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // Delete feedback
  static async deleteFeedback(feedbackId: string) {
    try {
      const response = await fetch(`${API_URL}/${feedbackId}`, {
        method: "DELETE",
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // Get feedback stats
  static async getMyFeedbackStats() {
    try {
      const response = await fetch(`${API_URL}/my-stats`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("Error getting feedback stats:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }
} 