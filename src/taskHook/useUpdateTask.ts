// src/hooks/useUpdateTask.ts
import { useState } from 'react';
import { TaskService, type UpdateTaskData } from '../taskServices/TaskService';

export function useUpdateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateTask = async (
    taskId: string,
    taskData: UpdateTaskData
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

      // Validate time slots
      if (taskData.timeSlots && taskData.timeSlots.length > 0) {
        for (const slot of taskData.timeSlots) {
          if (!slot.startTime || !slot.endTime) {
            throw new Error('Time slots must have both start and end times');
          }
        }
      }

      // Validate frequency and requirements
      if (taskData.executionFrequency === 'DAILY' && 
          (!taskData.timeSlots || taskData.timeSlots.length === 0)) {
        throw new Error('Daily tasks require time slots');
      }

      if (taskData.executionFrequency === 'WEEKLY' && 
          !taskData.selectedDays?.length && 
          !taskData.dayOfWeek) {
        throw new Error('Weekly tasks require at least one day selection');
      }

      console.log("Updating task with data:", taskData);

      const result = await TaskService.updateTask(taskId, taskData);
      
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