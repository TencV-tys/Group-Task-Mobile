// src/screens/GroupTasksScreen.tsx - COMPLETE FINAL VERSION

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import { SettingsModal } from '../components/SettingsModal'; 
import { ScreenWrapper } from '../components/ScreenWrapper'; 
import { useRotationStatus } from '../hooks/useRotationStatus';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests'; 
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { useTheme } from '../context/ThemeContext';
import { makeGroupTasksStyles } from '../styles/groupTasks.styles';

type TabType = 'all' | 'my';
type UrgencyLevel = 'none' | 'urgent' | 'late' | 'warning' | 'expired' | 'completed';

const formatTimeLeft = (seconds: number): string => {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  return `${seconds}s`;
};

export default function GroupTasksScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeGroupTasksStyles(theme), [theme]);
  
  const { groupId, groupName, userRole } = route.params || {};
  const insets = useSafeAreaInsets();
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);
  const isAdmin = userRole === 'ADMIN';

  // ===== ALL STATE HOOKS FIRST =====
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [todayAssignments, setTodayAssignments] = useState<any[]>([]);
  const [showTodaySection, setShowTodaySection] = useState(false);
  const [nextActiveTime, setNextActiveTime] = useState<string | null>(null);
  const [taskCreationDays, setTaskCreationDays] = useState<Map<string, number>>(new Map());
  const [baselineCreationDay, setBaselineCreationDay] = useState('');
  const [hasMixedCreationDays, setHasMixedCreationDays] = useState(false);
  const [tasksNeeded, setTasksNeeded] = useState(0);
  const [membersInRotation, setMembersInRotation] = useState<any[]>([]);

  // ===== CUSTOM HOOKS =====
  const { status: rotationStatus, checkStatus } = useRotationStatus(groupId);
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();
  const { isConnected } = useRealtimeNotifications({ showAlerts: false, suppressOfflineWarning: true });

  // ===== REALTIME HOOKS =====
  const {
    events: taskEvents,
    clearTaskCreated,
    clearTaskUpdated,
    clearTaskDeleted,
    clearTaskAssigned 
  } = useRealtimeTasks(groupId);

  const {
    events: assignmentEvents,
    clearAssignmentCompleted,
    clearAssignmentPendingVerification,
    clearAssignmentVerified,
    clearAssignmentUpdated
  } = useRealtimeAssignments(groupId, currentUserId || '');

  const {
    events: swapEvents,
    clearSwapCreated,
    clearSwapResponded,
  } = useRealtimeSwapRequests(groupId, currentUserId || '');

  // ===== CHECK IF TASK IS ASSIGNED =====
  const isTaskAssigned = useCallback((task: any): boolean => {
    if (task.currentAssignee) return true;
    if (task.assignments && task.assignments.length > 0) return true;
    return false;
  }, []);

// In GroupTasksScreen.tsx - Add debug before groupedMyTasks

