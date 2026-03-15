// services/GroupActivityService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/group-activity`;

export class GroupActivityService {
  
  // ========== NO NEED FOR getAuthToken and getHeaders anymore - use TokenUtils directly ==========

  // Get group activity summary (Admin only)
  static async getGroupActivitySummary(groupId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
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
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      const response = await fetch(url, { method: 'GET', headers });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getTaskCompletionHistory error:', error);
      return { success: false, message: error.message };
    }
  }

  // Get admin dashboard data
  static async getAdminDashboard(groupId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      const response = await fetch(`${API_URL}/${groupId}/admin-dashboard`, {
        method: 'GET',
        headers,
      });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getAdminDashboard error:', error);
      return { success: false, message: error.message };
    }
  }

  // Get member dashboard data
  static async getMemberDashboard(groupId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      const response = await fetch(`${API_URL}/${groupId}/member-dashboard`, {
        method: 'GET',
        headers,
      });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getMemberDashboard error:', error);
      return { success: false, message: error.message };
    }
  }

  // Get recent activity for dashboard
  static async getRecentActivity(groupId: string, limit: number = 10) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      const url = `${API_URL}/${groupId}/recent-activity?${params}`;
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      const response = await fetch(url, { method: 'GET', headers });
      return await response.json();
    } catch (error: any) {
      console.error('GroupActivityService.getRecentActivity error:', error);
      return { success: false, message: error.message };
    }
  }
}