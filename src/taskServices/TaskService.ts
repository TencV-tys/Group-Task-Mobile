// src/services/TaskService.ts
import {API_BASE_URL} from '../config/api';

const API_URL = `${API_BASE_URL}/api/tasks`;

// Updated to match new backend schema with time slots
export interface CreateTaskData {
  title: string;
  description?: string;
  points?: number;
  category?: string;
  executionFrequency?: 'DAILY' | 'WEEKLY';
  scheduledTime?: string; // Optional for backward compatibility
  timeFormat?: '12h' | '24h';
  selectedDays?: string[]; // For weekly tasks with multiple days
  dayOfWeek?: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  isRecurring?: boolean;
  rotationMemberIds?: string[];
  rotationOrder?: number;
  timeSlots?: Array<{ startTime: string; endTime: string; label?: string }>; // NEW: Multiple time slots
}

export type UpdateTaskData = Partial<CreateTaskData>;

export class TaskService {
  // Create a new task with time slots support
  static async createTask(groupId: string, taskData: CreateTaskData) {
    try {
      console.log(`TaskService: Creating task for group ${groupId}`, taskData);
      
      const response = await fetch(`${API_URL}/group/${groupId}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(taskData),
        credentials: 'include'
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

  // Get tasks for a group (updated to include time slots)
  static async getGroupTasks(groupId: string, week?: number) {
    try {
      const url = week !== undefined 
        ? `${API_URL}/group/${groupId}/tasks?week=${week}`
        : `${API_URL}/group/${groupId}/tasks`;
      
      console.log(`TaskService: Fetching tasks for group ${groupId}`, week ? `week ${week}` : '');
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
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

  // Get tasks assigned to current user in a group
  static async getMyTasks(groupId: string, week?: number) {
    try {
      const url = week !== undefined 
        ? `${API_URL}/group/${groupId}/my-tasks?week=${week}`
        : `${API_URL}/group/${groupId}/my-tasks`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
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

  // Get task details (updated to include time slots)
  static async getTaskDetails(taskId: string) {
    try {
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: 'GET',
        credentials: 'include'
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

  // Delete a task
  static async deleteTask(taskId: string) {
    try {
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
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

  // Update a task (updated for time slots)
  static async updateTask(taskId: string, taskData: UpdateTaskData) {
    try {
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
        credentials: 'include'
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

  // Get rotation schedule
  static async getRotationSchedule(groupId: string, weeks: number = 4) {
    try {
      const response = await fetch(`${API_URL}/group/${groupId}/schedule?weeks=${weeks}`, {
        method: 'GET',
        credentials: 'include'
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
 
  // Rotate tasks
  static async rotateTasks(groupId: string) {
    try {
      const response = await fetch(`${API_URL}/group/${groupId}/rotate`, {
        method: 'POST',
        credentials: 'include'
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
}