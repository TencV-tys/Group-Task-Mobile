// src/services/AssignmentService.ts - COMPLETE VERSION
import { API_BASE_URL } from '../config/api';

const API_URL = `${API_BASE_URL}/api/assignments`;

export interface Assignment {
  id: string;
  taskId: string;
  userId: string;
  dueDate: string;
  points: number;
  completed: boolean;
  completedAt?: string;
  verified: boolean | null;
  photoUrl?: string;
  notes?: string;
  adminNotes?: string;
  timeSlotId?: string;
  rotationWeek: number;
  weekStart: string;
  weekEnd: string;
  assignmentDay?: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  task?: {
    id: string;
    title: string;
    points: number;
    executionFrequency: string;
    group?: {
      id: string;
      name: string;
    };
  };
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
    points?: number;
  };
}

export interface AssignmentDetails {
  id: string;
  taskId: string;
  userId: string;
  dueDate: string;
  points: number;
  completed: boolean;
  completedAt?: string;
  verified: boolean | null;
  photoUrl?: string;
  notes?: string;
  adminNotes?: string;
  timeSlotId?: string;
  rotationWeek: number;
  weekStart: string;
  weekEnd: string;
  assignmentDay?: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  task: {
    id: string;
    title: string;
    points: number;
    executionFrequency: string;
    group: {
      id: string;
      name: string;
      description?: string;
    };
    creator?: {
      id: string;
      fullName: string;
      avatarUrl?: string;
    };
  };
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
    points?: number;
  };
}

export class AssignmentService {
  
  static async completeAssignment(assignmentId: string, data: {
    photoUrl?: string;
    notes?: string;
  }) {
    try {
      console.log('AssignmentService: Completing assignment', assignmentId, data);
      
      const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      console.log('AssignmentService: Complete response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.completeAssignment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to complete assignment'
      };
    }
  }

  static async verifyAssignment(assignmentId: string, data: {
    verified: boolean;
    adminNotes?: string;
  }) {
    try {
      console.log('AssignmentService: Verifying assignment', assignmentId, data);
      
      const response = await fetch(`${API_URL}/${assignmentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      console.log('AssignmentService: Verify response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.verifyAssignment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify assignment'
      };
    }
  }

  static async getAssignmentDetails(assignmentId: string) {
    try {
      console.log('AssignmentService: Getting assignment details', assignmentId);
      
      const response = await fetch(`${API_URL}/${assignmentId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      console.log('AssignmentService: Details response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentDetails error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load assignment details'
      };
    }
  }

  static async getUserAssignments(userId: string, filters?: {
    status?: string;
    week?: number;
    limit?: number;
    offset?: number;
  }) {
    try {
      let url = `${API_URL}/user/${userId}/assignments`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      console.log('AssignmentService: Getting user assignments', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getUserAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load user assignments'
      };
    }
  }

  static async getGroupAssignments(groupId: string, filters?: {
    status?: string;
    week?: number;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      let url = `${API_URL}/group/${groupId}/assignments`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week.toString());
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      console.log('AssignmentService: Getting group assignments', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getGroupAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group assignments'
      };
    }
  }

  static async getAssignmentStats(groupId: string) {
    try {
      const url = `${API_URL}/group/${groupId}/stats`;
      console.log('AssignmentService: Getting assignment stats', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentStats error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load assignment stats'
      };
    }
  }
}