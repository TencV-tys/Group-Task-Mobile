// src/hooks/useUpdateTask.ts - UPDATED with TokenUtils
import { useState, useCallback } from 'react';
import { TaskService, type UpdateTaskData } from '../services/TaskService';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

export function useUpdateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authError, setAuthError] = useState(false);

  // ✅ UPDATED: Use TokenUtils.checkToken()
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => {
        setAuthError(true);
        setError('Please log in again');
      }
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  const updateTask = async (
    taskId: string,
    taskData: {
      title?: string;
      description?: string;
      points?: number;
      category?: string;
      executionFrequency?: 'DAILY' | 'WEEKLY';
      scheduledTime?: string;
      timeFormat?: '12h' | '24h';
      selectedDays?: string[];
      dayOfWeek?: string;
      isRecurring?: boolean;
      timeSlots?: Array<{ startTime: string; endTime: string; label?: string }>;
    }
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setAuthError(false);

    try {
      // Check token first - critical for authentication
      const hasToken = await checkToken();
      if (!hasToken) {
        setLoading(false);
        return {
          success: false,
          message: 'Authentication required',
          authError: true
        };
      }

      // Validate
      if (taskData.title && !taskData.title.trim()) {
        throw new Error('Task title cannot be empty');
      }

      if (taskData.points && taskData.points < 1) {
        throw new Error('Points must be at least 1');
      }

      // Validate time slots
      if (taskData.timeSlots && taskData.timeSlots.length > 0) {
        for (const slot of taskData.timeSlots) {
          if (!slot.startTime || !slot.endTime) {
            throw new Error('Time slots must have both start and end times');
          }
        }
      }

      // Get execution frequency
      const executionFrequency = taskData.executionFrequency || 'WEEKLY';
      
      // Validate frequency and requirements
      if (executionFrequency === 'DAILY' && 
          (!taskData.timeSlots || taskData.timeSlots.length === 0)) {
        throw new Error('Daily tasks require time slots');
      }

      if (executionFrequency === 'WEEKLY' && 
          !taskData.selectedDays?.length && 
          !taskData.dayOfWeek) {
        throw new Error('Weekly tasks require at least one day selection');
      }

      const requestData: UpdateTaskData = {
        title: taskData.title,
        description: taskData.description || undefined,
        points: taskData.points || undefined,
        executionFrequency,
        timeFormat: taskData.timeFormat || '12h',
        isRecurring: taskData.isRecurring !== false,
        category: taskData.category || undefined,
        timeSlots: taskData.timeSlots || undefined,
        scheduledTime: taskData.scheduledTime || undefined,
      };

      // Only include day selections for WEEKLY tasks
      if (executionFrequency === 'WEEKLY') {
        if (taskData.selectedDays && taskData.selectedDays.length > 0) {
          requestData.selectedDays = taskData.selectedDays;
        } else if (taskData.dayOfWeek) {
          requestData.dayOfWeek = taskData.dayOfWeek as any;
        }
      }

      console.log("📥 useUpdateTask: Updating task with data:", requestData);

      const result = await TaskService.updateTask(taskId, requestData);
      
      if (result.success) {
        setSuccess(true);
        console.log("✅ useUpdateTask: Task updated successfully");
        return {
          success: true,
          message: result.message || 'Task updated successfully',
          task: result.task
        };
      } else {
        // Check if error is auth-related
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
        throw new Error(result.message || 'Failed to update task');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update task';
      setError(errorMessage);
      console.error("❌ useUpdateTask: Error:", errorMessage);
      return { 
        success: false,
        message: errorMessage,
        authError: errorMessage.toLowerCase().includes('token') || 
                  errorMessage.toLowerCase().includes('auth')
      };
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setAuthError(false);
  };

  return {
    loading,
    error,
    success,
    authError,
    updateTask,
    reset
  };
}