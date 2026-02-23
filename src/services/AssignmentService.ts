// services/AssignmentService.ts - SIMPLE VERSION (LIKE TASKSERVICE)
import { API_BASE_URL } from '../config/api';
import { NotificationService } from './NotificationService';

const API_URL = `${API_BASE_URL}/api/assignments`;

export class AssignmentService {
  
  // ========== COMPLETE ASSIGNMENT ==========
  static async completeAssignment(assignmentId: string, data: any) {
    try {
      if (data.photoUri) {
        const formData = new FormData();
        if (data.notes) formData.append('notes', data.notes);
        
        const filename = data.photoUri.split('/').pop() || 'photo.jpg';
        formData.append('photo', {
          uri: data.photoUri,
          name: filename,
          type: 'image/jpeg',
        } as any);
        
        const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        return await response.json();
      } else {
        const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: data.notes }),
          credentials: 'include'
        });
        return await response.json();
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
  
  // ========== VERIFY ASSIGNMENT ==========
  static async verifyAssignment(assignmentId: string, data: any) {
    try {
      const response = await fetch(`${API_URL}/${assignmentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ========== GET ASSIGNMENT DETAILS ==========
  static async getAssignmentDetails(assignmentId: string) {
    try {
      const response = await fetch(`${API_URL}/${assignmentId}`, {
        method: 'GET',
        credentials: 'include'
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ========== GET USER'S ASSIGNMENTS ==========
  static async getUserAssignments(userId: string, filters?: any) {
    try {
      let url = `${API_URL}/user/${userId}`;
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week?.toString());
      if (filters?.limit) params.append('limit', filters.limit?.toString());
      if (filters?.offset) params.append('offset', filters.offset?.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ========== GET TODAY'S ASSIGNMENTS ==========
  static async getTodayAssignments(groupId?: string) {
    try {
      let url = `${API_URL}/today`;
      if (groupId) url += `?groupId=${groupId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, data: { assignments: [] } };
    }
  }

  // ========== GET GROUP ASSIGNMENTS ==========
  static async getGroupAssignments(groupId: string, filters?: any) {
    try { 
      let url = `${API_URL}/group/${groupId}`;
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week?.toString());
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.limit) params.append('limit', filters.limit?.toString());
      if (filters?.offset) params.append('offset', filters.offset?.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
 
  // ========== GET ASSIGNMENT STATISTICS ==========
  static async getAssignmentStats(groupId: string) {
    try {
      const response = await fetch(`${API_URL}/group/${groupId}/stats`, {
        method: 'GET',
        credentials: 'include'
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ========== CHECK SUBMISSION TIME ==========
  static async checkSubmissionTime(assignmentId: string) {
    try {
      const response = await fetch(`${API_URL}/${assignmentId}/check-time`, {
        method: 'GET',
        credentials: 'include'
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ========== GET UPCOMING ASSIGNMENTS ==========
  static async getUpcomingAssignments(options?: { groupId?: string; limit?: number; }) {
    try {
      let url = `${API_URL}/upcoming`;
      const params = new URLSearchParams();
      if (options?.groupId) params.append('groupId', options.groupId);
      if (options?.limit) params.append('limit', options.limit?.toString() || '10');
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      return await response.json();
    } catch (error: any) {
      return { success: false, data: { assignments: [] } };
    }
  }
}