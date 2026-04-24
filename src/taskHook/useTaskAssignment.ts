// src/hooks/useTaskAssignment.ts - COMPLETELY FIXED

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
    console.log('🔍 [useTaskAssignment] Computing membersInRotation from:', members.length);
    const filtered = members.filter(member => 
      member.inRotation === true && 
      member.role !== 'ADMIN'
    );
    console.log(`   Filtered: ${filtered.length} members in rotation`);
    return filtered;
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
      
      // ✅ LOAD MEMBERS FIRST - ALWAYS
      console.log('📡 Fetching members...');
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      
      if (membersResult.success) {
        const memberList = membersResult.members || [];
        console.log(`✅ Loaded ${memberList.length} members`);
        console.log('   Member details:', memberList.map((m: any) => ({
          name: m.fullName,
          role: m.role,
          inRotation: m.inRotation,
          userId: m.userId
        })));
        setMembers(memberList);
      } else {
        console.error('❌ Failed to load members:', membersResult.message);
        setMembers([]);
      }

      // ✅ LOAD TASKS SECOND
      console.log('📡 Fetching tasks...');
      const tasksResult = await TaskService.getGroupTasks(groupId);
      
      if (tasksResult.success) {
        const taskList = tasksResult.tasks || [];
        console.log(`✅ Loaded ${taskList.length} tasks`);
        setTasks(taskList);
      } else {
        console.warn('⚠️ Failed to load tasks:', tasksResult.message);
        setTasks([]);
      }

      // ✅ LOAD GROUP INFO
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setGroupInfo(groupResult.group);
      }

      console.log('========================================');
      console.log('✅ [useTaskAssignment] LOAD DATA COMPLETE');
      console.log(`   Members: ${membersResult.success ? (membersResult.members?.length || 0) : 0}`);
      console.log(`   Tasks: ${tasksResult.success ? (tasksResult.tasks?.length || 0) : 0}`);
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

  // ✅ Return membersInRotation for direct use in screen
  return {
    loading,
    refreshing,
    error,
    tasks,
    members,
    membersInRotation,  // ← This is computed from members
    groupInfo,
    authError,
    loadData,
    reassignTask,
    getAssignableMembers,
    setTasks
  };
};