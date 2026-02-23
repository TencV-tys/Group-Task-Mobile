// services/HomeService.ts - SIMPLIFIED (NO POLLING)
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
  // Get home data - just one simple function
  async getHomeData() {
    try {
      console.log("HomeService: Fetching home data from:", `${API_URL}/`);
      
      const token = await AsyncStorage.getItem('userToken');
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/`, {
        method: "GET",
        headers,
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
}

export const HomeService = new HomeServiceClass();