const groupedMyTasks = useMemo(() => {
  if (selectedTab !== 'my') return [];
  
  // ✅ DEBUG: Log the structure of myTasks
  console.log('📊 [GroupTasks] myTasks sample (first item):', myTasks[0]);
  console.log('📊 [GroupTasks] myTasks structure:', {
    hasId: !!myTasks[0]?.id,
    hasTaskId: !!myTasks[0]?.taskId,
    hasAssignment: !!myTasks[0]?.assignment,
    assignmentId: myTasks[0]?.assignment?.id,
    taskIdFromAssignment: myTasks[0]?.assignment?.taskId,
    itemKeys: myTasks[0] ? Object.keys(myTasks[0]) : []
  });
  
  const taskMap = new Map();
  
  myTasks.forEach((item: any) => {
    // ✅ FIXED: Get the correct task ID
    // The item might have taskId directly, or inside assignment, or item.id might be task ID
    const taskId = item.taskId || item.assignment?.taskId || item.id;
    
    console.log(`📊 [GroupTasks] Processing item:`, {
      title: item.title,
      taskId: taskId,
      originalId: item.id,
      hasAssignment: !!item.assignment,
      assignmentTaskId: item.assignment?.taskId
    });
    
    if (!taskMap.has(taskId)) {
      // Get the original task for title, points, etc.
      const originalTask = tasks.find(t => t.id === taskId);
      
      taskMap.set(taskId, {
        id: taskId,
        title: originalTask?.title || item.title || 'Unknown Task',
        points: originalTask?.points || item.points || 0,
        executionFrequency: originalTask?.executionFrequency || item.executionFrequency,
        timeSlots: originalTask?.timeSlots || item.timeSlots || [],
        // Initialize counters
        totalAssignments: 0,
        completedAssignments: 0,
        verifiedAssignments: 0,
        totalPoints: 0,
        earnedPoints: 0,
        assignments: []
      });
    }
    
    const taskData = taskMap.get(taskId);
    
    // Get points from the assignment
    const assignmentPoints = item.assignment?.points || item.points || 0;
    const isCompleted = item.assignment?.completed === true || item.completed === true;
    const isVerified = item.assignment?.verified === true || item.verified === true;
    
    // Count this assignment
    taskData.totalAssignments++;
    taskData.totalPoints += assignmentPoints;
    taskData.assignments.push(item);
    
    if (isCompleted) {
      taskData.completedAssignments++;
    }
    
    if (isVerified) {
      taskData.verifiedAssignments++;
      taskData.earnedPoints += assignmentPoints;
    }
    
    console.log(`  📌 Task ${taskData.title}: Assignment #${taskData.totalAssignments}, points: ${assignmentPoints}, completed: ${isCompleted}, verified: ${isVerified}`);
  });
  
  const result = Array.from(taskMap.values()).map(task => ({
    ...task,
    isFullyCompleted: task.totalAssignments > 0 && task.completedAssignments === task.totalAssignments,
    progressPercentage: task.totalAssignments > 0 
      ? (task.completedAssignments / task.totalAssignments) * 100 
      : 0,
    displayText: `${task.completedAssignments}/${task.totalAssignments} slots • ${task.earnedPoints}/${task.totalPoints} pts`
  }));
  
  console.log('📊 [GroupTasks] Final grouped result:', result.map(t => ({
    title: t.title,
    totalAssignments: t.totalAssignments,
    completedAssignments: t.completedAssignments,
    earnedPoints: t.earnedPoints,
    totalPoints: t.totalPoints
  })));
  
  return result;
}, [selectedTab, myTasks, tasks]);

  // ===== useCallback HOOKS =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  const getTaskUrgency = useCallback((task: any): UrgencyLevel => {
    if (!task.userAssignment?.timeSlot || !task.userAssignment?.dueDate) return 'none';
    if (task.userAssignment?.completed) return 'completed';
    
    const now = new Date();
    const dueDate = new Date(task.userAssignment.dueDate);
    if (now.toDateString() !== dueDate.toDateString()) return 'none';
    
    const [endHour, endMinute] = task.userAssignment.timeSlot.endTime.split(':').map(Number);
    const endTime = new Date().setHours(endHour, endMinute, 0, 0);
    const nowTime = now.getTime();
    const graceEnd = endTime + 30 * 60000;
    const lateThreshold = endTime + 25 * 60000;
    const twoHoursBefore = endTime - 2 * 60 * 60000;
    
    if (nowTime >= endTime - 30 * 60000 && nowTime <= graceEnd) {
      return nowTime > lateThreshold ? 'late' : 'urgent';
    }
    if (nowTime >= twoHoursBefore && nowTime < endTime - 30 * 60000) return 'warning';
    if (nowTime > graceEnd) return 'expired';
    return 'none';
  }, []);


  useEffect(() => {
  // Check if route params specify which tab to show
  if (route.params?.tab === 'my') {
    console.log('📱 [GroupTasks] Setting tab to "my" from navigation params');
    setSelectedTab('my');
  } else if (route.params?.tab === 'all') {
    console.log('📱 [GroupTasks] Setting tab to "all" from navigation params');
    setSelectedTab('all');
  }
}, [route.params?.tab]);

  const validateTaskTime = useCallback((task: any) => {
    const result = {
      isSubmittableNow: false,
      timeLeft: null as number | null,
      submissionStatus: 'waiting' as 'available' | 'waiting' | 'expired' | 'wrong_day' | 'completed',
      willBePenalized: false,
      statusMessage: '',
      opensAfter: ''
    };

    if (!task.userAssignment || task.userAssignment.completed) {
      result.submissionStatus = 'completed';
      result.statusMessage = 'Already completed';
      return result;
    }

    const now = new Date();
    const dueDate = new Date(task.userAssignment.dueDate);
    if (now.toDateString() !== dueDate.toDateString()) {
      result.submissionStatus = 'wrong_day';
      result.statusMessage = `Due on ${dueDate.toLocaleDateString()}`;
      return result;
    }

    const timeSlots = task.timeSlots || (task.userAssignment.timeSlot ? [task.userAssignment.timeSlot] : []);
    if (!timeSlots.length) {
      result.isSubmittableNow = true;
      result.submissionStatus = 'available';
      result.statusMessage = 'Available now';
      return result;
    }

    const currentInMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of timeSlots) {
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      const endInMinutes = endHour * 60 + endMinute;
      const submissionStart = endInMinutes;
      const gracePeriodEnd = endInMinutes + 30;
      const lateThreshold = endInMinutes + 25;
      
      if (currentInMinutes < submissionStart) {
        const opensAfter = new Date();
        opensAfter.setHours(endHour, endMinute, 0, 0);
        result.submissionStatus = 'waiting';
        result.statusMessage = `Opens after ${opensAfter.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        result.opensAfter = opensAfter.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        result.timeLeft = Math.ceil((submissionStart - currentInMinutes) * 60);
        break;
      }
      if (currentInMinutes >= submissionStart && currentInMinutes <= gracePeriodEnd) {
        result.isSubmittableNow = true;
        result.submissionStatus = 'available';
        result.willBePenalized = currentInMinutes > lateThreshold;
        result.timeLeft = Math.max(0, gracePeriodEnd - currentInMinutes) * 60;
        break;
      }
      result.submissionStatus = 'expired';
      result.statusMessage = 'Submission window closed';
      result.timeLeft = 0;
    }
    return result;
  }, []);

  const analyzeTaskCreationDays = useCallback((taskList: any[]) => {
    if (!taskList.length) return;
    
    const dayCounts = new Map<string, number>();
    let maxCount = 0;
    let mostCommonDay = '';
    
    taskList.forEach((task) => {
      if (task.createdAt) {
        const creationDate = new Date(task.createdAt);
        const dayName = creationDate.toLocaleDateString('en-US', { weekday: 'long' });
        const count = (dayCounts.get(dayName) || 0) + 1;
        dayCounts.set(dayName, count);
        if (count > maxCount) {
          maxCount = count;
          mostCommonDay = dayName;
        }
      }
    });
    
    setTaskCreationDays(dayCounts);
    setBaselineCreationDay(mostCommonDay);
    setHasMixedCreationDays(dayCounts.size > 1);
    
    const membersInRotationCount = rotationStatus?.membersInRotation ?? 0;
    const tasksNeededCount = Math.max(0, membersInRotationCount - taskList.length);
    setTasksNeeded(tasksNeededCount);
  }, [rotationStatus?.membersInRotation]);

  const findTodayAssignments = useCallback((tasks: any[]) => {
    const today = new Date().toDateString();
    return tasks.filter(task => {
      if (!task.userAssignment?.dueDate || task.userAssignment.completed) return false;
      const isToday = new Date(task.userAssignment.dueDate).toDateString() === today;
      return isToday && ['urgent', 'late', 'warning'].includes(getTaskUrgency(task));
    });
  }, [getTaskUrgency]);

  const calculateNextActiveTime = useCallback((tasks: any[]): string | null => {
    const now = new Date();
    let nextTime: Date | null = null;

    tasks.forEach(task => {
      if (task.userAssignment?.timeSlot) {
        const [hours, minutes] = task.userAssignment.timeSlot.startTime.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(hours, minutes, 0, 0);
        if (startTime > now && (!nextTime || startTime < nextTime)) {
          nextTime = startTime;
        }
      }
    });

    return nextTime ? 
      `${(nextTime as Date).getHours().toString().padStart(2, '0')}:${(nextTime as Date).getMinutes().toString().padStart(2, '0')}` : 
      null;
  }, []);

  // ===== FETCH MEMBERS FUNCTION =====
  const fetchMembers = useCallback(async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;
    
    try {
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success) {
        const members = membersResult.members || [];
        const inRotation = members.filter((m: any) => m.inRotation === true);
        setMembersInRotation(inRotation);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, [groupId, checkToken]);

 // ===== FETCH TASKS FUNCTION =====
const fetchTasks = useCallback(async (isRefreshing = false) => {
  const hasToken = await checkToken();
  if (!hasToken) {
    setLoading(false);
    setRefreshing(false);
    return;
  }

  if (isRefreshing) setRefreshing(true);
  else if (!initialLoadDone.current) setLoading(true);
  setError(null);

  try {
    console.log('\n📊📊📊 [FETCH TASKS] START 📊📊📊');
    
    // Fetch all tasks
    const allTasksResult = await TaskService.getGroupTasks(groupId);
    console.log('📊 [All Tasks] Result:', {
      success: allTasksResult.success,
      tasksCount: allTasksResult.tasks?.length
    });
    
    if (allTasksResult.success && isMounted.current) {
      const processedTasks = (allTasksResult.tasks || []).map((task: any) => {
        const userAssignment = task.assignments?.find((a: any) => a.user?.id);
        return {
          ...task,
          isAssignedToUser: !!userAssignment || !!task.userAssignment,
          userAssignment: userAssignment || task.userAssignment,
        };
      });
      setTasks(processedTasks);
      analyzeTaskCreationDays(processedTasks);
      initialLoadDone.current = true;
      console.log('✅ [All Tasks] Set', processedTasks.length, 'tasks');
    } else {
      setError(allTasksResult.message || 'Failed to load tasks');
    }
    
    // Fetch my tasks
    const myTasksResult = await TaskService.getMyTasks(groupId);
    
    // ===== COMPLETE DEBUG LOGS =====
    console.log('\n🔍🔍🔍 [MY TASKS] FULL DEBUG 🔍🔍🔍');
    console.log('📦 myTasksResult.success:', myTasksResult.success);
    console.log('📦 myTasksResult.message:', myTasksResult.message);
    console.log('📦 myTasksResult keys:', Object.keys(myTasksResult));
    console.log('📦 myTasksResult.tasks length:', myTasksResult.tasks?.length);
    console.log('📦 myTasksResult.data?.tasks length:', myTasksResult.data?.tasks?.length);
    console.log('📦 myTasksResult.assignments length:', myTasksResult.assignments?.length);
    
    // Try to get tasks from different possible paths
    let myTasksArray = [];
    if (myTasksResult.tasks && Array.isArray(myTasksResult.tasks)) {
      myTasksArray = myTasksResult.tasks;
      console.log('✅ Using myTasksResult.tasks');
    } else if (myTasksResult.data?.tasks && Array.isArray(myTasksResult.data?.tasks)) {
      myTasksArray = myTasksResult.data.tasks;
      console.log('✅ Using myTasksResult.data.tasks');
    } else if (myTasksResult.assignments && Array.isArray(myTasksResult.assignments)) {
      myTasksArray = myTasksResult.assignments;
      console.log('✅ Using myTasksResult.assignments');
    } else if (Array.isArray(myTasksResult)) {
      myTasksArray = myTasksResult;
      console.log('✅ Using myTasksResult as array');
    }
    
    console.log('📊 myTasksArray length:', myTasksArray.length);
    
    if (myTasksArray.length > 0) {
      const firstItem = myTasksArray[0];
      console.log('\n📋 First item structure:');
      console.log('  - id:', firstItem.id);
      console.log('  - title:', firstItem.title);
      console.log('  - taskId:', firstItem.taskId);
      console.log('  - points:', firstItem.points);
      console.log('  - executionFrequency:', firstItem.executionFrequency);
      console.log('  - has assignment:', !!firstItem.assignment);
      if (firstItem.assignment) {
        console.log('  - assignment.id:', firstItem.assignment.id);
        console.log('  - assignment.completed:', firstItem.assignment.completed);
        console.log('  - assignment.verified:', firstItem.assignment.verified);
        console.log('  - assignment.points:', firstItem.assignment.points);
        console.log('  - assignment.dueDate:', firstItem.assignment.dueDate);
        console.log('  - assignment.timeSlot:', firstItem.assignment.timeSlot);
      }
      console.log('  - All keys:', Object.keys(firstItem));
      
      // Log first 5 items summary
      console.log('\n📋 First 5 items summary:');
      myTasksArray.slice(0, 5).forEach((item: any, idx: number) => {
        console.log(`  ${idx + 1}. ID: ${item.id}, Title: ${item.title}, Completed: ${item.assignment?.completed}, Verified: ${item.assignment?.verified}, Points: ${item.assignment?.points || item.points}`);
      });
    } else {
      console.log('❌ No tasks found in myTasksResult!');
    }
    
    if (myTasksResult.success && myTasksArray.length > 0 && isMounted.current) {
      const enhancedTasks = myTasksArray.map((task: any) => ({
        ...task,
        ...validateTaskTime(task),
        urgencyLevel: getTaskUrgency(task)
      }));
      setMyTasks(enhancedTasks);
      console.log('✅ [My Tasks] Set', enhancedTasks.length, 'enhanced tasks');
      
      const todayTasks = findTodayAssignments(enhancedTasks);
      setTodayAssignments(todayTasks);
      setShowTodaySection(todayTasks.length > 0);
      setNextActiveTime(calculateNextActiveTime(todayTasks));
      console.log('📅 Today tasks:', todayTasks.length);
    } else {
      console.log('⚠️ [My Tasks] No valid tasks to set');
      setMyTasks([]);
    }
    
    console.log('📊📊📊 [FETCH TASKS] END 📊📊📊\n');
    
  } catch (err: any) {
    console.error('❌ Error in fetchTasks:', err);
    if (isMounted.current) setError(err.message || 'Network error');
  } finally {
    if (isMounted.current) {
      setLoading(false);
      setRefreshing(false);
    }
  }
}, [groupId, checkToken, analyzeTaskCreationDays, validateTaskTime, getTaskUrgency, findTodayAssignments, calculateNextActiveTime]);

  const refreshTasks = useCallback(() => fetchTasks(true), [fetchTasks]);


// In GroupTasksScreen.tsx - REPLACE the handleViewTaskDetails function with this:

const handleViewTaskDetails = async (item: any) => {
  if (!await checkToken()) return;
  
  const isMyTasksView = selectedTab === 'my';
  const isAcquiredViaSwap = item.acquiredViaSwap === true;
  const swapScope = item.swapScope || item.assignment?.swapScope;
  const assignmentId = item.userAssignment?.id;
  
  // ✅ DAY SWAP ONLY - redirect to Assignment Details
  // Week swap should go to normal Task Details (like original task)
  if (isMyTasksView && isAcquiredViaSwap && swapScope === 'day' && assignmentId) {
    console.log('🔄 Day swap task detected, navigating to Assignment Details:', assignmentId);
    navigation.navigate('AssignmentDetails', { 
      assignmentId, 
      isAdmin: false,
      onVerified: refreshTasks
    });
    return;
  }
  
  // ✅ WEEK SWAP or normal task - go to Task Details (normal flow)
  console.log('📋 Navigating to Task Details:', item.id, 'swapScope:', swapScope);
  navigation.navigate('TaskDetails', { 
    taskId: item.id, 
    groupId, 
    userRole 
  });
};

  // ===== useEffect HOOKS =====
  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.navigate('Login') } 
      ]);
    }
  }, [authError, navigation]);

  useEffect(() => {
    if (assignmentEvents.assignmentUpdated) {
      refreshTasks();
      clearAssignmentUpdated();
    }
  }, [assignmentEvents.assignmentUpdated, refreshTasks, clearAssignmentUpdated]);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    getCurrentUser();
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (taskEvents.taskCreated) {
      Alert.alert('📢 New Task', `Task "${taskEvents.taskCreated.title}" created`);
      refreshTasks();
      clearTaskCreated();
    }
  }, [taskEvents.taskCreated, refreshTasks, clearTaskCreated]);

  useEffect(() => {
    if (taskEvents.taskUpdated) {
      refreshTasks();
      clearTaskUpdated();
    }
  }, [taskEvents.taskUpdated, refreshTasks, clearTaskUpdated]);

  useEffect(() => {
    if (taskEvents.taskDeleted) {
      Alert.alert('🗑️ Task Deleted', `Task "${taskEvents.taskDeleted.taskTitle}" deleted`);
      refreshTasks();
      clearTaskDeleted();
    }
  }, [taskEvents.taskDeleted, refreshTasks, clearTaskDeleted]);

  useEffect(() => {
    if (taskEvents.taskAssigned) {
      if (taskEvents.taskAssigned.assignedTo === currentUserId) {
        Alert.alert('📋 New Assignment', `You've been assigned: "${taskEvents.taskAssigned.taskTitle}"`);
      }
      refreshTasks();
      clearTaskAssigned();
    }
  }, [taskEvents.taskAssigned, refreshTasks, clearTaskAssigned, currentUserId]);

  useEffect(() => {
    if (assignmentEvents.assignmentCompleted) {
      refreshTasks();
      clearAssignmentCompleted();
    }
  }, [assignmentEvents.assignmentCompleted, refreshTasks, clearAssignmentCompleted]);

  useEffect(() => {
    if (assignmentEvents.assignmentVerified) {
      refreshTasks();
      clearAssignmentVerified();
    }
  }, [assignmentEvents.assignmentVerified, refreshTasks, clearAssignmentVerified]);

  useEffect(() => {
    if (swapEvents.swapCreated) {
      refreshTasks();
      clearSwapCreated();
    }
  }, [swapEvents.swapCreated, refreshTasks, clearSwapCreated]);

  useEffect(() => {
    if (groupId && userRole === 'ADMIN') checkStatus();
  }, [groupId, tasks.length, checkStatus, userRole]);

  useEffect(() => {
    if (groupId && !loadingUser && !initialLoadDone.current) {
      fetchTasks();
      fetchMembers();
      loadPendingForMe(groupId);
    }
  }, [groupId, loadingUser, fetchTasks, fetchMembers, loadPendingForMe]);

 // ===== NAVIGATION FOCUS EFFECT - Combined =====
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    if (groupId && !loadingUser) {
      console.log('🔄 Screen focused - refreshing tasks and swap counts');
      refreshTasks();
      loadPendingForMe(groupId, true);
    }
  });
  return unsubscribe;
}, [navigation, groupId, loadingUser, refreshTasks, loadPendingForMe]);

  useEffect(() => {
    if (swapEvents.swapResponded) {
      refreshTasks();
      clearSwapResponded();
    }
  }, [swapEvents.swapResponded, refreshTasks, clearSwapResponded]);

  // ===== HANDLER FUNCTIONS =====
  
  const handleEditTask = async (task: any) => {
    if (!await checkToken()) return;
    if (!isAdmin) {
      Alert.alert('Restricted', 'Only admins can edit tasks');
      return;
    }
    
    if (isTaskAssigned(task)) {
      Alert.alert(
        'Cannot Edit Task',
        'This task is already assigned to members. Editing assigned tasks could break the rotation system.\n\n' +
        'Consider creating a new task instead, or wait until the rotation week ends.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('UpdateTask', { 
      task, 
      groupId, 
      groupName, 
      onTaskUpdated: refreshTasks 
    });
  };

  const handleViewRotationSchedule = () => {
    navigation.navigate('RotationSchedule', { groupId, groupName, userRole });
  };

  const handleDeleteTask = async (task: any) => {
    if (!await checkToken()) return;

    const isAssigned = isTaskAssigned(task);

    Alert.alert(
      '🗑️ Delete Task',
      isAssigned
        ? `Delete "${task.title}"?\n\nAssignment history will be preserved for members. The rotation slot will be freed up for a new task.`
        : `Delete "${task.title}"?\n\nThis task has no active assignments. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setTasks(prev => prev.filter(t => t.id !== task.id));
            setMyTasks(prev => prev.filter(t => t.id !== task.id));

            const result = await TaskService.deleteTask(task.id);
            if (result.success) {
              refreshTasks();
            } else {
              refreshTasks();
              Alert.alert('Error', result.message || 'Failed to delete task');
            }
          }
        }
      ] 
    );
  };

  const handleCreateTask = async () => {
    if (!await checkToken()) return;
    if (!isAdmin) {
      Alert.alert('Restricted', 'Only admins can create tasks');
      return;
    }
    navigation.navigate('CreateTask', { groupId, groupName, onTaskCreated: refreshTasks });
  };

  const handleCompleteNow = async (task: any) => {
    if (!await checkToken()) return;
    if (!task.userAssignment) {
      Alert.alert('Error', 'No assignment found');
      return;
    }
    navigation.navigate('AssignmentDetails', {
      assignmentId: task.userAssignment.id,
      isAdmin: false,
      onVerified: refreshTasks
    });
  };

  const handleNavigateToSwapRequests = async () => {
    if (await checkToken()) navigation.navigate('PendingSwapRequests');
  };

  const handleNavigateToAssignment = async () => {
    if (await checkToken()) {
      navigation.navigate('TaskAssignment', { groupId, groupName, userRole });
    }
  };

  const handleViewAllTodayTasks = async () => {
    if (!await checkToken()) return;
    if (!todayAssignments.length) return;
    
    if (todayAssignments.length === 1) {
      navigation.navigate('AssignmentDetails', {
        assignmentId: todayAssignments[0].userAssignment.id,
        isAdmin: false,
        onVerified: refreshTasks
      });
    } else {
      navigation.navigate('TodayAssignments', { groupId, groupName });
    }
  };

  const handleDashboardPress = () => {
    if (isAdmin) {
      navigation.navigate('AdminDashboard', { groupId, groupName, userRole });
    } else {
      navigation.navigate('MemberDashboard', { groupId, groupName, userRole });
    }
  };

  const handleViewDrafts = () => {
    navigation.navigate('TaskDrafts', { groupId, groupName });
  };

  // ===== RENDER FUNCTIONS =====
  const renderAssignmentInfo = (task: any) => {
    const hasAssignment = task.userAssignment || task.assignments?.length > 0;
    if (!hasAssignment) {
      return (
        <View style={styles.unassignedInfo}>
          <MaterialCommunityIcons name="account-question" size={16} color={theme.textMuted} />
          <Text style={styles.unassignedText}>Not assigned to anyone</Text>
        </View>
      );
    }

    let currentAssignment = null;
    let assigneeName = 'Unknown';
    let isAssignedToMe = false;
    let isCompleted = false;
    
    if (selectedTab === 'my') {
      if (task.userAssignment) {
        currentAssignment = task.userAssignment;
        isAssignedToMe = true;
        assigneeName = 'You';
        isCompleted = currentAssignment?.completed || false;
      }
    } else { 
      const currentWeekAssignment = task.assignments?.find((a: any) => {
        const isCurrentWeek = a.rotationWeek === rotationStatus?.currentWeek;
        const isAssigned = a.userId === task.currentAssignee;
        return isCurrentWeek && isAssigned;
      }) || task.assignments?.[0];
       
      if (currentWeekAssignment) {
        currentAssignment = currentWeekAssignment;
        assigneeName = currentWeekAssignment.user?.fullName || 'Unknown';
        isAssignedToMe = currentWeekAssignment.userId === currentUserId;
        isCompleted = currentWeekAssignment.completed || false;
      } else if (task.currentAssignee) {
        const assignedMember = membersInRotation.find(m => m.userId === task.currentAssignee);
        if (assignedMember) {
          assigneeName = assignedMember.fullName;
          isAssignedToMe = assignedMember.userId === currentUserId;
        }
      }
    }
    
    if (!currentAssignment && !task.currentAssignee) {
      return (
        <View style={styles.unassignedInfo}>
          <MaterialCommunityIcons name="account-question" size={16} color={theme.textMuted} />
          <Text style={styles.unassignedText}>Not assigned</Text>
        </View>
      );
    }

    const getIcon = () => {
      if (isCompleted) return "check-circle";
      if (selectedTab === 'my') return "account";
      return isAssignedToMe ? "account" : "account-clock";
    };

    const getColor = () => {
      if (isCompleted) return theme.primary;
      if (selectedTab === 'my') return theme.textSecondary;
      return isAssignedToMe ? theme.textSecondary : theme.textMuted;
    };

    return (
      <View style={[
        styles.assignmentInfo,
        isCompleted ? styles.completedAssignment : styles.pendingAssignment,
        !isCompleted && isAssignedToMe && selectedTab === 'all' && styles.myAssignment
      ]}>
        <View style={styles.assignmentHeader}>
          <MaterialCommunityIcons name={getIcon()} size={16} color={getColor()} />
          <Text style={[styles.assignmentStatus, { color: getColor() }]}>
            {isCompleted ? 'Completed' : selectedTab === 'my' ? 'Assigned to you' : `Assigned to ${assigneeName}`}
          </Text>
        </View>
      </View>
    );
  };

  const renderCreationDayBanner = () => {
    if (!isAdmin || selectedTab !== 'all' || !tasks.length) return null;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const isTodayBaseline = today === baselineCreationDay;
    const membersInRotationCount = rotationStatus?.membersInRotation ?? 0;
    const hasPerfectCount = tasks.length === membersInRotationCount;
    const needsTasks = tasks.length < membersInRotationCount;
    const tasksNeededCount = Math.max(0, membersInRotationCount - tasks.length);

    return (
      <LinearGradient
        colors={!hasMixedCreationDays ? [theme.primaryLight, theme.primaryLight] : [theme.primaryLight, theme.primaryLight]}
        style={styles.creationDayBanner}
      >
        <View style={styles.bannerHeader}>
          <MaterialCommunityIcons 
            name={!hasMixedCreationDays ? "calendar-check" : "calendar-alert"} 
            size={24} 
            color={!hasMixedCreationDays ? theme.primary : theme.primary} 
          />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>
              {!hasMixedCreationDays ? '✅ Consistent Task Creation' : '⚠️ Mixed Creation Days'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {!hasMixedCreationDays 
                ? `All tasks created on ${baselineCreationDay}s`
                : `Tasks created on: ${Array.from(taskCreationDays.keys()).join(', ')}`}
            </Text>
          </View>
        </View>

        <View style={styles.bannerStats}>
          <View style={styles.statRow}>
            <MaterialCommunityIcons name="format-list-checks" size={16} color={theme.textSecondary} />
            <Text style={styles.statText}>{tasks.length} task{tasks.length > 1 ? 's' : ''} created</Text>
          </View>
          
          <View style={styles.statRow}>
            <MaterialCommunityIcons 
              name={isTodayBaseline ? "thumb-up" : "calendar-alert"} 
              size={16} 
              color={isTodayBaseline ? theme.primary : theme.primary} 
            />
            <Text style={[styles.statText, isTodayBaseline ? styles.successText : styles.warningText]}>
              {isTodayBaseline 
                ? `✓ Today (${today}) matches creation day` 
                : `ℹ️ Today is ${today} - tasks should be on ${baselineCreationDay}s`}
            </Text>
          </View>

          {needsTasks && (
            <View style={styles.tasksNeededBadge}>
              <MaterialCommunityIcons name="alert" size={14} color={theme.primary} />
              <Text style={styles.tasksNeededText}>
                Need {tasksNeededCount} more task{tasksNeededCount > 1 ? 's' : ''} for perfect rotation ({tasks.length}/{membersInRotationCount})
              </Text>
            </View>
          )}

          {hasPerfectCount && membersInRotationCount > 0 && (
            <View style={[styles.tasksNeededBadge, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="check-circle" size={14} color={theme.primary} />
              <Text style={[styles.tasksNeededText, { color: theme.primary }]}>
                Perfect! {tasks.length} task{tasks.length > 1 ? 's' : ''} for {membersInRotationCount} member{membersInRotationCount > 1 ? 's' : ''} in rotation
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  };

  const renderHeader = () => (
    <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>{groupName || 'Tasks'}</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? theme.primary : theme.error }]} />
          <Text style={styles.connectionText}>{isConnected ? 'Live' : 'Offline'}</Text>
        </View>
        {isAdmin && rotationStatus && !rotationStatus.hasEnoughTasks && rotationStatus.totalTasks > 0 && (
          <TouchableOpacity style={styles.rotationWarningBadge} onPress={handleViewRotationSchedule}>
            <MaterialCommunityIcons name="alert" size={14} color={theme.primary} />
            <Text style={styles.rotationWarningText}>
              Need {rotationStatus.tasksNeeded} more task{rotationStatus.tasksNeeded > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.headerRight}>
        {isAdmin && (
          <TouchableOpacity style={styles.draftsButton} onPress={handleViewDrafts}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
        )}
        {!isAdmin && (
          <TouchableOpacity style={styles.swapButton} onPress={handleNavigateToSwapRequests}>
            <MaterialCommunityIcons name="swap-horizontal" size={22} color={theme.primary} />
            {totalPendingForMe > 0 && (
              <View style={styles.swapBadge}>
                <Text style={styles.swapBadgeText}>{totalPendingForMe}</Text>
              </View>
            )}
          </TouchableOpacity> 
        )}
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
          <MaterialCommunityIcons name="cog" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderTodaySection = () => {
    if (!showTodaySection || selectedTab !== 'my') return null;
    
    const urgentTasks = todayAssignments.filter(t => t.urgencyLevel === 'urgent');
    const lateTasks = todayAssignments.filter(t => t.urgencyLevel === 'late');
    const warningTasks = todayAssignments.filter(t => t.urgencyLevel === 'warning');
    const hasUrgent = urgentTasks.length > 0 || lateTasks.length > 0;
    
    return (
      <LinearGradient
        colors={hasUrgent ? [theme.errorBg, theme.errorBg] : [theme.primaryLight, theme.primaryLight]}
        style={[styles.todaySection, hasUrgent ? styles.urgentSection : styles.warningSection]}
      >
        <View style={styles.todaySectionHeader}>
          <View style={styles.todaySectionTitleContainer}>
            <MaterialCommunityIcons name={hasUrgent ? "timer-alert" : "clock-alert"} size={20} color={hasUrgent ? theme.error : theme.primary} />
            <Text style={[styles.todaySectionTitle, { color: hasUrgent ? theme.error : theme.primary }]}>
              {hasUrgent ? 'URGENT - Due Soon' : 'Due Today'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleViewAllTodayTasks}>
            <Text style={styles.todaySectionViewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {[...lateTasks, ...urgentTasks, ...warningTasks].slice(0, 3).map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[
              styles.todayTaskItem,
              task.urgencyLevel === 'late' && styles.lateTaskItem,
              task.urgencyLevel === 'urgent' && styles.urgentTaskItem,
              task.urgencyLevel === 'warning' && styles.warningTaskItem
            ]}
            onPress={() => navigation.navigate('AssignmentDetails', {
              assignmentId: task.userAssignment.id,
              isAdmin: false,
              onVerified: refreshTasks
            })}
          >
            <View style={styles.todayTaskItemContent}>
              <View style={[
                styles.todayTaskItemIcon,
                task.urgencyLevel === 'late' && styles.lateIcon,
                task.urgencyLevel === 'urgent' && styles.urgentIcon,
                task.urgencyLevel === 'warning' && styles.warningIcon
              ]}>
                <MaterialCommunityIcons 
                  name={task.urgencyLevel === 'late' ? "timer-alert" : 
                        task.urgencyLevel === 'urgent' ? "timer" : "clock-alert"} 
                  size={18} 
                  color={task.urgencyLevel === 'late' ? "#fff" : 
                         task.urgencyLevel === 'urgent' ? theme.error : theme.primary} 
                />
              </View>
              <View style={styles.todayTaskItemInfo}>
                <Text style={styles.todayTaskItemTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.todayTaskItemTime}>
                  {task.userAssignment?.timeSlot 
                    ? `${task.userAssignment.timeSlot.startTime} - ${task.userAssignment.timeSlot.endTime}`
                    : 'Due today'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        ))}
        
        {todayAssignments.length > 3 && (
          <TouchableOpacity style={styles.todayMoreButton} onPress={handleViewAllTodayTasks}>
            <Text style={styles.todayMoreButtonText}>+{todayAssignments.length - 3} more</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  };

  const renderTodayFAB = () => {
    if (!showTodaySection || selectedTab !== 'my') return null;
    
    const hasLate = todayAssignments.some(t => t.urgencyLevel === 'late');
    const hasUrgent = todayAssignments.some(t => t.urgencyLevel === 'urgent');
    const hasWarning = todayAssignments.some(t => t.urgencyLevel === 'warning');
    const hasSubmittableNow = todayAssignments.some(t => t.isSubmittableNow);
    
    let config = {
      colors: [theme.primary, theme.primaryDark] as [string, string],
      icon: "check-circle",
      title: "Ready to Submit!",
      message: `${todayAssignments.filter(t => t.isSubmittableNow).length} can submit now`
    };
    
    if (hasLate) {
      config = { colors: [theme.primary, theme.primaryDark], icon: "timer-alert", title: "⚠️ LATE SUBMISSIONS", message: `${todayAssignments.filter(t => t.urgencyLevel === 'late').length} tasks are late` };
    } else if (hasUrgent) {
      config = { colors: [theme.error, theme.error], icon: "timer", title: "⏰ URGENT", message: `${todayAssignments.filter(t => t.urgencyLevel === 'urgent').length} tasks ending soon` };
    } else if (hasWarning) {
      config = { colors: [theme.primary, theme.primaryDark], icon: "clock-alert", title: "⏳ Due Soon", message: `${todayAssignments.filter(t => t.urgencyLevel === 'warning').length} tasks due in <2hrs` };
    } else if (!hasSubmittableNow) {
      config = { colors: [theme.textMuted, theme.textMuted], icon: "clock-start", title: "Today's Tasks", message: `${todayAssignments.length} tasks due today` };
    }
    
    return (
      <TouchableOpacity style={styles.todayFAB} onPress={handleViewAllTodayTasks}>
        <LinearGradient colors={config.colors} style={styles.todayFABContent}>
          <MaterialCommunityIcons name={config.icon as any} size={24} color="white" />
          <View style={styles.todayFABTextContainer}>
            <Text style={styles.todayFABTitle}>{config.title}</Text>
            <Text style={styles.todayFABCount}>{config.message}</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

 
  const renderTask = ({ item }: any) => {
  const isMyTasksView = selectedTab === 'my';
  const taskIsAssigned = isTaskAssigned(item);
  
  // Get swap info
  const isAcquiredViaSwap = item.acquiredViaSwap === true;
  const swappedFromName = item.swappedFromName || 'another member';
  const swapRequestId = item.swapRequestId;
  const swapScope = item.swapScope;
  const swapDay = item.swapDay;
  
  const isAssignedToCurrentUser = 
    item.isAssignedToUser === true || 
    !!item.userAssignment || 
    (item.assignments && item.assignments.some((a: any) => a.userId === currentUserId));
  
  const isClickable = isAdmin || isMyTasksView || isAssignedToCurrentUser;
  
  let isFullyCompleted = false;
  let completionPercentage = 0;
  let completedCount = 0;
  let totalCount = 0;
  let earnedPoints = 0;
  let totalPoints = 0;
  let displayText = '';
  
  // ✅ For "My Tasks" tab - use pre-calculated values
  if (isMyTasksView) {
    totalCount = item.totalAssignments || 0;
    completedCount = item.completedAssignments || 0;
    earnedPoints = item.earnedPoints || 0;
    totalPoints = item.totalPoints || 0;
    isFullyCompleted = item.isFullyCompleted || false;
    completionPercentage = item.progressPercentage || 0;
    displayText = item.displayText || `${completedCount}/${totalCount} slots • ${earnedPoints}/${totalPoints} pts`;
  } 
  // ✅ For "All Tasks" tab (Admin view) - calculate from assignments properly
 // For "All Tasks" tab (Admin view)
else {
  const allAssignments = item.assignments || [];
  const relevantAssignments = allAssignments;
  
  totalCount = relevantAssignments.length;
  
  let completedAssignments = 0;
  let verifiedAssignments = 0;
  let totalPointsSum = 0;
  let earnedPointsSum = 0;
  
  relevantAssignments.forEach((assignment: any) => {
    const points = assignment.points || 0;
    totalPointsSum += points;
    
    if (assignment.completed === true) {
      completedAssignments++;
    }
    
    if (assignment.verified === true) {
      verifiedAssignments++;
      earnedPointsSum += points;
    }
  });
  
  // ✅ Use verifiedAssignments for display, not completedAssignments
  completedCount = verifiedAssignments;  // ← CHANGE THIS
  totalCount = relevantAssignments.length;
  totalPoints = totalPointsSum;
  earnedPoints = earnedPointsSum;
  
  isFullyCompleted = totalCount > 0 && verifiedAssignments === totalCount;
  completionPercentage = totalCount > 0 ? (verifiedAssignments / totalCount) * 100 : 0;
  displayText = `${verifiedAssignments}/${totalCount} slots • ${earnedPoints}/${totalPoints} pts`;
  
  console.log(`📊 [All Tasks] Task: ${item.title}`, {
    totalCount,
    verifiedAssignments,
    completedAssignments,
    totalPoints,
    earnedPoints,
    displayText
  });
}

  
  const validation = validateTaskTime(item);
  
  const getGradientColors = (): [string, string] => {
    if (!isClickable) return [theme.bgSecondary, theme.bgTertiary];
    if (isFullyCompleted) return [theme.bgSecondary, theme.bgTertiary];
    if (isMyTasksView && validation.isSubmittableNow) {
      return validation.willBePenalized ? [theme.primaryLight, theme.primaryLight] : [theme.primaryLight, theme.primaryLight];
    }
    return [theme.card, theme.bgSecondary];
  };

  return (
    <TouchableOpacity
      onPress={() => handleViewTaskDetails(item)}
      onLongPress={() => {
        if (!isAdmin || isMyTasksView) return;

        if (!taskIsAssigned) {
          Alert.alert('Task Options', `"${item.title}"`, [
            { text: 'Edit', onPress: () => handleEditTask(item) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteTask(item) },
            { text: 'Cancel', style: 'cancel' }
          ]);
        } else {
          Alert.alert('Task Options', `"${item.title}"`, [
            { 
              text: 'Edit ⚠️', 
              onPress: () => Alert.alert(
                'Cannot Edit Assigned Task',
                'This task is already assigned. Editing could break the rotation system.\n\nConsider creating a new task instead.',
                [{ text: 'OK' }]
              )
            },
            { 
              text: 'Delete', 
              style: 'destructive', 
              onPress: () => handleDeleteTask(item) 
            },
            { text: 'Cancel', style: 'cancel' }
          ]);
        }
      }}
      activeOpacity={isClickable ? 0.7 : 1}
    > 
      <LinearGradient 
        colors={getGradientColors()} 
        style={[
          styles.taskCard,
          !isClickable && styles.disabledTaskCard,
          isAcquiredViaSwap && !isFullyCompleted && isMyTasksView && styles.swappedTaskCard
        ]}
      >
        <View style={styles.taskHeader}>
          <LinearGradient 
            colors={isFullyCompleted ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]} 
            style={styles.taskIcon}
          >
            <MaterialCommunityIcons 
              name={isFullyCompleted ? "check" : "format-list-checks"} 
              size={20} 
              color={isFullyCompleted ? "#fff" : theme.textMuted} 
            />
          </LinearGradient>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, isFullyCompleted && styles.completedTaskTitle]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.taskMeta}>
              <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
                <Text style={styles.taskPoints}>{displayText}</Text>
              </LinearGradient>
              
              {/* SWAP INDICATOR BADGE */}
              {isAcquiredViaSwap && !isFullyCompleted && isMyTasksView && (
                <LinearGradient
                  colors={['#F59E0B', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swapIndicatorBadge}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={10} color="#fff" />
                  <Text style={styles.swapIndicatorText}>
                    {swapScope === 'week' ? 'Week Swap' : `${swapDay || 'Day'} Swap`}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </View>
        </View>
        
        {/* SWAP INFO TOOLTIP */}
        {isAcquiredViaSwap && !isFullyCompleted && isMyTasksView && (
          <LinearGradient
            colors={[theme.primaryLight, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.swapInfoTooltip, { borderColor: theme.primaryBorder }]}
          >
            <MaterialCommunityIcons name="information" size={14} color={theme.primary} />
            <Text style={[styles.swapInfoText, { color: theme.primary }]}>
              {swapScope === 'week' 
                ? `Full week swap with ${swappedFromName} - you exchanged all your tasks` 
                : `Day swap from ${swappedFromName} for ${swapDay || 'this day'}`
              }
            </Text>
            {swapRequestId && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('SwapRequestDetails', { requestId: swapRequestId });
                }}
              >
                <Text style={[styles.viewSwapLink, { color: theme.primary }]}>View →</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        )}
        
        {renderAssignmentInfo(item)}
        
        {/* PROGRESS BAR - Show for both tabs when there are multiple items */}
        {totalCount > 1 && !isFullyCompleted && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount} slots completed • {earnedPoints}/{totalPoints} pts
            </Text>
          </View>
        )}
        
        {/* SINGLE ASSIGNMENT PROGRESS */}
        {totalCount === 1 && !isFullyCompleted && totalCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {completedCount === 0 ? 'Not completed yet' : 'Completed'}
            </Text>
          </View>
        )}
        
        {/* COMPLETE NOW BUTTON for My Tasks */}
        {isMyTasksView && !isFullyCompleted && validation.isSubmittableNow && (
          <TouchableOpacity onPress={() => handleCompleteNow(item)}>
            <LinearGradient colors={validation.willBePenalized ? [theme.primary, theme.primaryDark] : [theme.primary, theme.primaryDark]} style={styles.completeNowButton}>
              <View style={styles.completeNowContent}>
                <MaterialCommunityIcons name={validation.willBePenalized ? "timer-alert" : "check-circle"} size={20} color="white" />
                <Text style={styles.completeNowText}>
                  {validation.willBePenalized ? 'Submit Late' : 'Complete Now'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        <View style={styles.taskFooter}>
          <Text style={styles.taskCreator}>
            <MaterialCommunityIcons name="account" size={12} color={theme.textMuted} /> {item.creator?.fullName || 'Admin'}
          </Text>
          <Text style={styles.taskDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  ); 
};


  const renderContent = () => {
    let currentTasks = [];
    
    if (selectedTab === 'my') {
      currentTasks = groupedMyTasks.filter((task: any) => task.isDeleted !== true);
    } else {
      currentTasks = tasks.filter((task: any) => task.isDeleted !== true);
    }
    
    const showEmpty = !loading && currentTasks.length === 0;
    
    return (
      <FlatList
        data={currentTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {renderCreationDayBanner()}
            {renderTodaySection()}
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshTasks} colors={[theme.primary]} />
        }
        ListEmptyComponent={showEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name={selectedTab === 'my' ? "clipboard-text" : "clipboard-list"} size={64} color={theme.border} />
            <Text style={styles.emptyText}>
              {selectedTab === 'my' ? 'No tasks assigned to you' : 'No tasks yet'}
            </Text>
            {isAdmin && selectedTab === 'all' && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleCreateTask}>
                <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.emptyButtonGradient}>
                  <Text style={styles.emptyButtonText}>Create First Task</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 70 + insets.bottom }]}
      />
    );
  };

  // ===== BOTTOM TABS =====
  const renderBottomTabs = () => {
    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        style={[styles.bottomTab, { height: 70 + insets.bottom, paddingBottom: insets.bottom }]}
      >
        {isAdmin ? (
          <>
            <TouchableOpacity style={styles.tabButton} onPress={handleDashboardPress} activeOpacity={0.7}>
              <MaterialCommunityIcons name="view-dashboard" size={24} color={theme.textMuted} />
              <Text style={styles.tabText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={() => setSelectedTab('all')} activeOpacity={0.7}>
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color={selectedTab === 'all' ? theme.primary : theme.textMuted} />
              <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>All Tasks</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.tabButton} onPress={() => setSelectedTab('all')} activeOpacity={0.7}>
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color={selectedTab === 'all' ? theme.primary : theme.textMuted} />
              <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>All Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={() => setSelectedTab('my')} activeOpacity={0.7}>
              <MaterialCommunityIcons name="clipboard-check" size={24} color={selectedTab === 'my' ? theme.primary : theme.textMuted} />
              <Text style={[styles.tabText, selectedTab === 'my' && styles.activeTabText]}>My Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={handleDashboardPress} activeOpacity={0.7}>
              <MaterialCommunityIcons name="view-dashboard" size={24} color={theme.textMuted} />
              <Text style={styles.tabText}>Dashboard</Text>
            </TouchableOpacity>
          </>
        )}
      </LinearGradient>
    );
  };

  // ===== LOADING STATES =====
  if (loadingUser) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTasks()}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <ScreenWrapper noBottom={true} style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}

      {isAdmin && selectedTab === 'all' && rotationStatus && rotationStatus.totalTasks > 0 && (
        <TouchableOpacity style={styles.rotationBanner} onPress={handleViewRotationSchedule}>
          <LinearGradient
            colors={
              !rotationStatus.hasEnoughTasks 
                ? [theme.primaryLight, theme.primaryLight]
                : rotationStatus.totalTasks === rotationStatus.membersInRotation
                  ? [theme.primaryLight, theme.primaryLight]
                  : [theme.primaryLight, theme.primaryLight]
            }
            style={styles.rotationBannerGradient}
          >
            <MaterialCommunityIcons 
              name={
                !rotationStatus.hasEnoughTasks 
                  ? "alert" 
                  : rotationStatus.totalTasks === rotationStatus.membersInRotation
                    ? "check-circle"
                    : "information"
              } 
              size={20} 
              color={
                !rotationStatus.hasEnoughTasks 
                  ? theme.primary
                  : rotationStatus.totalTasks === rotationStatus.membersInRotation
                    ? theme.primary
                    : theme.primary
              } 
            />
            <View style={styles.rotationBannerText}>
              <Text style={[
                styles.rotationBannerTitle,
                !rotationStatus.hasEnoughTasks && styles.warningTitle,
                rotationStatus.totalTasks === rotationStatus.membersInRotation && styles.successTitle,
              ]}>
                {!rotationStatus.hasEnoughTasks 
                  ? '⚠️ Rotation Warning' 
                  : rotationStatus.totalTasks === rotationStatus.membersInRotation
                    ? '✅ Perfect Rotation'
                    : '⚠️ Rotation Imbalance'}
              </Text>
              <Text style={[
                styles.rotationBannerMessage,
                !rotationStatus.hasEnoughTasks && styles.warningMessage,
                rotationStatus.totalTasks === rotationStatus.membersInRotation && styles.successMessage,
              ]}>
                {!rotationStatus.hasEnoughTasks 
                  ? `You have ${rotationStatus.membersInRotation} members in rotation but only ${rotationStatus.totalTasks} recurring tasks. Need ${rotationStatus.tasksNeeded} more task${rotationStatus.tasksNeeded > 1 ? 's' : ''} for perfect rotation.`
                  : rotationStatus.totalTasks === rotationStatus.membersInRotation
                    ? `Perfect! ${rotationStatus.totalTasks} tasks for ${rotationStatus.membersInRotation} members in rotation - one task each.`
                    : `You have ${rotationStatus.totalTasks} tasks for ${rotationStatus.membersInRotation} members in rotation.`}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.primary} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {renderContent()}
      {!isAdmin && renderTodayFAB()}

      {isAdmin && selectedTab === 'all' && (
        <View style={styles.floatingButtonsContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('PendingVerifications', { groupId, groupName, userRole })}>
            <LinearGradient colors={[theme.error, theme.error]} style={[styles.floatingButton, styles.reviewButton]}>
              <MaterialCommunityIcons name="clipboard-check" size={22} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNavigateToAssignment}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={[styles.floatingButton, styles.assignButton]}>
              <MaterialCommunityIcons name="account-switch" size={22} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleCreateTask}>
            <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={[styles.floatingButton, styles.createButton]}>
              <MaterialCommunityIcons name="plus" size={28} color={theme.textMuted} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {renderBottomTabs()}

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        groupId={groupId}
        groupName={groupName}
        userRole={userRole}
        navigation={navigation}
        onNavigateToAssignment={handleNavigateToAssignment}
        onRefreshTasks={refreshTasks}
      />
    </ScreenWrapper>
  );
}