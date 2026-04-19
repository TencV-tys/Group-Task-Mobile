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
      
      // Get group tasks (for assignment management)
      console.log('📡 [1] Calling TaskService.getGroupTasks...');
      const tasksResult = await TaskService.getGroupTasks(groupId);
      console.log(`📡 [1] getGroupTasks response:`, {
        success: tasksResult.success,
        tasksCount: tasksResult.tasks?.length || 0
      });
      
      if (tasksResult.success) {
        // ✅ NO NEED to create swapInfoMap from myTasksResult
        // The swap info is already attached to tasks from getGroupTasks
        // Just use the tasks directly
        
        console.log('\n📊 [2] Tasks from getGroupTasks (with swap info already attached):');
        tasksResult.tasks?.forEach((task: any, idx: number) => {
          console.log(`   Task ${idx + 1}: "${task.title}"`);
          console.log(`      acquiredViaSwap: ${task.acquiredViaSwap}`);
          console.log(`      swapScope: ${task.swapScope}`);
          console.log(`      swappedFromName: ${task.swappedFromName}`);
        });
        
        setTasks(tasksResult.tasks || []);
        
        const swappedCount = tasksResult.tasks?.filter((t: any) => t.acquiredViaSwap).length || 0;
        console.log(`\n✅ [3] FINAL PROCESSED TASKS:`);
        console.log(`  Total tasks: ${tasksResult.tasks?.length || 0}`);
        console.log(`  Swapped tasks: ${swappedCount}`);
        
      } else {
        console.log('❌ tasksResult.success is false:', tasksResult);
        setError(tasksResult.message || 'Failed to load tasks');
        if (tasksResult.message?.toLowerCase().includes('token') || 
            tasksResult.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }

      console.log('\n📡 [4] Getting members...');
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
        console.log(`✅ Loaded ${membersResult.members?.length || 0} members`);
        console.log(`   Members in rotation: ${membersResult.members?.filter((m: any) => m.inRotation).length || 0}`);
      } else if (membersResult.message?.toLowerCase().includes('token') || 
                 membersResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }

      console.log('\n📡 [5] Getting group info...');
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setGroupInfo(groupResult.group);
      } else if (groupResult.message?.toLowerCase().includes('token') || 
                 groupResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }

      console.log('========================================');
      console.log('✅ [useTaskAssignment] LOAD DATA COMPLETE');
      console.log('========================================\n');

    } catch (err: any) {
      console.error('❌❌❌ [useTaskAssignment] Error loading data:', err);
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