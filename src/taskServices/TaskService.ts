// src/services/TaskService.ts
const API_URL = "http://10.219.65.2:5000/api/tasks";

export class TaskService {
  // Create a new task
  static async createTask(groupId: string, taskData: {
    title: string;
    description?: string;
    points?: number;
    frequency?: string;
    category?: string;
  }) {
    try {
      const response = await fetch(`${API_URL}/group/${groupId}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('TaskService.createTask error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create task'
      };
    }
  }

  // Get tasks for a group
  static async getGroupTasks(groupId: string) {
    try {
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

  // Update a task
  static async updateTask(taskId: string, taskData: {
    title?: string;
    description?: string;
    points?: number;
    frequency?: string;
    category?: string;
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
}