// src/services/HomeService.ts
const API_URL = "http://10.219.65.2:5000/api/home"; // Adjust your base URL

export class HomeService {
  static async getHomeData() {
    try {
      const response = await fetch(`${API_URL}/user-data`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
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

  static async getUserStats() {
    try {
      const response = await fetch(`${API_URL}/home/stats`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error("HomeService: Error fetching stats:", error);
      return {
        success: false,
        message: error.message || "Failed to load statistics",
        error: error.message
      };
    }
  }
}