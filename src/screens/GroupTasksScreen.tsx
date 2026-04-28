// src/screens/GroupTasksScreen.tsx - COMPLETE FINAL VERSION WITH FIXED REFRESH

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
import { AssignmentService } from '../services/AssignmentService';
import { HelpGuideModal } from '../components/HelpGuideModal';

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
  const isRefreshingRef = useRef(false);
  const isAdmin = userRole === 'ADMIN';

  // ===== ALL STATE HOOKS FIRST =====
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>(isAdmin ? 'all' : 'my');
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
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);

  const [showHelpModal, setShowHelpModal] = useState(false);

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

  
const groupedMyTasks = useMemo(() => {
  if (selectedTab !== 'my') return [];
  
  const taskMap = new Map();
  
  myTasks.forEach((item: any) => {
    const taskId = item.id;
    
    if (!taskMap.has(taskId)) {
      const originalTask = tasks.find(t => t.id === taskId);
      const isDeletedTask = !originalTask && item.assignment?.isHistorical === true;
      
      taskMap.set(taskId, {
        id: taskId,
        title: originalTask?.title 
          || item.title 
          || item.taskTitle 
          || (isDeletedTask ? '🗑️ Deleted Task' : 'Unknown Task'),
        description: originalTask?.description || item.description,
        points: originalTask?.points || item.points || item.assignment?.points || 0,
        executionFrequency: originalTask?.executionFrequency || item.executionFrequency,
        timeSlots: originalTask?.timeSlots || item.timeSlots || [],
        selectedDays: originalTask?.selectedDays || item.selectedDays,
        dayOfWeek: originalTask?.dayOfWeek || item.dayOfWeek,
        isRecurring: originalTask?.isRecurring ?? item.isRecurring ?? true,
        category: originalTask?.category || item.category,
        rotationOrder: originalTask?.rotationOrder || item.rotationOrder,
        currentAssignee: originalTask?.currentAssignee || item.currentAssignee,
        lastAssignedAt: originalTask?.lastAssignedAt || item.lastAssignedAt,
        createdAt: originalTask?.createdAt || item.createdAt || new Date(),
        creator: originalTask?.creator || item.creator,
        userAssignment: item.assignment,
        verifiedCount: 0,
        rejectedCount: 0,
        missedCount: 0,
        pendingCount: 0,
        totalPoints: 0,
        earnedPoints: 0,
        rawAssignments: [] as any[],
        isDeleted: isDeletedTask,
        acquiredViaSwap: item.assignment?.acquiredViaSwap || false,
        swappedFromName: item.assignment?.swappedFromName || null,
        swapRequestId: item.assignment?.swapRequestId || null,
        swapScope: item.assignment?.swapScope || null,
        swapDay: item.assignment?.swapDay || null
      });
    }
     
    const taskData = taskMap.get(taskId);
    const assignment = item.assignment || item;
    const points = assignment.points || 0;
    
    taskData.rawAssignments.push(assignment);
    
    if (assignment.verified === true) {
  taskData.verifiedCount++;
  taskData.earnedPoints += points;
} 
else if (assignment.verified === false) {
  taskData.rejectedCount++;
} 
else if (assignment.expired === true || assignment.partiallyExpired === true) {
  taskData.missedCount++;
} 
else {
  taskData.pendingCount++;
}
    
    taskData.totalPoints += points;
  });
  
  const result = Array.from(taskMap.values()).map(task => {
    const totalRawSlots = task.rawAssignments.length;
    const effectiveTotal = totalRawSlots - task.missedCount - task.rejectedCount;
    const effectiveVerified = task.verifiedCount;
    const effectiveRejected = task.rejectedCount;
    const effectiveMissed = task.missedCount;
    
    const isFullyCompleted = effectiveTotal > 0 && effectiveVerified === effectiveTotal;
    const progressPercentage = effectiveTotal > 0 ? (effectiveVerified / effectiveTotal) * 100 : 0;
    
    const isSingleSlot = totalRawSlots === 1;
    
    let displayText = '';
    let statusEmoji = '';
    
    if (isSingleSlot) {
      if (effectiveVerified > 0) {
        statusEmoji = '✅';
        displayText = `Verified • ${task.earnedPoints}/${task.totalPoints} pts`;
      } else if (task.missedCount > 0) {
        statusEmoji = '❌';
        displayText = 'Missed';
      } else if (task.rejectedCount > 0) {
        statusEmoji = '❌';
        displayText = 'Rejected';
      } else if (task.pendingCount > 0) {
        statusEmoji = '⏳';
        displayText = 'Pending Verification';
      } else {
        statusEmoji = '⏳';
        displayText = 'Not Started';
      }
    } else {
      if (effectiveMissed > 0 && effectiveRejected > 0) {
        statusEmoji = '⚠️';
        displayText = `${effectiveVerified}/${effectiveTotal} verified • ${effectiveRejected} rejected • ${effectiveMissed} missed`;
      } else if (effectiveMissed > 0) {
        statusEmoji = '⚠️';
        displayText = `${effectiveVerified}/${effectiveTotal} verified • ${effectiveMissed} missed`;
      } else if (effectiveRejected > 0) {
        statusEmoji = '❌';
        displayText = `${effectiveVerified}/${effectiveTotal} verified • ${effectiveRejected} rejected`;
      } else if (task.pendingCount > 0 && effectiveVerified === 0) {
        statusEmoji = '⏳';
        displayText = `${effectiveVerified}/${effectiveTotal} verified • ${task.pendingCount} pending`;
      } else if (effectiveVerified === effectiveTotal && effectiveTotal > 0) {
        statusEmoji = '✅';
        displayText = `All ${effectiveTotal} slots verified • ${task.earnedPoints}/${task.totalPoints} pts`;
      } else {
        statusEmoji = '⭐';
        displayText = `${effectiveVerified}/${effectiveTotal} slots • ${task.earnedPoints}/${task.totalPoints} pts`;
      }
    }
    
    return {
      ...task,
      effectiveTotal,
      effectiveVerified,
      effectiveRejected,
      effectiveMissed,
      isFullyCompleted,
      progressPercentage,
      displayText,
      statusEmoji,
      isSingleSlot
    };
  });
  
  return result;
}, [selectedTab, myTasks, tasks]);


