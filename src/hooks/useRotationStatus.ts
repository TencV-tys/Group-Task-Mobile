// src/hooks/useRotationStatus.ts
import { useState, useCallback } from 'react';
import { TaskService } from '../services/TaskService';
import { TokenUtils } from '../utils/tokenUtils';

export interface RotationAnalysis {
  totalMembers: number;
  activeMembers: number;
  membersInRotation: number;
  admins: number;
  totalTasks: number;
  recurringTasks: number;
  tasksPerMember: number;
  hasEnoughTasks: boolean;
  tasksNeeded: number;
  members: Array<{
    id: string;
    name: string;
    assignedTasks: number;
    willGetTasksThisWeek: boolean;
    inRotation: boolean;
    role: string;
  }>;
  warning: string | null;
  currentWeek: number;        // ✅ ADD THIS
  expectedWeek: number;        // ✅ ADD THIS
  needsRotation: boolean;      // ✅ ADD THIS
  weeksBehind: number;         // ✅ ADD THIS
  groupCreatedAt: Date;
  earliestTaskCreatedAt: Date | null;
}

export function useRotationStatus(groupId: string) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RotationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!groupId) return;
    
    setLoading(true); 
    setError(null);
    setAuthError(false);
    
    try {
      console.log('📡 Fetching rotation status for:', groupId);
      
      const hasToken = await TokenUtils.checkToken({
        showAlert: false,
        onAuthError: () => setAuthError(true)
      });
      
      if (!hasToken) {
        setLoading(false);
        setError('Authentication required. Please log in again.');
        return;
      }
      
      const result = await TaskService.getRotationStatus(groupId);
      console.log('📦 Rotation status result:', result);
      
      if (result.success && result.data) {
        setStatus({
          totalMembers: result.data.totalMembers || 0,
          activeMembers: result.data.activeMembers || 0,
          membersInRotation: result.data.membersInRotation || 0,
          admins: result.data.admins || 0,
          totalTasks: result.data.totalTasks || 0,
          recurringTasks: result.data.recurringTasks || 0,
          tasksPerMember: result.data.tasksPerMember || 0,
          hasEnoughTasks: result.data.hasEnoughTasks || false,
          tasksNeeded: result.data.tasksNeeded || 0,
          members: result.data.members || [],
          warning: result.data.warning || null,
          currentWeek: result.data.currentWeek || 1,        // ✅ ADD THIS
          expectedWeek: result.data.expectedWeek || 1,      // ✅ ADD THIS
          needsRotation: result.data.needsRotation || false, // ✅ ADD THIS
          weeksBehind: result.data.weeksBehind || 0,        // ✅ ADD THIS
          groupCreatedAt: result.data.groupCreatedAt ? new Date(result.data.groupCreatedAt) : new Date(),
          earliestTaskCreatedAt: result.data.earliestTaskCreatedAt ? new Date(result.data.earliestTaskCreatedAt) : null
        });
      } else {
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
        setError(result.message || 'Failed to check rotation status');
      }
    } catch (err: any) {
      console.error('❌ Error in checkStatus:', err);
      
      if (err.message?.toLowerCase().includes('token') || 
          err.message?.toLowerCase().includes('auth') ||
          err.message?.toLowerCase().includes('unauthorized')) {
        setAuthError(true);
      }
      
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
    
    if (status.totalTasks < status.membersInRotation) {
      return {
        message: `Need ${status.tasksNeeded} more task(s) for ${status.membersInRotation} members in rotation. Currently ${status.totalTasks}/${status.membersInRotation} tasks.`,
        canCreate: true,
        type: 'warning',
        tasksNeeded: status.tasksNeeded
      };
    }
    
    if (status.totalTasks === status.membersInRotation) {
      return {
        message: `Perfect! ${status.totalTasks} tasks for ${status.membersInRotation} members in rotation - 1 task each.`,
        canCreate: true,
        type: 'success'
      };
    }
    
    return {
      message: `${status.totalTasks} tasks for ${status.membersInRotation} members in rotation - some members will get multiple tasks.`,
      canCreate: true,
      type: 'info'
    };
  }, [status]);

  return {
    loading,
    error,
    status,
    authError,
    checkStatus,
    getTaskRecommendation
  };
}