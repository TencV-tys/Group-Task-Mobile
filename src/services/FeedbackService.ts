// services/FeedbackService.ts - UPDATED WITH TOKEN AUTH
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface FeedbackStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byType: Record<string, number>;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
  feedback?: Feedback[];        // For list responses
  feedbackItem?: Feedback;       // For single item responses (renamed from duplicate)
  stats?: FeedbackStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class FeedbackServiceClass {
  private pollInterval: ReturnType<typeof setTimeout> | null = null;
  private pollCallbacks: Set<(stats: FeedbackStats) => void> = new Set();
  private lastStats: FeedbackStats | null = null;
  private isPolling = false;

  // ========== GET AUTH TOKEN ==========
  private static async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔐 Auth token retrieved:', token ? 'Yes' : 'No');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // ========== GET HEADERS WITH TOKEN ==========
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Added Authorization header');
    } else {
      console.warn('⚠️ No auth token available - request may fail');
    }
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // ========== SUBMIT FEEDBACK ==========
  async submitFeedback(data: FeedbackData): Promise<FeedbackResponse> {
    try {
      if (!data.type || !data.message) {
        return {
          success: false,
          message: "Please fill all required fields"
        };
      }

      const headers = await FeedbackServiceClass.getHeaders();
      
      const response = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        // credentials: 'include' // Not needed with token
      });

      const result = await response.json();
      
      if (result.success) {
        this.pollStats();
      }
      
      return result;

    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ========== UPDATE FEEDBACK ==========
  async updateFeedback(feedbackId: string, data: Partial<FeedbackData>): Promise<FeedbackResponse> {
    try {
      const headers = await FeedbackServiceClass.getHeaders();
      
      const response = await fetch(`${API_URL}/${feedbackId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
        // credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        this.pollStats();
      }
      
      return result;

    } catch (error: any) {
      console.error("Error updating feedback:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ========== GET MY FEEDBACK ==========
  async getMyFeedback(page: number = 1, limit: number = 20): Promise<FeedbackResponse> {
    try {
      const headers = await FeedbackServiceClass.getHeaders(false);
      
      const response = await fetch(`${API_URL}/my-feedback?page=${page}&limit=${limit}`, {
        method: "GET",
        headers,
        // credentials: 'include'
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

  // ========== GET FEEDBACK DETAILS ==========
  async getFeedbackDetails(feedbackId: string): Promise<FeedbackResponse> {
    try {
      const headers = await FeedbackServiceClass.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${feedbackId}`, {
        method: "GET",
        headers,
        // credentials: 'include'
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

  // ========== DELETE FEEDBACK ==========
  async deleteFeedback(feedbackId: string): Promise<FeedbackResponse> {
    try {
      const headers = await FeedbackServiceClass.getHeaders();
      
      const response = await fetch(`${API_URL}/${feedbackId}`, {
        method: "DELETE",
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        this.pollStats();
      }
      
      return result;

    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ========== GET MY FEEDBACK STATS ==========
  async getMyFeedbackStats(): Promise<FeedbackResponse> {
    try {
      const headers = await FeedbackServiceClass.getHeaders(false);
      
      const response = await fetch(`${API_URL}/my-stats`, {
        method: "GET",
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        this.lastStats = result.stats;
      }
      
      return result;

    } catch (error: any) {
      console.error("Error getting feedback stats:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ========== GET FEEDBACK BY STATUS ==========
  async getFeedbackByStatus(status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', page: number = 1, limit: number = 20): Promise<FeedbackResponse> {
    try {
      // First get all feedback
      const result = await this.getMyFeedback(page, 100);
      
      if (result.success && result.feedback) {
        const filtered = result.feedback.filter((f: Feedback) => f.status === status);
        
        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);
        
        return {
          success: true,
          feedback: paginated,
          pagination: {
            page,
            limit,
            total: filtered.length,
            pages: Math.ceil(filtered.length / limit)
          }
        };
      }
      
      return result;
    } catch (error: any) {
      console.error("Error getting feedback by status:", error);
      return {
        success: false,
        message: "Cannot connect to the server"
      };
    }
  }

  // ============= POLLING METHODS =============

  // Start polling for stats updates (every 30 seconds)
  startPolling(callback: (stats: FeedbackStats) => void) {
    this.pollCallbacks.add(callback);
    
    if (this.lastStats) {
      callback(this.lastStats);
    }
    
    if (!this.isPolling) {
      this.isPolling = true;
      this.pollStats();
      
      this.pollInterval = setInterval(() => {
        this.pollStats();
      }, 30000);
      
      console.log("📊 Feedback stats polling started (30s interval)");
    }
  }

  // Stop polling
  stopPolling(callback: (stats: FeedbackStats) => void) {
    this.pollCallbacks.delete(callback);
    
    if (this.pollCallbacks.size === 0 && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
      console.log("📊 Feedback stats polling stopped");
    }
  }

  // Manual poll for stats
  async pollStats() {
    try {
      const result = await this.getMyFeedbackStats();
      if (result.success && result.stats) {
        this.lastStats = result.stats;
        this.pollCallbacks.forEach(callback => {
          callback(result.stats!);
        });
      }
    } catch (error) {
      console.error("Error polling feedback stats:", error);
    }
  }
}

// Export a single instance
export const FeedbackService = new FeedbackServiceClass();