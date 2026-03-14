// src/screens/MemberDashboardScreen.tsx - UPDATED with token checking and real-time events
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TaskService } from '../services/TaskService';
import { GroupActivityService } from '../services/GroupActivityService';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

const { width } = Dimensions.get('window');

export const MemberDashboardScreen = ({ navigation, route }: any) => {
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
  
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);
  
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();

  // ===== GET USER ID ON MOUNT =====
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    getUserId();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ===== REAL-TIME EVENT LISTENERS =====
  const { events: taskEvents } = useRealtimeTasks(groupId);
  const { events: assignmentEvents } = useRealtimeAssignments(groupId, currentUserId || '');
  const { events: swapEvents } = useRealtimeSwapRequests(groupId, currentUserId || '');

  // Refresh when tasks change
  useEffect(() => {
    if (taskEvents.taskCreated || 
        taskEvents.taskUpdated || 
        taskEvents.taskDeleted ||
        taskEvents.taskAssigned) {
      console.log('🔄 Task event detected, refreshing member dashboard...');
      refreshDashboardData();
    }
  }, [
    taskEvents.taskCreated,
    taskEvents.taskUpdated, 
    taskEvents.taskDeleted,
    taskEvents.taskAssigned
  ]);

  // Refresh when assignments change
  useEffect(() => {
    if (assignmentEvents.assignmentCompleted ||
        assignmentEvents.assignmentVerified ||
        assignmentEvents.assignmentPendingVerification) {
      console.log('✅ Assignment event detected, refreshing member dashboard...');
      refreshDashboardData();
    }
  }, [
    assignmentEvents.assignmentCompleted,
    assignmentEvents.assignmentVerified,
    assignmentEvents.assignmentPendingVerification
  ]);

  // Refresh when swap requests change
  useEffect(() => {
    if (swapEvents.swapCreated ||
        swapEvents.swapResponded) {
      console.log('🔄 Swap event detected, refreshing member dashboard...');
      refreshDashboardData();
    }
  }, [
    swapEvents.swapCreated,
    swapEvents.swapResponded
  ]);

  // Listen for notifications
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if ([
        'TASK_ASSIGNED',
        'SUBMISSION_VERIFIED',
        'SUBMISSION_REJECTED',
        'POINTS_EARNED',
        'SWAP_ACCEPTED',
        'SWAP_RESPONDED',
        'LATE_SUBMISSION',
        'POINT_DEDUCTION'
      ].includes(notification.type)) {
        console.log(`🔔 Member notification ${notification.type} received, refreshing...`);
        refreshDashboardData();
      }
    },
    showAlerts: true
  });

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        loadDashboardData();
      }
    }, [groupId])
  );

  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 MemberDashboard: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      console.log('✅ MemberDashboard: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ MemberDashboard: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

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
      console.log('📥 Loading member dashboard data for group:', groupId);

      // Use the dedicated member dashboard endpoint
      const dashboardResult = await GroupActivityService.getMemberDashboard(groupId);
      
      if (dashboardResult.success && isMounted.current) {
        setDashboardData(dashboardResult.data);
        setStats(dashboardResult.data.stats);
        setPoints({
          thisWeek: dashboardResult.data.stats.pointsThisWeek || 0,
          total: dashboardResult.data.stats.totalPoints || 0
        });
        
        // Combine due today and upcoming tasks
        const allTasks = [
          ...(dashboardResult.data.tasks?.dueToday || []),
          ...(dashboardResult.data.tasks?.upcoming || [])
        ];
        setMyTasks(allTasks);
        
        initialLoadDone.current = true;
      } else {
        // Fallback to individual calls if dashboard endpoint fails
        console.log('Falling back to individual API calls...');
        
        // Get my tasks
        const tasksResult = await TaskService.getMyTasks(groupId);
        if (tasksResult.success && isMounted.current) {
          setMyTasks(tasksResult.tasks || []);
          
          // Calculate points
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

        // Get stats
        const statsResult = await TaskService.getTaskStatistics(groupId);
        if (statsResult.success && isMounted.current) {
          setStats(statsResult.statistics);
        }
      }

      // Get pending swaps
      await loadPendingForMe(groupId);

    } catch (err: any) {
      console.error('❌ Error loading member dashboard:', err);
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

  // Handle auth error
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError]);

  const StatCard = ({ title, value, icon, color = '#2b8a3e', subtitle }: any) => (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statCard}
    >
      <View style={styles.statHeader}>
        <LinearGradient
          colors={[`${color}20`, `${color}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statIconContainer}
        >
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </LinearGradient>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </LinearGradient>
  );

  const TaskCard = ({ task }: { task: any }) => {
    const isCompleted = task.completed || task.assignment?.completed;
    const isDueToday = task.isDueToday || task.assignment?.isDueToday;
    const dueDate = new Date(task.dueDate || task.assignment?.dueDate);
    const now = new Date();
    const isOverdue = !isCompleted && dueDate < now;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('AssignmentDetails', {
          assignmentId: task.id || task.assignment?.id,
          isAdmin: false
        })}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isCompleted ? ['#f8f9fa', '#e9ecef'] : ['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.taskCard}
        >
          <View style={styles.taskHeader}>
            <LinearGradient
              colors={isCompleted ? ['#868e96', '#6c757d'] : ['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskIcon}
            >
              <MaterialCommunityIcons
                name={isCompleted ? "check" : "format-list-checks"}
                size={20}
                color="white"
              />
            </LinearGradient>
            <View style={styles.taskInfo}>
              <Text style={[
                styles.taskTitle,
                isCompleted && styles.completedTaskTitle
              ]} numberOfLines={1}>
                {task.title || task.taskTitle}
              </Text>
              <View style={styles.taskMeta}>
                <LinearGradient
                  colors={['#fff3bf', '#ffec99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pointsBadge}
                >
                  <MaterialCommunityIcons name="star" size={12} color="#e67700" />
                  <Text style={styles.pointsText}>{task.points || task.assignment?.points || 0} pts</Text>
                </LinearGradient>
                {isDueToday && !isCompleted && (
                  <LinearGradient
                    colors={['#fa5252', '#e03131']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dueBadge}
                  >
                    <Text style={styles.dueBadgeText}>Due Today</Text>
                  </LinearGradient>
                )}
                {isOverdue && !isCompleted && (
                  <LinearGradient
                    colors={['#e67700', '#cc5f00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dueBadge}
                  >
                    <Text style={styles.dueBadgeText}>Overdue</Text>
                  </LinearGradient>
                )}
              </View>
            </View>
          </View>
          {task.timeSlot && (
            <View style={styles.timeSlotContainer}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#868e96" />
              <Text style={styles.timeSlotText}>
                {task.timeSlot.startTime} - {task.timeSlot.endTime}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboardData()}>
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Use dashboard data if available, otherwise fallback to local state
  const pendingTasks = dashboardData?.tasks?.upcoming || myTasks.filter(t => !t.assignment?.completed);
  const completedTasks = dashboardData?.stats?.completedTasks || myTasks.filter(t => t.assignment?.completed).length;
  const tasksDueToday = dashboardData?.tasks?.dueToday || myTasks.filter(t => t.assignment?.isDueToday && !t.assignment?.completed);

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupName}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={22} color="#2b8a3e" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Card */}
        <LinearGradient
          colors={['#2b8a3e', '#1e6b2c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Your Dashboard</Text>
            <Text style={styles.welcomeSubtitle}>
              Track your progress and upcoming tasks
            </Text>
          </View>
          <MaterialCommunityIcons name="view-dashboard" size={48} color="rgba(255,255,255,0.2)" />
        </LinearGradient>

        {/* Points Overview */}
        <View style={styles.pointsContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsCard}
          >
            <Text style={styles.pointsLabel}>This Week</Text>
            <Text style={styles.pointsValue}>{points.thisWeek}</Text>
            <Text style={styles.pointsSubtext}>points earned</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsCard}
          >
            <Text style={styles.pointsLabel}>Total</Text>
            <Text style={styles.pointsValue}>{points.total}</Text>
            <Text style={styles.pointsSubtext}>lifetime points</Text>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Pending Tasks"
            value={pendingTasks.length}
            icon="clock-outline"
            color="#e67700"
          />
          <StatCard
            title="Completed"
            value={typeof completedTasks === 'number' ? completedTasks : completedTasks.length}
            icon="check-circle"
            color="#2b8a3e"
          />
          <StatCard
            title="Due Today"
            value={tasksDueToday.length}
            icon="calendar-today"
            color="#fa5252"
          />
          <StatCard
            title="Swap Requests"
            value={totalPendingForMe || 0}
            icon="swap-horizontal"
            color="#2b8a3e"
          />
        </View>

        {/* Today's Tasks */}
        {tasksDueToday.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Due Today</Text>
              {tasksDueToday.length > 2 && (
                <TouchableOpacity onPress={() => navigation.navigate('TodayAssignments', { groupId, groupName })}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {tasksDueToday.slice(0, 2).map((task: any) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </>
        )}

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            {pendingTasks.slice(0, 3).map((task: any) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MySwapRequests')}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={24} color="white" />
              <Text style={styles.actionText}>My Swaps</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TaskCompletionHistory', { groupId, groupName, userRole: 'MEMBER' })}
          >
            <LinearGradient
              colors={['#495057', '#343a40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="history" size={24} color="white" />
              <Text style={styles.actionText}>History</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('RotationSchedule', { groupId, groupName, userRole: 'MEMBER' })}
          >
            <LinearGradient
              colors={['#495057', '#343a40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="calendar-sync" size={24} color="white" />
              <Text style={styles.actionText}>Schedule</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('FullLeaderboard', { groupId, groupName })}
          >
            <LinearGradient
              colors={['#495057', '#343a40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="podium" size={24} color="white" />
              <Text style={styles.actionText}>Leaderboard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

// Add missing styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fa5252',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeContent: {
    flex: 1,
    marginRight: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  statTitle: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#adb5bd',
  },
  pointsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pointsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2b8a3e',
    marginBottom: 2,
  },
  pointsSubtext: {
    fontSize: 11,
    color: '#adb5bd',
  },
  taskCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  completedTaskTitle: {
    color: '#868e96',
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  pointsText: {
    fontSize: 10,
    color: '#e67700',
    fontWeight: '600',
  },
  dueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dueBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  timeSlotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
  },
  timeSlotText: {
    fontSize: 12,
    color: '#495057',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
});