// src/hooks/useCreateTask.ts
import { useState } from 'react';
import { TaskService } from '../taskServices/TaskService';

export function useCreateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createTask = async (
    groupId: string,
    taskData: {
      title: string;
      description?: string;
      points?: number;
      frequency?: string;
      category?: string;
      timeOfDay?: string;
      dayOfWeek?: string;
      isRecurring?: boolean;
    }
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate
      if (!taskData.title.trim()) {
        throw new Error('Task title is required');
      }

      if (taskData.points && taskData.points < 1) {
        throw new Error('Points must be at least 1');
      }

      // Prepare data with defaults
      const requestData: any = {
        ...taskData,
        frequency: taskData.frequency || 'WEEKLY',
        isRecurring: taskData.isRecurring !== false // Default to true if not specified
      };

      // Convert enum values to uppercase to match backend
      if (requestData.timeOfDay) {
        requestData.timeOfDay = requestData.timeOfDay.toUpperCase();
      }
      if (requestData.dayOfWeek) {
        requestData.dayOfWeek = requestData.dayOfWeek.toUpperCase();
      }

      console.log("Creating task with data:", requestData);

      const result = await TaskService.createTask(groupId, requestData);
      
      console.log("Result from server:", result);
      
      if (result.success) {
        setSuccess(true);
        return {
          success: true,
          message: result.message || 'Task created successfully',
          task: result.task || result.data?.task
        };
      } else {
        throw new Error(result.message || 'Failed to create task');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create task';
      console.error("useCreateTask error:", err);
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  };

  return {
    loading,
    error,
    success,
    createTask,
    reset
  };
}