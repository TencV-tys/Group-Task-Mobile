// services/HomeService.ts - UPDATED WITH SECURESTORE (NO POLLING)
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

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
      
      // Get token from SecureStore
      const token = await SecureStore.getItemAsync('userToken');
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Added Authorization header');
      } else {
        console.warn('⚠️ No auth token available - request may fail');
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