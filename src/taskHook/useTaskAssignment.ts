// src/hooks/useTaskAssignment.ts - WITH FULL DEBUG LOGS

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
      
      // Get user tasks (for swap info)
      console.log('📡 [2] Calling TaskService.getMyTasks...');
      const myTasksResult = await TaskService.getMyTasks(groupId);
      console.log(`📡 [2] getMyTasks response:`, {
        success: myTasksResult.success,
        tasksCount: myTasksResult.tasks?.length || 0
      });
      
      if (tasksResult.success) {
        // Create a map of taskId -> swap info from user tasks
        const swapInfoMap = new Map();
        
        console.log('🔄 [3] Processing myTasksResult for swap info...');
        
        if (myTasksResult.success && myTasksResult.tasks) {
          console.log(`📊 Found ${myTasksResult.tasks.length} user tasks`);
          
          myTasksResult.tasks.forEach((myTask: any, index: number) => {
            console.log(`\n--- Task ${index + 1}: "${myTask.title}" ---`);
            console.log(`  Task ID: ${myTask.id}`);
            console.log(`  Has assignment prop: ${!!myTask.assignment}`);
            console.log(`  assignment.acquiredViaSwap: ${myTask.assignment?.acquiredViaSwap}`);
            console.log(`  myTask.acquiredViaSwap: ${myTask.acquiredViaSwap}`);
            console.log(`  assignment.swappedFromName: ${myTask.assignment?.swappedFromName}`);
            console.log(`  myTask.swappedFromName: ${myTask.swappedFromName}`);
            console.log(`  assignment.swapScope: ${myTask.assignment?.swapScope}`);
            console.log(`  myTask.swapScope: ${myTask.swapScope}`);
            console.log(`  assignment.swapDay: ${myTask.assignment?.swapDay}`);
            console.log(`  myTask.swapDay: ${myTask.swapDay}`);
            
            // Check if this task has swap info
            const hasSwap = 
              myTask.assignment?.acquiredViaSwap === true ||
              myTask.acquiredViaSwap === true;
            
            if (hasSwap) {
              console.log(`✅✅✅ SWAPPED TASK FOUND: ${myTask.title}`);
              const swapData = {
                acquiredViaSwap: true,
                swappedFromName: myTask.assignment?.swappedFromName || myTask.swappedFromName || null,
                swapScope: myTask.assignment?.swapScope || myTask.swapScope || null,
                swapDay: myTask.assignment?.swapDay || myTask.swapDay || null
              };
              console.log(`  Storing swap data:`, swapData);
              swapInfoMap.set(myTask.id, swapData);
            } else {
              console.log(`  ❌ No swap info for this task`);
            }
          });
        } else {
          console.log('⚠️ myTasksResult failed or has no tasks:', myTasksResult);
        }
        
        console.log(`\n📊 [4] swapInfoMap size: ${swapInfoMap.size}`);
        console.log('swapInfoMap contents:', Array.from(swapInfoMap.entries()));
        
        // Process tasks - add swap info to each task
        console.log('\n🔄 [5] Processing group tasks to add swap info...');
        const processedTasks = (tasksResult.tasks || []).map((task: any, index: number) => {
          const swapInfo = swapInfoMap.get(task.id);
          
          console.log(`\n--- Group Task ${index + 1}: "${task.title}" (ID: ${task.id}) ---`);
          console.log(`  Found swap info: ${!!swapInfo}`);
          if (swapInfo) {
            console.log(`  ✅ ADDING SWAP INFO to task:`, swapInfo);
          } else {
            console.log(`  ❌ No swap info for this task`);
          }
          
          return {
            ...task,
            acquiredViaSwap: swapInfo?.acquiredViaSwap || false,
            swappedFromName: swapInfo?.swappedFromName || null,
            swapScope: swapInfo?.swapScope || null,
            swapDay: swapInfo?.swapDay || null
          };
        });
        
        setTasks(processedTasks);
        console.log('\n✅ [6] FINAL PROCESSED TASKS:');
        console.log(`  Total tasks: ${processedTasks.length}`);
        console.log(`  Swapped tasks: ${processedTasks.filter((t: any) => t.acquiredViaSwap).length}`);
        processedTasks.forEach((task: any) => {
          if (task.acquiredViaSwap) {
            console.log(`  🔄 SWAPPED: "${task.title}" - from: ${task.swappedFromName}, scope: ${task.swapScope}`);
          }
        });
        
      } else {
        console.log('❌ tasksResult.success is false:', tasksResult);
        setError(tasksResult.message || 'Failed to load tasks');
        if (tasksResult.message?.toLowerCase().includes('token') || 
            tasksResult.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }

      console.log('\n📡 [7] Getting members...');
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        setMembers(membersResult.members || []);
        console.log(`✅ Loaded ${membersResult.members?.length || 0} members`);
        console.log(`   Members in rotation: ${membersResult.members?.filter((m: any) => m.inRotation).length || 0}`);
      } else if (membersResult.message?.toLowerCase().includes('token') || 
                 membersResult.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }

      console.log('\n📡 [8] Getting group info...');
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