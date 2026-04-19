// src/hooks/useTaskAssignment.ts - UPDATED VERSION

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import { TokenUtils } from '../utils/tokenUtils';

export const useTaskAssignment = (groupId: string) => { 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); 
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [authError, setAuthError] = useState(false);

  const membersInRotation = useMemo(() => {
    return members.filter(member => 
      member.inRotation === true && 
      member.role !== 'ADMIN'
    ); 
  }, [members]);

  const getAssignableMembers = useCallback((assignedMemberIds: Set<string>) => {
    return membersInRotation.filter(member => 
      !assignedMemberIds.has(member.userId)
    );
  }, [membersInRotation]);

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

  // In useTaskAssignment.ts - Simplified loadData

const loadData = useCallback(async (isRefreshing = false) => {
  const hasToken = await checkToken();
  if (!hasToken) {
    setLoading(false);
    setRefreshing(false);
    return;
  }

  if (isRefreshing) {
    setRefreshing(true);
  } else {
    setLoading(true);
  }
  setError(null);
  setAuthError(false);

  try {
    console.log('========================================');
    console.log('🔍 [useTaskAssignment] STARTING LOAD DATA');
    console.log(`📦 Group ID: ${groupId}`);
    console.log('========================================');
    
    // Get group tasks - swap info is already attached from backend
    const tasksResult = await TaskService.getGroupTasks(groupId);
    
    if (tasksResult.success) {
      console.log(`📊 [useTaskAssignment] Loaded ${tasksResult.tasks?.length || 0} tasks`);
      console.log(`   Swapped tasks: ${tasksResult.tasks?.filter((t: any) => t.acquiredViaSwap).length || 0}`);
      
      // ✅ Use tasks directly - swap info already attached
      setTasks(tasksResult.tasks || []);
    } else {
      setError(tasksResult.message || 'Failed to load tasks');
      if (tasksResult.message?.toLowerCase().includes('token') || 
          tasksResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }
    }

    // Get members
    const membersResult = await GroupMembersService.getGroupMembers(groupId);
    if (membersResult.success) {
      setMembers(membersResult.members || []);
    }

    // Get group info
    const groupResult = await GroupMembersService.getGroupInfo(groupId);
    if (groupResult.success) {
      setGroupInfo(groupResult.group);
    }

    console.log('========================================');
    console.log('✅ [useTaskAssignment] LOAD DATA COMPLETE');
    console.log('========================================\n');

  } catch (err: any) {
    console.error('❌ [useTaskAssignment] Error loading data:', err);
    setError(err.message || 'Failed to load data');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [groupId, checkToken]);

  const reassignTask = useCallback(async (taskId: string, targetUserId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) {
        return { 
          success: false, 
          message: 'Authentication required',
          authError: true 
        };
      }

      console.log(`📥 useTaskAssignment: Reassigning task ${taskId} to user ${targetUserId}`);
      const result = await TaskService.reassignTask(taskId, targetUserId);
      
      if (result.success) {
        await loadData(true);
      }
      
      return result;
    } catch (err: any) {
      console.error('❌ useTaskAssignment: Error reassigning task:', err);
      return {
        success: false,
        message: err.message || 'Failed to reassign task'
      };
    }
  }, [checkToken, loadData]);

  useEffect(() => {
    if (groupId) {
      loadData();
    }
  }, [groupId, loadData]);

  return {
    loading,
    refreshing,
    error,
    tasks,
    members,
    membersInRotation,
    groupInfo,
    authError,
    loadData,
    reassignTask,
    getAssignableMembers,
    setTasks
  };
};