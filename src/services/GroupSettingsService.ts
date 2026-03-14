// services/GroupSettingsService.ts
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

const API_URL = `${API_BASE_URL}/api/group`;

export class GroupSettingsService {
  
  private static async getAuthToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // Get group with member limits
  static async getGroupWithLimits(groupId: string) {
    try {
      const headers = await this.getHeaders(false);
      const response = await fetch(`${API_URL}/${groupId}/with-limits`, {
        method: 'GET',
        headers
      });
      return await response.json();
    } catch (error: any) {
      console.error('Error getting group with limits:', error);
      return { success: false, message: error.message };
    }
  }

  // Update max members (admin only)
  static async updateMaxMembers(groupId: string, maxMembers: number) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/${groupId}/update-max-members`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ maxMembers })
      });
      return await response.json();
    } catch (error: any) {
      console.error('Error updating max members:', error);
      return { success: false, message: error.message };
    }
  }
}