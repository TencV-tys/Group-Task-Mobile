// src/screens/GroupTasksScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { SettingsModal } from '../components/SettingsModal';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useRotationStatus } from '../hooks/useRotationStatus';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { styles } from '../styles/groupTasks.styles';

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
  const { groupId, groupName, userRole } = route.params || {};
  const insets = useSafeAreaInsets();
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);
  const isAdmin = userRole === 'ADMIN';

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

  const { status: rotationStatus, checkStatus } = useRotationStatus(groupId);
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();
  const { isConnected } = useRealtimeNotifications({ showAlerts: false });

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
    clearAssignmentVerified
  } = useRealtimeAssignments(groupId, currentUserId || '');

  const {
    events: swapEvents,
    clearSwapCreated
  } = useRealtimeSwapRequests(groupId, currentUserId || '');

  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      setAuthError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    }
  }, [authError]);

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
  }, [taskEvents.taskCreated]);

  useEffect(() => {
    if (taskEvents.taskUpdated) {
      refreshTasks();
      clearTaskUpdated();
    }
  }, [taskEvents.taskUpdated]);

  useEffect(() => {
    if (taskEvents.taskDeleted) {
      Alert.alert('🗑️ Task Deleted', `Task "${taskEvents.taskDeleted.taskTitle}" deleted`);
      refreshTasks();
      clearTaskDeleted();
    }
  }, [taskEvents.taskDeleted]);

  useEffect(() => {
    if (taskEvents.taskAssigned) {
      if (taskEvents.taskAssigned.assignedTo === currentUserId) {
        Alert.alert('📋 New Assignment', `You've been assigned: "${taskEvents.taskAssigned.taskTitle}"`);
      }
      refreshTasks();
      clearTaskAssigned();
    }
  }, [taskEvents.taskAssigned]);

  useEffect(() => {
    if (assignmentEvents.assignmentCompleted) {
      refreshTasks();
      clearAssignmentCompleted();
    }
  }, [assignmentEvents.assignmentCompleted]);

  useEffect(() => {
    if (assignmentEvents.assignmentVerified) {
      refreshTasks();
      clearAssignmentVerified();
    }
  }, [assignmentEvents.assignmentVerified]);

  useEffect(() => {
    if (swapEvents.swapCreated) {
      refreshTasks();
      clearSwapCreated();
    }
  }, [swapEvents.swapCreated]);

  useEffect(() => {
    if (groupId && userRole === 'ADMIN') checkStatus();
  }, [groupId, tasks.length]);

  useEffect(() => {
    if (groupId && !loadingUser && !initialLoadDone.current) {
      fetchTasks();
      loadPendingForMe(groupId);
    }
  }, [groupId, loadingUser]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (groupId && !loadingUser) refreshTasks();
    });
    return unsubscribe;
  }, [navigation, groupId, loadingUser]);

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
    
    taskList.forEach(task => {
      if (task.createdAt) {
        const dayName = new Date(task.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
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
    if (rotationStatus?.totalMembers) {
      setTasksNeeded(Math.max(0, rotationStatus.totalMembers - taskList.length));
    }
  }, [rotationStatus?.totalMembers]);

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

  const fetchTasks = async (isRefreshing = false) => {
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
        setRefreshing(false);
      }
    }
  };

  const refreshTasks = useCallback(() => fetchTasks(true), []);

  const handleViewRotationSchedule = () => {
    navigation.navigate('RotationSchedule', { groupId, groupName, userRole });
  };

  const handleCreateTask = async () => {
    if (!await checkToken()) return;
    if (!isAdmin) {
      Alert.alert('Restricted', 'Only admins can create tasks');
      return;
    }
    navigation.navigate('CreateTask', { groupId, groupName, onTaskCreated: refreshTasks });
  };

  const handleEditTask = async (task: any) => {
    if (!await checkToken()) return;
    if (!isAdmin) {
      Alert.alert('Restricted', 'Only admins can edit tasks');
      return;
    }
    navigation.navigate('UpdateTask', { task, groupId, groupName, onTaskUpdated: refreshTasks });
  };

  const handleViewTaskDetails = async (taskId: string) => {
    if (!await checkToken()) return;
    navigation.navigate('TaskDetails', { taskId, groupId, userRole });
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

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!await checkToken()) return;
    if (!isAdmin) {
      Alert.alert('Restricted', 'Only admins can delete tasks');
      return;
    }
    
    Alert.alert('Delete Task', `Delete "${taskTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          const result = await TaskService.deleteTask(taskId);
          if (result.success) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setMyTasks(prev => prev.filter(t => t.id !== taskId));
          } else {
            Alert.alert('Error', result.message);
          }
        }
      }
    ]);
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

  const renderAssignmentInfo = (task: any) => {
    const hasAssignment = task.userAssignment || task.assignments?.length > 0;
    if (!hasAssignment) {
      return (
        <View style={styles.unassignedInfo}>
          <MaterialCommunityIcons name="account-question" size={16} color="#868e96" />
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
      if (task.assignments?.length > 0) {
        currentAssignment = task.assignments.find((a: any) => a.userId === task.currentAssignee) || task.assignments[0];
        if (currentAssignment) {
          assigneeName = currentAssignment.user?.fullName || 'Unknown';
          isAssignedToMe = currentAssignment.userId === currentUserId;
          isCompleted = currentAssignment.completed || false;
        }
      } else if (task.userAssignment) {
        currentAssignment = task.userAssignment;
        assigneeName = task.userAssignment.user?.fullName || 'Unknown';
        isAssignedToMe = task.userAssignment.userId === currentUserId;
        isCompleted = task.userAssignment.completed || false;
      }
    }
    
    if (!currentAssignment) return null;

    const getIcon = () => {
      if (isCompleted) return "check-circle";
      if (selectedTab === 'my') return "account";
      return isAssignedToMe ? "account" : "account-clock";
    };

    const getColor = () => {
      if (isCompleted) return "#2b8a3e";
      if (selectedTab === 'my') return "#495057";
      return isAssignedToMe ? "#495057" : "#868e96";
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
    
    return (
      <LinearGradient
        colors={!hasMixedCreationDays ? ['#d3f9d8', '#b2f2bb'] : ['#fff3bf', '#ffec99']}
        style={styles.creationDayBanner}
      >
        <View style={styles.bannerHeader}>
          <MaterialCommunityIcons 
            name={!hasMixedCreationDays ? "calendar-check" : "calendar-alert"} 
            size={24} 
            color={!hasMixedCreationDays ? "#2b8a3e" : "#e67700"} 
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
            <MaterialCommunityIcons name="format-list-checks" size={16} color="#495057" />
            <Text style={styles.statText}>{tasks.length} task{tasks.length > 1 ? 's' : ''} created</Text>
          </View>
          
          <View style={styles.statRow}>
            <MaterialCommunityIcons 
              name={isTodayBaseline ? "thumb-up" : "calendar-alert"} 
              size={16} 
              color={isTodayBaseline ? "#2b8a3e" : "#e67700"} 
            />
            <Text style={[styles.statText, isTodayBaseline ? styles.successText : styles.warningText]}>
              {isTodayBaseline 
                ? `✓ Today (${today}) matches creation day` 
                : `ℹ️ Today is ${today} - tasks should be on ${baselineCreationDay}s`}
            </Text>
          </View>

          {tasksNeeded > 0 && (
            <View style={styles.tasksNeededBadge}>
              <MaterialCommunityIcons name="alert" size={14} color="#e67700" />
              <Text style={styles.tasksNeededText}>
                Need {tasksNeeded} more task{tasksNeeded > 1 ? 's' : ''} for perfect rotation
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  };

  const renderHeader = () => (
    <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>{groupName || 'Tasks'}</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#2b8a3e' : '#fa5252' }]} />
          <Text style={styles.connectionText}>{isConnected ? 'Live' : 'Offline'}</Text>
        </View>
        
        {isAdmin && rotationStatus && !rotationStatus.hasEnoughTasks && rotationStatus.totalTasks > 0 && (
          <TouchableOpacity style={styles.rotationWarningBadge} onPress={handleViewRotationSchedule}>
            <MaterialCommunityIcons name="alert" size={14} color="#e67700" />
            <Text style={styles.rotationWarningText}>
              Need {rotationStatus.tasksNeeded} more task{rotationStatus.tasksNeeded > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.headerRight}>
        {!isAdmin && (
          <TouchableOpacity style={styles.swapButton} onPress={handleNavigateToSwapRequests}>
            <MaterialCommunityIcons name="swap-horizontal" size={22} color="#2b8a3e" />
            {totalPendingForMe > 0 && (
              <View style={styles.swapBadge}>
                <Text style={styles.swapBadgeText}>{totalPendingForMe}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
          <MaterialCommunityIcons name="cog" size={22} color="#2b8a3e" />
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
        colors={hasUrgent ? ['#fff5f5', '#ffe3e3'] : ['#fff3bf', '#ffec99']}
        style={[styles.todaySection, hasUrgent ? styles.urgentSection : styles.warningSection]}
      >
        <View style={styles.todaySectionHeader}>
          <View style={styles.todaySectionTitleContainer}>
            <MaterialCommunityIcons 
              name={hasUrgent ? "timer-alert" : "clock-alert"} 
              size={20} 
              color={hasUrgent ? "#fa5252" : "#e67700"} 
            />
            <Text style={[styles.todaySectionTitle, { color: hasUrgent ? "#fa5252" : "#e67700" }]}>
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
                         task.urgencyLevel === 'urgent' ? "#fa5252" : "#e67700"} 
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
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
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
      colors: ['#2b8a3e', '#1e6b2c'] as [string, string],
      icon: "check-circle",
      title: "Ready to Submit!",
      message: `${todayAssignments.filter(t => t.isSubmittableNow).length} can submit now`
    };
    
    if (hasLate) {
      config = { colors: ['#e67700', '#cc5f00'], icon: "timer-alert", title: "⚠️ LATE SUBMISSIONS", message: `${todayAssignments.filter(t => t.urgencyLevel === 'late').length} tasks are late` };
    } else if (hasUrgent) {
      config = { colors: ['#fa5252', '#e03131'], icon: "timer", title: "⏰ URGENT", message: `${todayAssignments.filter(t => t.urgencyLevel === 'urgent').length} tasks ending soon` };
    } else if (hasWarning) {
      config = { colors: ['#e67700', '#cc5f00'], icon: "clock-alert", title: "⏳ Due Soon", message: `${todayAssignments.filter(t => t.urgencyLevel === 'warning').length} tasks due in <2hrs` };
    } else if (!hasSubmittableNow) {
      config = { colors: ['#868e96', '#6c757d'], icon: "clock-start", title: "Today's Tasks", message: `${todayAssignments.length} tasks due today` };
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
    const isCompleted = item.assignment?.completed || item.userAssignment?.completed;
    const urgencyLevel = item.urgencyLevel || 'none';
    const validation = validateTaskTime(item);
    
    const getGradientColors = (): [string, string] => {
      if (isCompleted) return ['#f8f9fa', '#e9ecef'];
      if (isMyTasksView && validation.isSubmittableNow) {
        return validation.willBePenalized ? ['#fff3bf', '#ffec99'] : ['#d3f9d8', '#b2f2bb'];
      }
      return ['#ffffff', '#f8f9fa'];
    };

    return (
      <TouchableOpacity
        onPress={() => handleViewTaskDetails(item.id)}
        onLongPress={() => !isMyTasksView && isAdmin && (() => {
          Alert.alert('Task Options', `"${item.title}"`, [
            { text: 'Edit', onPress: () => handleEditTask(item) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteTask(item.id, item.title) },
            { text: 'View Details', onPress: () => handleViewTaskDetails(item.id) },
            { text: 'Cancel', style: 'cancel' }
          ]);
        })}
      >
        <LinearGradient colors={getGradientColors()} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <LinearGradient colors={isCompleted ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']} style={styles.taskIcon}>
              <MaterialCommunityIcons name={isCompleted ? "check" : "format-list-checks"} size={20} color={isCompleted ? "white" : "#495057"} />
            </LinearGradient>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, isCompleted && styles.completedTaskTitle]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.taskMeta}>
                <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.pointsBadge}>
                  <MaterialCommunityIcons name="star" size={12} color="#e67700" />
                  <Text style={styles.taskPoints}>{item.points} pts</Text>
                </LinearGradient>
              </View>
            </View>
          </View>
          
          {renderAssignmentInfo(item)}
          
          {isMyTasksView && !isCompleted && validation.isSubmittableNow && (
            <TouchableOpacity onPress={() => handleCompleteNow(item)}>
              <LinearGradient colors={validation.willBePenalized ? ['#e67700', '#cc5f00'] : ['#2b8a3e', '#1e6b2c']} style={styles.completeNowButton}>
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
              <MaterialCommunityIcons name="account" size={12} color="#868e96" /> {item.creator?.fullName || 'Admin'}
            </Text>
            <Text style={styles.taskDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    const currentTasks = selectedTab === 'my' ? myTasks : tasks;
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
          <RefreshControl refreshing={refreshing} onRefresh={refreshTasks} colors={['#2b8a3e']} />
        }
        ListEmptyComponent={showEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name={selectedTab === 'my' ? "clipboard-text" : "clipboard-list"} size={64} color="#dee2e6" />
            <Text style={styles.emptyText}>
              {selectedTab === 'my' ? 'No tasks assigned to you' : 'No tasks yet'}
            </Text>
            {isAdmin && selectedTab === 'all' && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleCreateTask}>
                <LinearGradient colors={['#2b8a3e', '#1e6b2c']} style={styles.emptyButtonGradient}>
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

  
 // ===== BOTTOM TABS - ROLE BASED (FIXED) =====
const renderBottomTabs = () => {
  return (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      style={[styles.bottomTab, { height: 70 + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {isAdmin ? (
        // ADMIN: Dashboard (left) | All Tasks (right)
        <>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={handleDashboardPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="view-dashboard" 
              size={24} 
              color="#8e8e93" // Always gray since it's navigation, not a tab
            />
            <Text style={styles.tabText}>
              Dashboard
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setSelectedTab('all')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="format-list-bulleted" 
              size={24} 
              color={selectedTab === 'all' ? '#2b8a3e' : '#8e8e93'} 
            />
            <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>
              All Tasks
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        // MEMBER: All Tasks | My Tasks | Dashboard
        <>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setSelectedTab('all')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="format-list-bulleted" 
              size={24} 
              color={selectedTab === 'all' ? '#2b8a3e' : '#8e8e93'} 
            />
            <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>
              All Tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setSelectedTab('my')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="clipboard-check" 
              size={24} 
              color={selectedTab === 'my' ? '#2b8a3e' : '#8e8e93'} 
            />
            <Text style={[styles.tabText, selectedTab === 'my' && styles.activeTabText]}>
              My Tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={handleDashboardPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="view-dashboard" 
              size={24} 
              color="#8e8e93" // Always gray since it's navigation
            />
            <Text style={styles.tabText}>
              Dashboard
            </Text>
          </TouchableOpacity>
        </>
      )}
    </LinearGradient>
  );
};

  if (loadingUser) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTasks()}>
            <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noBottom={true} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      {isAdmin && selectedTab === 'all' && rotationStatus && rotationStatus.totalTasks > 0 && (
        <TouchableOpacity style={styles.rotationBanner} onPress={handleViewRotationSchedule}>
          <LinearGradient
            colors={
              !rotationStatus.hasEnoughTasks 
                ? ['#fff3bf', '#ffec99']
                : rotationStatus.totalTasks === rotationStatus.totalMembers
                  ? ['#d3f9d8', '#b2f2bb']
                  : ['#e7f5ff', '#d0ebff']
            }
            style={styles.rotationBannerGradient}
          >
            <MaterialCommunityIcons 
              name={
                !rotationStatus.hasEnoughTasks 
                  ? "alert" 
                  : rotationStatus.totalTasks === rotationStatus.totalMembers
                    ? "check-circle"
                    : "information"
              } 
              size={20} 
              color={
                !rotationStatus.hasEnoughTasks 
                  ? "#e67700" 
                  : rotationStatus.totalTasks === rotationStatus.totalMembers
                    ? "#2b8a3e"
                    : "#2b8a3e"
              } 
            />
            <View style={styles.rotationBannerText}>
              <Text style={[
                styles.rotationBannerTitle,
                !rotationStatus.hasEnoughTasks && styles.warningTitle,
                rotationStatus.totalTasks === rotationStatus.totalMembers && styles.successTitle,
              ]}>
                {!rotationStatus.hasEnoughTasks 
                  ? '⚠️ Rotation Warning' 
                  : rotationStatus.totalTasks === rotationStatus.totalMembers
                    ? '✅ Perfect Rotation'
                    : '⚠️ Rotation Imbalance'}
              </Text>
              <Text style={[
                styles.rotationBannerMessage,
                !rotationStatus.hasEnoughTasks && styles.warningMessage,
                rotationStatus.totalTasks === rotationStatus.totalMembers && styles.successMessage,
              ]}>
                {!rotationStatus.hasEnoughTasks 
                  ? `You have ${rotationStatus.totalMembers} members but only ${rotationStatus.totalTasks} recurring tasks. Need ${rotationStatus.tasksNeeded} more task${rotationStatus.tasksNeeded > 1 ? 's' : ''} for perfect rotation.`
                  : rotationStatus.totalTasks === rotationStatus.totalMembers
                    ? `Perfect! ${rotationStatus.totalTasks} tasks for ${rotationStatus.totalMembers} members - one task each.`
                    : `You have ${rotationStatus.totalTasks} tasks for ${rotationStatus.totalMembers} members.`}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#2b8a3e" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {renderContent()}
      {!isAdmin && renderTodayFAB()}

      {isAdmin && selectedTab === 'all' && (
        <View style={styles.floatingButtonsContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('PendingVerifications', { groupId, groupName, userRole })}>
            <LinearGradient colors={['#fa5252', '#e03131']} style={[styles.floatingButton, styles.reviewButton]}>
              <MaterialCommunityIcons name="clipboard-check" size={22} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNavigateToAssignment}>
            <LinearGradient colors={['#2b8a3e', '#1e6b2c']} style={[styles.floatingButton, styles.assignButton]}>
              <MaterialCommunityIcons name="account-switch" size={22} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleCreateTask}>
            <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={[styles.floatingButton, styles.createButton]}>
              <MaterialCommunityIcons name="plus" size={28} color="#495057" />
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