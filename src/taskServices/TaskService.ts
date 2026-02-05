// src/services/TaskService.ts
import {API_BASE_URL} from '../config/api';

const API_URL = `${API_BASE_URL}/api/tasks`;


export class TaskService {
  // Create a new task with rotation support
  static async createTask(groupId: string, taskData: {
    title: string;
    description?: string;
    points?: number;
    frequency?: string;
    category?: string;
    timeOfDay?: string; // Will be enum value like 'MORNING'
    dayOfWeek?: string; // Will be enum value like 'MONDAY'
    isRecurring?: boolean;
  }) {
    try {
      console.log(`TaskService: Creating task for group ${groupId}`, taskData);
      
      // IMPORTANT: Changed endpoint to match your backend router
      const response = await fetch(`${API_URL}/group/${groupId}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(taskData),
        credentials: 'include' // Important for cookies/sessions
      });

      console.log(`TaskService: Response status: ${response.status}`);
      
      // Try to get response text first for debugging
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

  // Get tasks for a group
  static async getGroupTasks(groupId: string) {
    try {
      console.log(`TaskService: Fetching tasks for group ${groupId}`);
      
      const response = await fetch(`${API_URL}/group/${groupId}/tasks`, {
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
  static async getMyTasks(groupId: string) {
    try {
      const response = await fetch(`${API_URL}/group/${groupId}/my-tasks`, {
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

  // Get task details
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
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
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

  // Update a task
  static async updateTask(taskId: string, taskData: {
    title?: string;
    description?: string;
    points?: number;
    frequency?: string;
    category?: string;
    timeOfDay?: string;
    dayOfWeek?: string;
    isRecurring?: boolean;
  }) {
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

  // Get task assignments
  static async getTaskAssignments(taskId: string) {
    try {
      const response = await fetch(`${API_URL}/${taskId}/assignments`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.getTaskAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load task assignments'
      };
    }
  }
}