import { useState, useCallback } from 'react';
import { TaskService } from '../services/TaskService';

export interface RotationAnalysis {
  totalMembers: number;
  activeMembers: number;
  totalTasks: number;
  recurringTasks: number;
  tasksPerMember: number; 
  hasEnoughTasks: boolean;
  tasksNeeded: number;
  warning: string | null;
}

export function useRotationStatus(groupId: string) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RotationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
  if (!groupId) return;
  
  setLoading(true); 
  setError(null);
  
  try {
    console.log('📡 Fetching rotation status for:', groupId);
    const result = await TaskService.getRotationStatus(groupId);
    console.log('📦 Rotation status result:', result);
    
    if (result.success) {
      setStatus(result.data);
    } else {
      setError(result.message || 'Failed to check rotation status');
    }
  } catch (err: any) {
    console.error('❌ Error in checkStatus:', err);
    setError(err.message || 'Error checking rotation status');
  } finally {
    setLoading(false);
  } 
}, [groupId]);

  const getTaskRecommendation = useCallback(() => {
    if (!status) return null;
    
    if (status.totalTasks === 0) {
      return {
        message: 'No recurring tasks yet. Create tasks to start rotation.',
        canCreate: true,
        type: 'info'
      };
    }
    
    if (status.totalTasks < status.totalMembers) {
      return {
        message: `Need ${status.tasksNeeded} more task(s) for ${status.totalMembers} members. Currently ${status.totalTasks}/${status.totalMembers} tasks.`,
        canCreate: true,
        type: 'warning',
        tasksNeeded: status.tasksNeeded
      };
    }
    
    if (status.totalTasks === status.totalMembers) {
      return {
        message: `Perfect! ${status.totalTasks} tasks for ${status.totalMembers} members - 1 task each.`,
        canCreate: true,
        type: 'success'
      };
    }
    
    return {
      message: `${status.totalTasks} tasks for ${status.totalMembers} members - some members will get multiple tasks.`,
      canCreate: true,
      type: 'info'
    };
  }, [status]);

  return {
    loading,
    error,
    status,
    checkStatus,
    getTaskRecommendation
  };
}