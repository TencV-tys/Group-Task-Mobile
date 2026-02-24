// src/hooks/useTaskAssignment.ts - UPDATED WITH TOKEN CHECK
import { useState, useEffect, useCallback } from 'react';
import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import * as SecureStore from 'expo-secure-store';

export const useTaskAssignment = (groupId: string) => { 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); 
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [authError, setAuthError] = useState(false);

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 useTaskAssignment: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ useTaskAssignment: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  const loadData = useCallback(async (isRefreshing = false) => {
    // Check token first
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
      console.log(`📥 useTaskAssignment: Loading data for group ${groupId}`);
      
      // Load tasks
      const tasksResult = await TaskService.getGroupTasks(groupId);
      if (tasksResult.success) {
        setTasks(tasksResult.tasks || []);
        console.log(`✅ useTaskAssignment: Loaded ${tasksResult.tasks?.length || 0} tasks`);
      } else {
        setError(tasksResult.message || 'Failed to load tasks');
        if (tasksResult.message?.toLowerCase().includes('token') || 
            tasksResult.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }

      // Load members
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
        console.log(`✅ useTaskAssignment: Loaded ${membersResult.members?.length || 0} members`);
      } else if (membersResult.message?.toLowerCase().includes('token') || 
                 membersResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }

      // Load group info
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setGroupInfo(groupResult.group);
        console.log(`✅ useTaskAssignment: Loaded group info for ${groupId}`);
      } else if (groupResult.message?.toLowerCase().includes('token') || 
                 groupResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }

    } catch (err: any) {
      console.error('❌ useTaskAssignment: Error loading data:', err);
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
        // Refresh tasks after successful reassignment
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
    groupInfo,
    authError,
    loadData,
    reassignTask,
    setTasks
  };
};