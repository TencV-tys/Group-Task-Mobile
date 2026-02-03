// src/services/HomeService.ts
const API_URL = "http://10.219.65.2:5000/api/home"; // Adjust your base URL

export class HomeService {
  static async getHomeData() {
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

  static async getWeeklySummary() {
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

  static async getDashboardStats() {
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
}