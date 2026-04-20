// src/screens/MemberDashboardScreen.tsx - UPDATED with PHT time conversion

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text, 
  ScrollView,
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { TaskService } from '../services/TaskService';
import { GroupActivityService } from '../services/GroupActivityService';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { SettingsModal } from '../components/SettingsModal'; 
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { makeMemberDashboardStyles } from '../styles/memberDashboard.styles';
import { API_BASE_URL } from '../config/api';

// ✅ Helper function to convert 24h time to 12h AM/PM format
const formatTo12Hour = (time24: string) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes?.toString().padStart(2, '0') || '00';
  return `${hours12}:${minutesStr} ${period}`;
};

// ✅ Helper to convert UTC date to PHT and format time slot
const formatTimeSlotToPHT = (timeSlot: any) => {
  if (!timeSlot) return '';
  return `${formatTo12Hour(timeSlot.startTime)} - ${formatTo12Hour(timeSlot.endTime)}`;
};

export const MemberDashboardScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const styles = makeMemberDashboardStyles(theme);
  const { groupId, groupName } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [points, setPoints] = useState({ thisWeek: 0, total: 0 });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [mySwapRequestsCount, setMySwapRequestsCount] = useState(0);
  const [pendingForMeCount, setPendingForMeCount] = useState(0);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);
  
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();

  console.log('🏠 [MemberDashboard] Component mounted with params:', { groupId, groupName });
  console.log('🏠 [MemberDashboard] Current userId:', currentUserId);
  console.log('🏠 [MemberDashboard] Current mySwapRequestsCount:', mySwapRequestsCount);
  console.log('🏠 [MemberDashboard] Current pendingForMeCount:', pendingForMeCount);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user) {
          setCurrentUserId(user.id);
          console.log('👤 [MemberDashboard] Current user ID set:', user.id);
          await fetchMySwapRequestsCount();
          await fetchPendingForMeCount();
        } else {
          console.log('⚠️ [MemberDashboard] No user found');
        }
      } catch (error) {
        console.error('❌ [MemberDashboard] Error getting user ID:', error);
      }
    };
    getUserId();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchMySwapRequestsCount = useCallback(async () => {
    if (!currentUserId) return;
    
    setLoadingSwaps(true);
    try {
      const headers = await TokenUtils.getAuthHeaders(false);
      const response = await fetch(`${API_BASE_URL}/api/swap-requests/my-requests?limit=100`, { headers });
      const data = await response.json();
      
      if (data.success && data.data?.requests) {
        const pendingCount = data.data.requests.filter((req: any) => req.status === 'PENDING').length;
        setMySwapRequestsCount(pendingCount);
      } else {
        setMySwapRequestsCount(0);
      }
    } catch (error) {
      console.error('❌ [MemberDashboard] Error fetching my swap requests:', error);
      setMySwapRequestsCount(0);
    } finally {
      setLoadingSwaps(false);
    }
  }, [currentUserId]);

  const fetchPendingForMeCount = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const headers = await TokenUtils.getAuthHeaders(false);
      const response = await fetch(`${API_BASE_URL}/api/swap-requests/pending-for-me?limit=100`, { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        const pendingCount = data.data.total || data.data.requests?.length || 0;
        setPendingForMeCount(pendingCount);
      } else {
        setPendingForMeCount(0);
      }
    } catch (error) {
      console.error('❌ Error fetching pending for me:', error);
      setPendingForMeCount(0);
    }
  }, [currentUserId]);

  useEffect(() => {
    console.log('🔄 [MemberDashboard] mySwapRequestsCount changed to:', mySwapRequestsCount);
  }, [mySwapRequestsCount]);
  
  useEffect(() => {
    console.log('🔄 [MemberDashboard] pendingForMeCount changed to:', pendingForMeCount);
  }, [pendingForMeCount]);

  const { events: taskEvents, clearRotationCompleted } = useRealtimeTasks(groupId);
  const { events: assignmentEvents } = useRealtimeAssignments(groupId, currentUserId || '');
  const { events: swapEvents } = useRealtimeSwapRequests(groupId, currentUserId || '');

  useEffect(() => {
    if (taskEvents.rotationCompleted) {
      const myNewTasks = taskEvents.rotationCompleted.rotatedTasks?.filter(
        (task: any) => task.newAssignee === currentUserId
      ) || [];
      
      Alert.alert(
        '🔄 New Week Started!',
        `Week ${taskEvents.rotationCompleted.newWeek} has begun in ${groupName}\n\nYou have ${myNewTasks.length} new task(s) assigned.`,
        [
          { 
            text: 'View My Tasks', 
            onPress: () => {
              navigation.navigate('GroupTasks', { groupId, groupName, userRole: 'MEMBER', tab: 'my' });
              clearRotationCompleted();
            }
          },
          { text: 'OK', onPress: () => clearRotationCompleted() }
        ]
      );
      
      refreshDashboardData();
    }
  }, [taskEvents.rotationCompleted]);

  useEffect(() => {
    if (taskEvents.taskCreated || taskEvents.taskUpdated || taskEvents.taskDeleted || taskEvents.taskAssigned) {
      refreshDashboardData();
    }
  }, [taskEvents.taskCreated, taskEvents.taskUpdated, taskEvents.taskDeleted, taskEvents.taskAssigned]);

  useEffect(() => {
    if (assignmentEvents.assignmentCompleted || assignmentEvents.assignmentVerified || assignmentEvents.assignmentPendingVerification) {
      refreshDashboardData();
    }
  }, [assignmentEvents.assignmentCompleted, assignmentEvents.assignmentVerified, assignmentEvents.assignmentPendingVerification]);

  useEffect(() => {
    if (swapEvents.swapCreated || swapEvents.swapResponded) {
      refreshDashboardData();
      fetchMySwapRequestsCount();
      fetchPendingForMeCount();
    }
  }, [swapEvents.swapCreated, swapEvents.swapResponded]);

  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if ([
        'TASK_ASSIGNED', 'SUBMISSION_VERIFIED', 'SUBMISSION_REJECTED',
        'POINTS_EARNED', 'SWAP_ACCEPTED', 'SWAP_RESPONDED',
        'LATE_SUBMISSION', 'POINT_DEDUCTION'
      ].includes(notification.type)) {
        refreshDashboardData();
        if (notification.type === 'SWAP_ACCEPTED' || notification.type === 'SWAP_RESPONDED') {
          fetchMySwapRequestsCount();
          fetchPendingForMeCount();
        }
      }
    },
    showAlerts: true
  });

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        loadDashboardData();
      }
      if (currentUserId) {
        fetchMySwapRequestsCount();
        fetchPendingForMeCount();
      }
    }, [groupId, currentUserId])
  );

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => { setAuthError(false); navigation.navigate('Login'); } }
      ]);
    }
  }, [authError, navigation]);

  const loadDashboardData = async (isRefreshing = false) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else if (!initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const dashboardResult = await GroupActivityService.getMemberDashboard(groupId);
      
      if (dashboardResult.success && isMounted.current) {
        setDashboardData(dashboardResult.data);
        setStats(dashboardResult.data.stats);
        setPoints({
          thisWeek: dashboardResult.data.stats.pointsThisWeek || 0,
          total: dashboardResult.data.stats.totalPoints || 0
        });
        
        const allTasks = [
          ...(dashboardResult.data.tasks?.dueToday || []),
          ...(dashboardResult.data.tasks?.upcoming || [])
        ];
        setMyTasks(allTasks);
        initialLoadDone.current = true;
      } else {
        const tasksResult = await TaskService.getMyTasks(groupId);
        if (tasksResult.success && isMounted.current) {
          setMyTasks(tasksResult.tasks || []);
          
          const thisWeek = tasksResult.tasks
            ?.filter((t: any) => {
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return t.assignment?.completed && new Date(t.assignment.completedAt) > weekAgo;
            })
            .reduce((sum: number, t: any) => sum + (t.assignment?.points || 0), 0);

          const total = tasksResult.tasks
            ?.filter((t: any) => t.assignment?.completed)
            .reduce((sum: number, t: any) => sum + (t.assignment?.points || 0), 0);

          setPoints({ thisWeek: thisWeek || 0, total: total || 0 });
        }

        const statsResult = await TaskService.getTaskStatistics(groupId);
        if (statsResult.success && isMounted.current) {
          setStats(statsResult.statistics);
        }
      }

      await loadPendingForMe(groupId);
      
      if (currentUserId) {
        await fetchMySwapRequestsCount();
        await fetchPendingForMeCount();
      }

    } catch (err: any) {
      console.error('❌ [MemberDashboard] Error loading dashboard:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      if (isMounted.current) { 
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const refreshDashboardData = useCallback(() => {
    loadDashboardData(true);
  }, []);

  const handleRefresh = () => {
    refreshDashboardData();
  };

  const handleSettingsPress = () => {
    setShowSettingsModal(true);
  };

  const dueTodayTasks = dashboardData?.tasks?.dueToday || [];
  const upcomingTasks = dashboardData?.tasks?.upcoming || [];
  const allPendingTasks = [...dueTodayTasks, ...upcomingTasks];
  const completedTasks = dashboardData?.stats?.completedTasks || myTasks.filter(t => t.assignment?.completed).length;
  
  let tasksDueToday: any[] = [];
  if (dashboardData?.tasks?.dueToday) {
    tasksDueToday = dashboardData.tasks.dueToday;
  } else {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    tasksDueToday = myTasks.filter(t => {
      if (t.assignment?.completed) return false;
      const dueDate = new Date(t.assignment?.dueDate);
      return dueDate >= startOfDay && dueDate <= endOfDay;
    });
  }

  const StatCard = ({ title, value, icon, color = theme.primary, subtitle, onPress, navigateTo, navigationParams }: any) => {
    const handlePress = () => {
      if (onPress) {
        onPress();
      } else if (navigateTo) {
        navigation.navigate(navigateTo, navigationParams || { groupId, groupName });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={!navigateTo && !onPress}
      >
        <View style={styles.statHeader}>
          <LinearGradient
            colors={[`${color}20`, `${color}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statIconContainer, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name={icon} size={24} color={color} />
          </LinearGradient>
          <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        </View>
        <Text style={[styles.statTitle, { color: theme.textMuted }]}>{title}</Text>
        {subtitle && <Text style={[styles.statSubtitle, { color: theme.textPlaceholder }]}>{subtitle}</Text>}
        {(navigateTo || onPress) && (
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textMuted} style={{ position: 'absolute', bottom: 12, right: 12 }} />
        )}
      </TouchableOpacity>
    );
  };

  // ✅ UPDATED TaskCard with PHT time conversion
  const TaskCard = ({ task }: { task: any }) => {
    const isCompleted = task.completed || task.assignment?.completed;
    const isDueToday = task.isDueToday || task.assignment?.isDueToday;
    const dueDate = new Date(task.dueDate || task.assignment?.dueDate);
    const now = new Date();
    const isOverdue = !isCompleted && dueDate < now;
    
    // Get time slot and convert to PHT
    const timeSlot = task.timeSlot || task.assignment?.timeSlot;
    const timeSlotDisplay = timeSlot ? formatTimeSlotToPHT(timeSlot) : '';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('AssignmentDetails', { assignmentId: task.id || task.assignment?.id, isAdmin: false })}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isCompleted ? [theme.bgSecondary, theme.bgTertiary] : [theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.taskCard, { borderColor: theme.border }]}
        >
          <View style={styles.taskHeader}>
            <LinearGradient
              colors={isCompleted ? [theme.textMuted, theme.textMuted] : [theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskIcon}
            >
              <MaterialCommunityIcons name={isCompleted ? "check" : "format-list-checks"} size={20} color="#fff" />
            </LinearGradient>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, isCompleted && styles.completedTaskTitle, { color: isCompleted ? theme.textMuted : theme.text }]} numberOfLines={1}>
                {task.title || task.taskTitle}
              </Text>
              <View style={styles.taskMeta}>
                <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pointsBadge}>
                  <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
                  <Text style={[styles.pointsText, { color: theme.primary }]}>{task.points || task.assignment?.points || 0} pts</Text>
                </LinearGradient>
                {isDueToday && !isCompleted && (
                  <LinearGradient colors={[theme.error, theme.error]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dueBadge}>
                    <Text style={styles.dueBadgeText}>Due Today</Text>
                  </LinearGradient>
                )}
                {isOverdue && !isCompleted && (
                  <LinearGradient colors={[theme.primary, theme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dueBadge}>
                    <Text style={styles.dueBadgeText}>Overdue</Text>
                  </LinearGradient>
                )}
              </View>
            </View>
          </View>
          {timeSlotDisplay && (
            <View style={[styles.timeSlotContainer, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.timeSlotText, { color: theme.textSecondary }]}>
                {timeSlotDisplay}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>My Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading dashboard...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>My Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboardData()}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{groupName}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleRefresh} style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="refresh" size={22} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSettingsPress} style={[styles.settingsButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="cog" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Card */}
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Your Dashboard</Text>
            <Text style={styles.welcomeSubtitle}>Track your progress and upcoming tasks</Text>
          </View>
          <MaterialCommunityIcons name="view-dashboard" size={48} color="rgba(255,255,255,0.2)" />
        </LinearGradient>

        {/* Points Overview */}
        <View style={styles.pointsContainer}>
          <LinearGradient colors={[theme.card, theme.bgSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.pointsCard, { borderColor: theme.border }]}>
            <Text style={[styles.pointsLabel, { color: theme.textMuted }]}>This Week</Text>
            <Text style={[styles.pointsValue, { color: theme.primary }]}>{points.thisWeek}</Text>
            <Text style={[styles.pointsSubtext, { color: theme.textPlaceholder }]}>points earned</Text>
          </LinearGradient>
          <LinearGradient colors={[theme.card, theme.bgSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.pointsCard, { borderColor: theme.border }]}>
            <Text style={[styles.pointsLabel, { color: theme.textMuted }]}>Total</Text>
            <Text style={[styles.pointsValue, { color: theme.primary }]}>{points.total}</Text>
            <Text style={[styles.pointsSubtext, { color: theme.textPlaceholder }]}>lifetime points</Text>
          </LinearGradient>
        </View>

        {/* Progress Bar */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.progressCard, { borderColor: theme.border }]}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.textSecondary }]}>Your Completion Rate</Text>
            <Text style={[styles.progressPercentage, { color: theme.primary }]}>
              {Math.round((points.total / (dashboardData?.stats?.totalPointsPossible || 1)) * 100)}%
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: theme.bgTertiary }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, Math.round((points.total / (dashboardData?.stats?.totalPointsPossible || 1)) * 100))}%`,
                  backgroundColor: theme.primary
                }
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <Text style={[styles.progressStatsText, { color: theme.textMuted }]}>
              {points.total} of {dashboardData?.stats?.totalPointsPossible || 0} points earned
            </Text>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Pending Tasks" 
            value={allPendingTasks.length}
            icon="clock-outline"
            color={theme.primary}
            navigateTo="GroupTasks"
            navigationParams={{ groupId, groupName, userRole: 'MEMBER', tab: 'my' }}
          />
          <StatCard 
            title="Completed"
            value={typeof completedTasks === 'number' ? completedTasks : completedTasks.length}
            icon="check-circle"
            color={theme.primary}
            navigateTo="TaskCompletionHistory"
            navigationParams={{ groupId, groupName, userRole: 'MEMBER' }}
          />
          <StatCard
            title="Due Today"
            value={tasksDueToday.length}
            icon="calendar-today"
            color={theme.error}
            navigateTo="TodayAssignments"
            navigationParams={{ groupId, groupName }}
          />
          <StatCard
            title="My Swaps"
            value={mySwapRequestsCount}
            icon="swap-horizontal"
            color={theme.primary}
            navigateTo="MySwapRequests"
            navigationParams={{ groupId, groupName }}
          />
          <StatCard
            title="Requests for You"
            value={pendingForMeCount}
            icon="bell-ring-outline"
            color={theme.error}
            navigateTo="PendingSwapRequests"
            navigationParams={{ groupId, groupName }}
          />
          <StatCard
            title="My Neglected"
            value={stats?.myNeglectedCount || 0}
            icon="timer-off"
            color={theme.error}
            navigateTo="NeglectedTasks"
            navigationParams={{ groupId, groupName, userRole: 'MEMBER' }}
          />
        </View>

        {/* Today's Tasks */}
        {tasksDueToday.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Due Today</Text>
              {tasksDueToday.length > 2 && (
                <TouchableOpacity onPress={() => navigation.navigate('TodayAssignments', { groupId, groupName })}>
                  <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {tasksDueToday.slice(0, 2).map((task: any) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Tasks</Text>
            {upcomingTasks.slice(0, 3).map((task: any) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </>
        )}
        
        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('MySwapRequests')}
          >
            <LinearGradient colors={[theme.primary, theme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
              <MaterialCommunityIcons name="swap-horizontal" size={24} color="#fff" />
              <Text style={styles.actionText}>My Swaps</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('PendingSwapRequests')}
          >
            <LinearGradient colors={[theme.error, theme.error]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
              <MaterialCommunityIcons name="bell-ring" size={24} color="#fff" />
              <Text style={styles.actionText}>Pending Requests</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('MySubmissions', { groupId, groupName, userRole: 'MEMBER' })}
          >
            <LinearGradient colors={[theme.primary, theme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
              <MaterialCommunityIcons name="clipboard-list" size={24} color="#fff" />
              <Text style={styles.actionText}>My Submissions</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('TaskCompletionHistory', { groupId, groupName, userRole: 'MEMBER' })}
          >
            <LinearGradient colors={[theme.textSecondary, theme.textMuted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
              <MaterialCommunityIcons name="history" size={24} color="#fff" />
              <Text style={styles.actionText}>History</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('RotationSchedule', { groupId, groupName, userRole: 'MEMBER' })}
          >
            <LinearGradient colors={[theme.textSecondary, theme.textMuted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
              <MaterialCommunityIcons name="calendar-sync" size={24} color="#fff" />
              <Text style={styles.actionText}>Schedule</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('FullLeaderboard', { groupId, groupName })}
          >
            <LinearGradient colors={[theme.textSecondary, theme.textMuted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
              <MaterialCommunityIcons name="podium" size={24} color="#fff" />
              <Text style={styles.actionText}>Leaderboard</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('DetailedStatistics', { groupId, groupName, userRole: 'MEMBER' })}
          >
            <LinearGradient colors={[theme.primary, theme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
              <MaterialCommunityIcons name="chart-bar" size={24} color="#fff" />
              <Text style={styles.actionText}>My Statistics</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SettingsModal 
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        groupId={groupId}
        groupName={groupName}
        userRole="MEMBER"
        navigation={navigation}
        onRefreshTasks={() => loadDashboardData(true)}
      />
    </ScreenWrapper>
  );
};