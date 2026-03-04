// src/services/TaskService.ts - UPDATED WITH SECURESTORE
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

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
  
  // ========== GET AUTH TOKEN FROM SECURESTORE ==========
  private static async getAuthToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      console.log('🔐 TaskService: Auth token retrieved:', token ? 'Yes' : 'No');
      return token;
    } catch (error) {
      console.error('TaskService: Error getting auth token:', error);
      return null;
    }
  }

  // ========== GET HEADERS WITH TOKEN ==========
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ TaskService: Added Authorization header');
    } else {
      console.warn('⚠️ TaskService: No auth token available - request may fail');
    }
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // ========== CREATE TASK ==========
  static async createTask(groupId: string, taskData: CreateTaskData) {
    try {
      // Deep clean the data - remove all undefined values
      const cleanedData = cleanTaskData(taskData);
      
      console.log(`TaskService: Creating task for group ${groupId}`, cleanedData);
      
      const headers = await this.getHeaders();
      
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
      
      const headers = await this.getHeaders(false);
      
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
      
      const headers = await this.getHeaders(false);
      
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
      const headers = await this.getHeaders(false);
      
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
      const headers = await this.getHeaders();
      
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
      
      const headers = await this.getHeaders();
      
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
      const headers = await this.getHeaders(false);
      
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
      const headers = await this.getHeaders();
      
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
      
      const headers = await this.getHeaders();
      
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
      
      const headers = await this.getHeaders(false);
      
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
  // Add this method to your TaskService class
static async getRotationStatus(groupId: string) {
  try {
    const headers = await this.getHeaders(false);
    console.log('📡 Fetching rotation status from:', `${API_URL}/group/${groupId}/rotation-status`);
    
    const response = await fetch(`${API_URL}/group/${groupId}/rotation-status`, {
      method: 'GET',
      headers,
    });
    
    // Log response status
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    // Get the response as text first
    const responseText = await response.text();
    console.log('📦 Raw response:', responseText);
    
    // Try to parse it
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