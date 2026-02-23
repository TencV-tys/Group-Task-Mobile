// src/services/HomeService.ts - UPDATED WITH TOKEN AUTH
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // ========== GET AUTH TOKEN ==========
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔐 HomeService: Auth token retrieved:', token ? 'Yes' : 'No');
      return token;
    } catch (error) {
      console.error('HomeService: Error getting auth token:', error);
      return null;
    }
  }

  // ========== GET HEADERS WITH TOKEN ==========
  private async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ HomeService: Added Authorization header');
    } else {
      console.warn('⚠️ HomeService: No auth token available - request may fail');
    }
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // ========== GET HOME DATA ==========
  async getHomeData() {
    try {
      console.log("HomeService: Fetching home data from:", `${API_URL}/`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/`, {
        method: "GET",
        headers,
        // credentials: "include" // Not needed with token
      });

      console.log("HomeService: Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("HomeService: HTTP error:", response.status, errorText);
        throw new Error(`HTTP error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
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

  // ========== GET WEEKLY SUMMARY ==========
  async getWeeklySummary() {
    try {
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/weekly-summary`, {
        method: "GET",
        headers,
        // credentials: "include"
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

  // ========== GET DASHBOARD STATS ==========
  async getDashboardStats() {
    try {
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/dashboard-stats`, {
        method: "GET",
        headers,
        // credentials: "include"
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
    this.pollCallbacks.add(callback);
    
    if (this.lastData) {
      callback(this.lastData);
    }
    
    if (!this.isPolling) {
      this.isPolling = true;
      this.pollData();
      
      this.pollInterval = setInterval(() => {
        this.pollData();
      }, 30000);
      
      console.log("🏠 Home data polling started (30s interval)");
    }
  }

  // Stop polling
  stopPolling(callback: (data: HomeData) => void) {
    this.pollCallbacks.delete(callback);
    
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