// src/hooks/useCreateTask.ts
import { useState } from 'react';
import { TaskService, type CreateTaskData } from '../taskServices/TaskService';

export function useCreateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createTask = async (
    groupId: string,
    taskData: Omit<CreateTaskData, 'executionFrequency'> & {
      frequency?: string; // Accept old 'frequency' for compatibility
      timeSlots?: Array<{ startTime: string; endTime: string; label?: string }>;
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

      // Validate time slots
      if (taskData.timeSlots && taskData.timeSlots.length > 0) {
        for (const slot of taskData.timeSlots) {
          if (!slot.startTime || !slot.endTime) {
            throw new Error('Time slots must have both start and end times');
          }
        }
      }

      // Convert frequency to executionFrequency for new API
      const executionFrequency = (taskData.frequency === 'DAILY' ? 'DAILY' : 'WEEKLY') as 'DAILY' | 'WEEKLY';
      
      // For DAILY tasks, time slots are required
      if (executionFrequency === 'DAILY' && (!taskData.timeSlots || taskData.timeSlots.length === 0)) {
        throw new Error('Daily tasks require time slots');
      }

      // For WEEKLY tasks, days are required
      if (executionFrequency === 'WEEKLY' && 
          !taskData.selectedDays?.length && 
          !taskData.dayOfWeek) {
        throw new Error('Weekly tasks require at least one day selection');
      }

      const requestData: CreateTaskData = {
        ...taskData,
        executionFrequency,
        scheduledTime: taskData.scheduledTime || undefined,
        selectedDays: taskData.selectedDays || undefined,
        dayOfWeek: taskData.dayOfWeek || undefined,
        isRecurring: taskData.isRecurring !== false,
        timeSlots: taskData.timeSlots || undefined
      };

      console.log("useCreateTask: Creating task with data:", requestData);

      const result = await TaskService.createTask(groupId, requestData);
      
      console.log("useCreateTask: Result from server:", result);
      
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