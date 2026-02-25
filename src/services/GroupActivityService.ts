import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

const API_URL = `${API_BASE_URL}/api/group-activity`;

export class GroupActivityService {
  
  private static async getAuthToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      return token;
    } catch (error) {
      console.error('GroupActivityService: Error getting auth token:', error);
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

  // Get group activity summary (Admin only)
  static async getGroupActivitySummary(groupId: string) {
    try {
      const headers = await this.getHeaders(false);
      const response = await fetch(`${API_URL}/${groupId}/summary`, {
        method: 'GET',
        headers,
      });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getGroupActivitySummary error:', error);
      return { success: false, message: error.message };
    }
  }

  // Get completion history (All members)
  static async getCompletionHistory(
    groupId: string, 
    filters?: {
      week?: number;
      memberId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const params = new URLSearchParams();
      if (filters?.week) params.append('week', filters.week.toString());
      if (filters?.memberId) params.append('memberId', filters.memberId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const url = `${API_URL}/${groupId}/completion-history${params.toString() ? `?${params}` : ''}`;
      const headers = await this.getHeaders(false);
      const response = await fetch(url, { method: 'GET', headers });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getCompletionHistory error:', error);
      return { success: false, message: error.message };
    }
  }

  // Get member contribution details
  static async getMemberContributions(groupId: string, memberId: string) {
    try {
      const headers = await this.getHeaders(false);
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/contributions`, {
        method: 'GET',
        headers,
      });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getMemberContributions error:', error);
      return { success: false, message: error.message };
    }
  }

  // Get task completion history
  static async getTaskCompletionHistory(
    groupId: string,
    filters?: {
      taskId?: string;
      week?: number;
    }
  ) {
    try {
      const params = new URLSearchParams();
      if (filters?.taskId) params.append('taskId', filters.taskId);
      if (filters?.week) params.append('week', filters.week.toString());

      const url = `${API_URL}/${groupId}/tasks/completion-history${params.toString() ? `?${params}` : ''}`;
      const headers = await this.getHeaders(false);
      const response = await fetch(url, { method: 'GET', headers });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getTaskCompletionHistory error:', error);
      return { success: false, message: error.message };
    }
  }
}