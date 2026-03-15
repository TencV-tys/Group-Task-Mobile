// src/services/TaskService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/tasks`;

// Better helper function to clean undefined and null values
function cleanTaskData(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  } 
  
  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanTaskData(item))
      .filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanTaskData(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
   
  return obj;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  points?: number;
  category?: string;
  executionFrequency?: 'DAILY' | 'WEEKLY';
  scheduledTime?: string;
  timeFormat?: '12h' | '24h';
  selectedDays?: string[];
  dayOfWeek?: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  isRecurring?: boolean;
  rotationMemberIds?: string[];
  rotationOrder?: number;
  timeSlots?: Array<{ startTime: string; endTime: string; label?: string }>;
  initialAssigneeId?: string;
}

export type UpdateTaskData = Partial<CreateTaskData>;

export class TaskService {
  
  // ========== NO NEED FOR getAuthToken and getHeaders anymore - use TokenUtils directly ==========

  // ========== CREATE TASK ==========
  static async createTask(groupId: string, taskData: CreateTaskData) {
    try {
      // Deep clean the data - remove all undefined values
      const cleanedData = cleanTaskData(taskData);
      
      console.log(`TaskService: Creating task for group ${groupId}`, cleanedData);
      
      // ✅ Use TokenUtils.getAuthHeaders() instead of custom method
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/group/${groupId}/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cleanedData),
      });

      console.log(`TaskService: Response status: ${response.status}`);
      
      const responseText = await response.text();
      console.log(`TaskService: Response text:`, responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('TaskService: Failed to parse JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
       
      console.log(`TaskService: Parsed result:`, result);
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error: ${response.status}`);
      }

      return result;

    } catch (error: any) {
      console.error('TaskService.createTask error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create task. Please check your connection.'
      };
    }
  }

  // ========== GET GROUP TASKS ==========
  static async getGroupTasks(groupId: string, week?: number) {
    try {
      const url = week !== undefined 
        ? `${API_URL}/group/${groupId}/tasks?week=${week}`
        : `${API_URL}/group/${groupId}/tasks`;
      
      console.log(`TaskService: Fetching tasks for group ${groupId}`, week ? `week ${week}` : '');
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.getGroupTasks error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load tasks'
      };
    }
  }

  // ========== GET MY TASKS ==========
  static async getMyTasks(groupId: string, week?: number) {
    try {
      const url = week !== undefined 
        ? `${API_URL}/group/${groupId}/my-tasks?week=${week}`
        : `${API_URL}/group/${groupId}/my-tasks`;
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
 
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.getMyTasks error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load your tasks'
      };
    }
  }

  // ========== GET TASK DETAILS ==========
  static async getTaskDetails(taskId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.getTaskDetails error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load task details'
      };
    }
  }

  // ========== DELETE TASK ==========
  static async deleteTask(taskId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.deleteTask error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete task'
      };
    }
  }

  // ========== UPDATE TASK ==========
  static async updateTask(taskId: string, taskData: UpdateTaskData) {
    try {
      // Clean the data for updates too
      const cleanedData = cleanTaskData(taskData);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.updateTask error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update task'
      };
    }
  }

  // ========== GET ROTATION SCHEDULE ==========
  static async getRotationSchedule(groupId: string, weeks: number = 4) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/group/${groupId}/schedule?weeks=${weeks}`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.getRotationSchedule error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load rotation schedule'
      };
    }
  }
 
  // ========== ROTATE TASKS ==========
  static async rotateTasks(groupId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/group/${groupId}/rotate`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.rotateTasks error:', error);
      return {
        success: false,
        message: error.message || 'Failed to rotate tasks'
      };
    }
  }
 
  // ========== REASSIGN TASK ==========
  static async reassignTask(taskId: string, targetUserId: string) {
    try {
      console.log(`TaskService: Reassigning task ${taskId} to user ${targetUserId}`);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${taskId}/reassign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetUserId }),
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.reassignTask error:', error);
      return {
        success: false,
        message: error.message || 'Failed to reassign task'
      };
    }
  }
 
  // ========== GET TASK STATISTICS ==========
  static async getTaskStatistics(groupId: string) {
    try {
      console.log(`TaskService: Getting statistics for group ${groupId}`);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/group/${groupId}/statistics`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.getTaskStatistics error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load task statistics'
      };
    }
  }
  
  // ========== GET ROTATION STATUS ==========
  static async getRotationStatus(groupId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      console.log('📡 Fetching rotation status from:', `${API_URL}/group/${groupId}/rotation-status`);
      
      const response = await fetch(`${API_URL}/group/${groupId}/rotation-status`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 Response status:', response.status);
      
      const responseText = await response.text();
      console.log('📦 Raw response:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Parsed data:', data);
        return data;
      } catch (parseError) {
        console.error('❌ Failed to parse JSON. Raw response:', responseText);
        return {
          success: false,
          message: 'Invalid response from server'
        };
      }
      
    } catch (error: any) {
      console.error('TaskService.getRotationStatus error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get rotation status'
      };
    }
  }
}