// src/taskHook/useCreateTask.ts
import { useState } from 'react';
import { TaskService, type CreateTaskData } from '../taskServices/TaskService';

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
      category?: string;
      frequency?: string;
      executionFrequency?: 'DAILY' | 'WEEKLY';
      scheduledTime?: string;
      timeFormat?: '12h' | '24h';
      selectedDays?: string[];
      dayOfWeek?: string;
      isRecurring?: boolean;
      rotationMemberIds?: string[];
      timeSlots?: Array<{ startTime: string; endTime: string; label?: string }>;
      initialAssigneeId?: string;
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

      // Validate time slots if provided
      if (taskData.timeSlots && taskData.timeSlots.length > 0) {
        for (const slot of taskData.timeSlots) {
          if (!slot.startTime || !slot.endTime) {
            throw new Error('Time slots must have both start and end times');
          }
        }
      }

      // Determine execution frequency
      let executionFrequency: 'DAILY' | 'WEEKLY' = 'WEEKLY'; // Default
      
      if (taskData.executionFrequency) {
        executionFrequency = taskData.executionFrequency;
      } else if (taskData.frequency === 'DAILY') {
        executionFrequency = 'DAILY';
      } else if (taskData.frequency === 'WEEKLY') {
        executionFrequency = 'WEEKLY';
      }
      
      console.log("useCreateTask: Determined execution frequency:", executionFrequency);
      
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
        title: taskData.title,
        description: taskData.description || undefined,
        points: taskData.points || 1,
        executionFrequency,
        timeFormat: taskData.timeFormat || '12h',
        isRecurring: taskData.isRecurring !== false,
        category: taskData.category || undefined,
        scheduledTime: taskData.scheduledTime || undefined,
        rotationMemberIds: taskData.rotationMemberIds || undefined,
        initialAssigneeId: taskData.initialAssigneeId || undefined,
      };
 
      // Only include timeSlots if they exist
      if (taskData.timeSlots && taskData.timeSlots.length > 0) {
        requestData.timeSlots = taskData.timeSlots;
      }

      // Only include day selections for WEEKLY tasks
      if (executionFrequency === 'WEEKLY') {
        if (taskData.selectedDays && taskData.selectedDays.length > 0) {
          requestData.selectedDays = taskData.selectedDays;
        } else if (taskData.dayOfWeek) {
          requestData.dayOfWeek = taskData.dayOfWeek as any;
        }
      }

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