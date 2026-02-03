// src/hooks/useUpdateTask.ts
import { useState } from 'react';
import { TaskService } from '../taskServices/TaskService';

export function useUpdateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateTask = async (
    taskId: string,
    taskData: {
      title?: string;
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
      if (taskData.title && !taskData.title.trim()) {
        throw new Error('Task title cannot be empty');
      }

      if (taskData.points && taskData.points < 1) {
        throw new Error('Points must be at least 1');
      }

      // Prepare data - convert enum values to uppercase
      const requestData: any = { ...taskData };
      
      if (requestData.timeOfDay) {
        requestData.timeOfDay = requestData.timeOfDay.toUpperCase();
      }
      if (requestData.dayOfWeek) {
        requestData.dayOfWeek = requestData.dayOfWeek.toUpperCase();
      }

      console.log("Updating task with data:", requestData);

      const result = await TaskService.updateTask(taskId, requestData);
      
      if (result.success) {
        setSuccess(true);
        return {
          success: true,
          message: result.message || 'Task updated successfully',
          task: result.task
        };
      } else {
        throw new Error(result.message || 'Failed to update task');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update task';
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
    updateTask,
    reset
  };
}