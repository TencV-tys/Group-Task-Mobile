import { API_BASE_URL } from '../config/api';

const API_URL = `${API_BASE_URL}/api/home`;

export interface HomeData {
  user: any;
  stats: any;
  currentWeekTasks: any[];
  upcomingTasks: any[];
  groups: any[];
  leaderboard: any[];
  recentActivity: any[];
  rotationInfo: any;
}

class HomeServiceClass {
  private pollInterval: ReturnType<typeof setTimeout> | null = null;
  private pollCallbacks: Set<(data: HomeData) => void> = new Set();
  private lastData: HomeData | null = null;
  private isPolling = false;

  // Get home data
  async getHomeData() {
    try {
      console.log("HomeService: Fetching home data from:", `${API_URL}/`);
      const response = await fetch(`${API_URL}/`, {
        method: "GET",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: "include"
      });

      console.log("HomeService: Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("HomeService: HTTP error:", response.status, errorText);
        throw new Error(`HTTP error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Cache the data
      if (result.success && result.data) {
        this.lastData = result.data;
      }
      
      console.log("HomeService: Success - Result:", result);
      return result;

    } catch (error: any) {
      console.error("HomeService: Error fetching home data:", error);
      return {
        success: false,
        message: error.message || "Failed to load home data",
        error: error.message
      };
    }
  }

  async getWeeklySummary() {
    try {
      const response = await fetch(`${API_URL}/weekly-summary`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error("HomeService: Error fetching weekly summary:", error);
      return {
        success: false,
        message: error.message || "Failed to load weekly summary",
        error: error.message
      };
    }
  }

  async getDashboardStats() {
    try {
      const response = await fetch(`${API_URL}/dashboard-stats`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error("HomeService: Error fetching dashboard stats:", error);
      return {
        success: false,
        message: error.message || "Failed to load dashboard stats",
        error: error.message
      };
    }
  }

  // ============= POLLING METHODS =============

  // Start polling for home data updates (every 30 seconds)
  startPolling(callback: (data: HomeData) => void) {
    // Add callback to set
    this.pollCallbacks.add(callback);
    
    // If we have cached data, send immediately
    if (this.lastData) {
      callback(this.lastData);
    }
    
    // Start polling if not already started
    if (!this.isPolling) {
      this.isPolling = true;
      this.pollData(); // Immediate first poll
      
      this.pollInterval = setInterval(() => {
        this.pollData();
      }, 30000); // 30 seconds
      
      console.log("🏠 Home data polling started (30s interval)");
    }
  }

  // Stop polling
  stopPolling(callback: (data: HomeData) => void) {
    // Remove callback
    this.pollCallbacks.delete(callback);
    
    // If no more callbacks, stop polling
    if (this.pollCallbacks.size === 0 && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
      console.log("🏠 Home data polling stopped");
    }
  }

  // Manual poll for data
  async pollData() {
    try {
      const result = await this.getHomeData();
      if (result.success && result.data) {
        this.lastData = result.data;
        // Notify all callbacks
        this.pollCallbacks.forEach(callback => {
          callback(result.data);
        });
      }
    } catch (error) {
      console.error("Error polling home data:", error);
    }
  }

  // Force refresh data (for pull-to-refresh)
  async refreshData() {
    return this.pollData();
  }
}

// Export a single instance
export const HomeService = new HomeServiceClass();