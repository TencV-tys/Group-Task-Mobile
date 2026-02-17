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
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackStats {
  total: number;
  open: number;
  resolved: number;
  byType: Record<string, number>;
}

class FeedbackServiceClass {
  // FIXED: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  private pollInterval: ReturnType<typeof setTimeout> | null = null;
  private pollCallbacks: Set<(stats: FeedbackStats) => void> = new Set();
  private lastStats: FeedbackStats | null = null;
  private isPolling = false;

  // Submit feedback
  async submitFeedback(data: FeedbackData) {
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
      
      // Trigger poll after submission to update stats
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

  // Update feedback
  async updateFeedback(feedbackId: string, data: Partial<FeedbackData>) {
    try {
      const response = await fetch(`${API_URL}/${feedbackId}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      
      // Trigger poll after update
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

  // Get user's feedback history
  async getMyFeedback(page: number = 1, limit: number = 20) {
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
  async getFeedbackDetails(feedbackId: string) {
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
  async deleteFeedback(feedbackId: string) {
    try {
      const response = await fetch(`${API_URL}/${feedbackId}`, {
        method: "DELETE",
        credentials: 'include'
      });

      const result = await response.json();
      
      // Trigger poll after deletion
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

  // Get feedback stats
  async getMyFeedbackStats() {
    try {
      const response = await fetch(`${API_URL}/my-stats`, {
        method: "GET",
        credentials: 'include'
      });

      const result = await response.json();
      
      // Cache the stats
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

  // ============= POLLING METHODS =============

  // Start polling for stats updates (every 30 seconds)
  startPolling(callback: (stats: FeedbackStats) => void) {
    // Add callback to set
    this.pollCallbacks.add(callback);
    
    // If we have cached stats, send immediately
    if (this.lastStats) {
      callback(this.lastStats);
    }
    
    // Start polling if not already started
    if (!this.isPolling) {
      this.isPolling = true;
      this.pollStats(); // Immediate first poll
      
      this.pollInterval = setInterval(() => {
        this.pollStats();
      }, 30000); // 30 seconds
      
      console.log("📊 Feedback stats polling started (30s interval)");
    }
  }

  // Stop polling
  stopPolling(callback: (stats: FeedbackStats) => void) {
    // Remove callback
    this.pollCallbacks.delete(callback);
    
    // If no more callbacks, stop polling
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
        // Notify all callbacks
        this.pollCallbacks.forEach(callback => {
          callback(result.stats);
        });
      }
    } catch (error) {
      console.error("Error polling feedback stats:", error);
    }
  }

  // Get feedback by status (for filtering)
  async getFeedbackByStatus(status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', page: number = 1, limit: number = 20) {
    try {
      // First get all feedback
      const result = await this.getMyFeedback(page, 100); // Get more items for filtering
      
      if (result.success && result.feedback) {
        // Filter by status
        const filtered = result.feedback.filter((f: Feedback) => f.status === status);
        
        // Manual pagination
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
}

// Export a single instance
export const FeedbackService = new FeedbackServiceClass();