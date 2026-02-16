// src/hooks/useTaskAssignment.ts
import { useState, useEffect } from 'react';
import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useTaskAssignment = (groupId: string) => { 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); 
  const [groupInfo, setGroupInfo] = useState<any>(null);

  const loadData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Load tasks
      const tasksResult = await TaskService.getGroupTasks(groupId);
      if (tasksResult.success) {
        setTasks(tasksResult.tasks || []);
      } else {
        setError(tasksResult.message || 'Failed to load tasks');
      }

      // Load members
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
      }

      // Load group info
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setGroupInfo(groupResult.group);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const reassignTask = async (taskId: string, targetUserId: string) => {
    try {
      return await TaskService.reassignTask(taskId, targetUserId);
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to reassign task'
      };
    }
  };

  useEffect(() => {
    if (groupId) {
      loadData();
    }
  }, [groupId]);

  return {
    loading,
    refreshing,
    error,
    tasks,
    members,
    groupInfo,
    loadData,
    reassignTask,
    setTasks
  };
};