const groupedAllTasks = useMemo(() => {
  if (selectedTab !== 'all') return [];
  
  const taskMap = new Map();
  
  tasks.forEach((task: any) => {
    const taskId = task.id;
    
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, {
        id: taskId,
        title: task.title,
        description: task.description,
        points: task.points || 0,
        executionFrequency: task.executionFrequency,
        timeSlots: task.timeSlots || [],
        selectedDays: task.selectedDays,
        dayOfWeek: task.dayOfWeek,
        isRecurring: task.isRecurring,
        category: task.category,
        rotationOrder: task.rotationOrder,
        currentAssignee: task.currentAssignee,
        createdAt: task.createdAt,
        creator: task.creator,
        assignments: [] as any[],
        verifiedCount: 0,
        rejectedCount: 0,
        missedCount: 0,
        totalPoints: 0,
        earnedPoints: 0,
        rawAssignments: [] as any[],
        isDeleted: false
      });
    }
    
    const taskData = taskMap.get(taskId);
    
    if (task.assignments && task.assignments.length > 0) {
      task.assignments.forEach((assignment: any) => {
        taskData.rawAssignments.push(assignment);
        const points = assignment.points || task.points || 0;
        
        if (assignment.verified === true) {
          taskData.verifiedCount++;
          taskData.earnedPoints += points;
        } else if (assignment.verified === false) {
          taskData.rejectedCount++;
        }else if (assignment.expired === true || assignment.partiallyExpired === true) {
  taskData.missedCount++;
}
        
        taskData.totalPoints += points;
        taskData.assignments.push(assignment);
      });
    }
  });
  
  const result = Array.from(taskMap.values()).map(task => {
    const totalRawSlots = task.rawAssignments.length;
    const effectiveTotal = totalRawSlots - task.missedCount - task.rejectedCount;
    const effectiveVerified = task.verifiedCount;
    
    const isFullyCompleted = effectiveTotal > 0 && effectiveVerified === effectiveTotal;
    const progressPercentage = effectiveTotal > 0 ? (effectiveVerified / effectiveTotal) * 100 : 0;
    
    const isSingleSlot = totalRawSlots === 1;
    
    let displayText = '';
    
    if (isSingleSlot) {
      if (task.verifiedCount > 0) {
        displayText = `✅ Verified • ${task.earnedPoints}/${task.totalPoints} pts`;
      } else if (task.missedCount > 0) {
        displayText = `❌ Missed`;
      } else if (task.rejectedCount > 0) {
        displayText = `❌ Rejected`;
      } else if (task.rawAssignments.some((a: any) => a.photoUrl !== null && a.verified === null)) {
        displayText = `⏳ Pending Review`;
      } else {
        displayText = `⏳ Not Started`;
      }
    } else {
      if (task.missedCount > 0 && task.rejectedCount > 0) {
        displayText = `${effectiveVerified}/${effectiveTotal} verified • ${task.rejectedCount} rejected • ${task.missedCount} missed`;
      } else if (task.missedCount > 0) {
        displayText = `${effectiveVerified}/${effectiveTotal} verified • ${task.missedCount} missed`;
      } else if (task.rejectedCount > 0) {
        displayText = `${effectiveVerified}/${effectiveTotal} verified • ${task.rejectedCount} rejected`;
      } else {
        displayText = `${effectiveVerified}/${effectiveTotal} slots • ${task.earnedPoints}/${task.totalPoints} pts`;
      }
    }
    
    return {
      ...task,
      effectiveTotal,
      effectiveVerified,
      isFullyCompleted,
      progressPercentage,
      displayText,
      isSingleSlot
    };
  });
  
  return result;
}, [selectedTab, tasks]);

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

  const fetchPendingVerificationsCount = useCallback(async () => {
    if (!isAdmin) return;
    
    const hasToken = await checkToken();
    if (!hasToken) return;
    
    try {
      const result = await AssignmentService.getPendingVerifications(groupId, {
        limit: 1,
        offset: 0
      });
      
      if (result.success && result.data) {
        const count = result.data.total || 0;
        setPendingVerificationsCount(count);
        console.log(`📊 Pending verifications count: ${count}`);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  }, [groupId, isAdmin, checkToken]);

  useEffect(() => {
    if (route.params?.tab === 'my' && !isAdmin) {
      console.log('📱 [GroupTasks] Setting tab to "my" from navigation params');
      setSelectedTab('my');
    } else if (route.params?.tab === 'all' && isAdmin) {
      console.log('📱 [GroupTasks] Setting tab to "all" from navigation params');
      setSelectedTab('all');
    }
  }, [route.params?.tab, isAdmin]);

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

  // ===== FETCH TASKS - FIXED REFRESH LOGIC =====
  const fetchTasks = useCallback(async (isRefreshingParam = false) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      if (isRefreshingParam) {
        setRefreshing(false);
        isRefreshingRef.current = false;
      }
      return;
    }

    // Only show loading on initial load, not on refresh
    if (!isRefreshingParam && !initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const allTasksResult = await TaskService.getGroupTasks(groupId);
      
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
      } else {
        setError(allTasksResult.message || 'Failed to load tasks');
      }
      
      const myTasksResult = await TaskService.getMyTasks(groupId);
      
      if (myTasksResult.success && myTasksResult.tasks && isMounted.current) {
        const enhancedTasks = myTasksResult.tasks.map((task: any) => ({
          ...task,
          ...validateTaskTime(task),
          urgencyLevel: getTaskUrgency(task)
        }));
        setMyTasks(enhancedTasks);
        
        const todayTasks = findTodayAssignments(enhancedTasks);
        setTodayAssignments(todayTasks);
        setShowTodaySection(todayTasks.length > 0);
        setNextActiveTime(calculateNextActiveTime(todayTasks));
      }
      
    } catch (err: any) {
      if (isMounted.current) setError(err.message || 'Network error');
    } finally {
      if (isMounted.current) {
        setLoading(false);
        if (isRefreshingParam) {
          setRefreshing(false);
          isRefreshingRef.current = false;
        }
      }
    }
  }, [groupId, checkToken, analyzeTaskCreationDays, validateTaskTime, getTaskUrgency, findTodayAssignments, calculateNextActiveTime]);

  // ===== REFRESH TASKS - FIXED =====
  const refreshTasks = useCallback(() => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log('⏳ Refresh already in progress, skipping...');
      return;
    }
    
    console.log('🔄 Refreshing tasks...');
    isRefreshingRef.current = true;
    setRefreshing(true);
    fetchTasks(true);
  }, [fetchTasks]);

  // ===== SAFETY TIMEOUT FOR REFRESH =====
  useEffect(() => {
    if (refreshing) {
      const timeout = setTimeout(() => {
        if (refreshing) {
          console.log('⚠️ Refresh timeout - resetting refreshing state');
          setRefreshing(false);
          isRefreshingRef.current = false;
        }
      }, 15000); // 15 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [refreshing]);

  const handleViewTaskDetails = async (item: any) => {
    if (!await checkToken()) return;
    
    const isMyTasksView = selectedTab === 'my';
    const isAcquiredViaSwap = item.acquiredViaSwap === true;
    const swapScope = item.swapScope || item.assignment?.swapScope;
    const assignmentId = item.userAssignment?.id;
    
    if (isMyTasksView && isAcquiredViaSwap && swapScope === 'day' && assignmentId) {
      console.log('🔄 Day swap task detected, navigating to Assignment Details:', assignmentId);
      navigation.navigate('AssignmentDetails', { 
        assignmentId, 
        isAdmin: false,
        onVerified: refreshTasks
      });
      return;
    }
    
    console.log('📋 Navigating to Task Details:', item.id, 'swapScope:', swapScope);
    navigation.navigate('TaskDetails', { 
      taskId: item.id, 
      groupId, 
      userRole 
    });
  };

  useEffect(() => {
    if (groupId && !loadingUser && !initialLoadDone.current) {
      fetchTasks();
      fetchMembers();
      loadPendingForMe(groupId, true);
      fetchPendingVerificationsCount();
    }
  }, [groupId, loadingUser, fetchTasks, fetchMembers, loadPendingForMe, fetchPendingVerificationsCount]);

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
    const unsubscribe = navigation.addListener('focus', () => {
      if (isAdmin) {
        fetchPendingVerificationsCount();
      }
    });
    
    return unsubscribe;
  }, [navigation, isAdmin, fetchPendingVerificationsCount]);

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
    if (swapEvents.swapResponded) {
      refreshTasks();
      clearSwapResponded();
    }
  }, [swapEvents.swapResponded, refreshTasks, clearSwapResponded]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (groupId && !loadingUser) {
        console.log('🔄 Screen focused - refreshing swap count');
        loadPendingForMe(groupId, true);
        refreshTasks();
      }
    });
    
    return unsubscribe;
  }, [navigation, groupId, loadingUser, loadPendingForMe, refreshTasks]);

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

    let assigneeName = 'Unknown';
    let isAssignedToMe = false;
    let isFullyVerified = false;
    
    if (selectedTab === 'my') {
      if (task.userAssignment) {
        isAssignedToMe = true;
        assigneeName = 'You';
        isFullyVerified = task.isFullyCompleted || false;
      }
    } else { 
      const currentWeekAssignment = task.assignments?.find((a: any) => {
        const isCurrentWeek = a.rotationWeek === rotationStatus?.currentWeek;
        const isAssigned = a.userId === task.currentAssignee;
        return isCurrentWeek && isAssigned;
      }) || task.assignments?.[0];
       
      if (currentWeekAssignment) {
        assigneeName = currentWeekAssignment.user?.fullName || 'Unknown';
        isAssignedToMe = currentWeekAssignment.userId === currentUserId;
      } else if (task.currentAssignee) {
        const assignedMember = membersInRotation.find(m => m.userId === task.currentAssignee);
        if (assignedMember) {
          assigneeName = assignedMember.fullName;
          isAssignedToMe = assignedMember.userId === currentUserId;
        }
      }
    }
    
    if (!assigneeName && !task.currentAssignee) {
      return (
        <View style={styles.unassignedInfo}>
          <MaterialCommunityIcons name="account-question" size={16} color={theme.textMuted} />
          <Text style={styles.unassignedText}>Not assigned</Text>
        </View>
      );
    }

    const getIcon = () => {
      if (selectedTab === 'my' && isFullyVerified) return "check-circle";
      if (selectedTab === 'my') return "account";
      return isAssignedToMe ? "account" : "account-clock";
    };

    const getColor = () => {
      if (selectedTab === 'my' && isFullyVerified) return theme.primary;
      if (selectedTab === 'my') return theme.textSecondary;
      return isAssignedToMe ? theme.textSecondary : theme.textMuted;
    };

    const getStatusText = () => {
      if (selectedTab !== 'my') {
        return `Assigned to ${assigneeName}`;
      }
      if (isFullyVerified) return 'All slots verified ✅';
      return 'Assigned to you';
    };

    return (
      <View style={[
        styles.assignmentInfo,
        selectedTab === 'my' && isFullyVerified && styles.completedAssignment,
        selectedTab === 'my' && !isFullyVerified && styles.pendingAssignment,
        !isFullyVerified && isAssignedToMe && selectedTab === 'all' && styles.myAssignment
      ]}>
        <View style={styles.assignmentHeader}>
          <MaterialCommunityIcons name={getIcon()} size={16} color={getColor()} />
          <Text style={[styles.assignmentStatus, { color: getColor() }]}>
            {getStatusText()}
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
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
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
    
    const effectiveTotal = item.effectiveTotal || 0;
    const effectiveVerified = item.effectiveVerified || 0;
    const earnedPoints = item.earnedPoints || 0;
    const totalPoints = item.totalPoints || 0;
    const isFullyCompleted = item.isFullyCompleted || false;
    const progressPercentage = item.progressPercentage || 0;
    const displayText = item.displayText || '';
    const isSingleSlot = item.isSingleSlot || false;
    
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
                name={isFullyCompleted ? "check-circle" : "format-list-checks"} 
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
          
          {/* Progress Bar - ONLY for multi-slot tasks that are NOT fully completed */}
          {effectiveTotal > 1 && !isFullyCompleted && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {displayText}
              </Text>
            </View>
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
    let displayTasks = [];
    
    if (selectedTab === 'my') {
      currentTasks = groupedMyTasks.filter((task: any) => task.isDeleted !== true);
      displayTasks = currentTasks;
    } else {
      currentTasks = groupedAllTasks.filter((task: any) => task.isDeleted !== true);
      displayTasks = currentTasks;
    }
    
    const showEmpty = !loading && displayTasks.length === 0;
    
    return (
      <FlatList
        data={displayTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {renderCreationDayBanner()}
            {renderTodaySection()}
          </>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refreshTasks} 
            colors={[theme.primary]} 
            tintColor={theme.primary}
            progressBackgroundColor={theme.card}
          />
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

// ===== BOTTOM TABS - UPDATED WITH HELP TAB =====
const renderBottomTabs = () => {
  return (
    <>
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        style={[styles.bottomTab, { height: 70 + insets.bottom, paddingBottom: insets.bottom }]}
      >
        {isAdmin ? (
          // ADMIN: Dashboard + All Tasks + Help
          <>
            <TouchableOpacity style={styles.tabButton} onPress={handleDashboardPress} activeOpacity={0.7}>
              <MaterialCommunityIcons 
                name="view-dashboard" 
                size={24} 
                color={selectedTab === 'all' ? theme.primary : theme.primary} 
              />
              <Text style={styles.tabText}>Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tabButton} onPress={() => setSelectedTab('all')} activeOpacity={0.7}>
              <MaterialCommunityIcons 
                name="format-list-bulleted" 
                size={24} 
                color={selectedTab === 'all' ? theme.primary : theme.textMuted} 
              />
              <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>All Tasks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tabButton} onPress={() => setShowHelpModal(true)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="help-circle" size={24} color={theme.primary} />
              <Text style={styles.tabText}>Help</Text>
            </TouchableOpacity>
          </>
        ) : (
          // MEMBER: Dashboard + My Tasks + Help
          <>
            <TouchableOpacity style={styles.tabButton} onPress={handleDashboardPress} activeOpacity={0.7}>
              <MaterialCommunityIcons 
                name="view-dashboard" 
                size={24} 
                color={selectedTab === 'my' ? theme.primary : theme.primary} 
              />
              <Text style={styles.tabText}>Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tabButton} onPress={() => setSelectedTab('my')} activeOpacity={0.7}>
              <MaterialCommunityIcons 
                name="clipboard-check" 
                size={24} 
                color={selectedTab === 'my' ? theme.primary : theme.textMuted} 
              />
              <Text style={[styles.tabText, selectedTab === 'my' && styles.activeTabText]}>My Tasks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tabButton} onPress={() => setShowHelpModal(true)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="help-circle" size={24} color={theme.primary} />
              <Text style={styles.tabText}>Help</Text>
            </TouchableOpacity>
          </>
        )}
      </LinearGradient>
      
      <HelpGuideModal 
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        userRole={userRole}
      />
    </>
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
          <TouchableOpacity 
            onPress={() => navigation.navigate('PendingVerifications', { groupId, groupName, userRole })}
          >
            <LinearGradient colors={[theme.error, theme.error]} style={[styles.floatingButton, styles.reviewButton]}>
              <MaterialCommunityIcons name="clipboard-check" size={22} color="white" />
              {pendingVerificationsCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>
                    {pendingVerificationsCount > 99 ? '99+' : pendingVerificationsCount}
                  </Text>
                </View>
              )}
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