// src/screens/AdminDashboardScreen.tsx - UPDATED with token checking
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
import { GroupMembersService } from '../services/GroupMemberService';
import { GroupActivityService } from '../services/GroupActivityService';
import { useRotationStatus } from '../hooks/useRotationStatus';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

const { width } = Dimensions.get('window');

export const AdminDashboardScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [rotationStatus, setRotationStatus] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);
  
  const { status, checkStatus } = useRotationStatus(groupId);

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
      console.log('🔄 Task event detected, refreshing admin dashboard...');
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
      console.log('✅ Assignment event detected, refreshing admin dashboard...');
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
      console.log('🔄 Swap event detected, refreshing admin dashboard...');
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
        'SUBMISSION_PENDING',
        'SUBMISSION_VERIFIED',
        'SUBMISSION_REJECTED',
        'SWAP_ADMIN_NOTIFICATION',
        'NEGLECT_DETECTED'
      ].includes(notification.type)) {
        console.log(`🔔 Admin notification ${notification.type} received, refreshing...`);
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
        console.warn('🔐 AdminDashboard: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      console.log('✅ AdminDashboard: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ AdminDashboard: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  // Add this useEffect to update rotationStatus when status changes
useEffect(() => {
  if (status && isMounted.current) {
    setRotationStatus(status);
  }
}, [status]);

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
    console.log('📥 Loading admin dashboard data for group:', groupId);

    // Use the new dedicated admin dashboard endpoint
    const dashboardResult = await GroupActivityService.getAdminDashboard(groupId);
    
    if (dashboardResult.success) {
      if (isMounted.current) {
        setStats(dashboardResult.data.stats);
        setMembers(dashboardResult.data.members);
        setRecentActivity(dashboardResult.data.recentActivity || []);
        initialLoadDone.current = true;
      }
    } else {
      // Fallback to individual calls if dashboard endpoint fails
      console.log('Falling back to individual API calls...');
      
      const statsResult = await TaskService.getTaskStatistics(groupId);
      if (statsResult.success && isMounted.current) {
        setStats(statsResult.statistics);
      }

      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      if (membersResult.success && isMounted.current) {
        setMembers(membersResult.members || []);
      }

      const activityResult = await GroupActivityService.getRecentActivity(groupId, 5);
      if (activityResult.success && isMounted.current) {
        setRecentActivity(activityResult.data || []);
      }
    }

    // ===== FIXED: Get rotation status =====
    await checkStatus(); // This updates the status internally
    if (status && isMounted.current) {
      setRotationStatus(status);
    }

  } catch (err: any) {
    console.error('❌ Error loading admin dashboard:', err);
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

  const MemberCard = ({ member }: { member: any }) => (
    <LinearGradient
      colors={member.inRotation ? ['#ffffff', '#f8f9fa'] : ['#f8f9fa', '#e9ecef']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.memberCard}
    >
      <View style={styles.memberHeader}>
        <LinearGradient
          colors={member.role === 'ADMIN' ? ['#2b8a3e', '#1e6b2c'] : ['#495057', '#343a40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.memberAvatar}
        >
          <Text style={styles.memberAvatarText}>
            {member.fullName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </LinearGradient>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.fullName}</Text>
          <View style={styles.memberBadges}>
            <LinearGradient
              colors={member.role === 'ADMIN' ? ['#d3f9d8', '#b2f2bb'] : ['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roleBadge}
            >
              <Text style={[
                styles.roleBadgeText,
                member.role === 'ADMIN' && styles.adminRoleText
              ]}>
                {member.role}
              </Text>
            </LinearGradient>
            {member.inRotation ? (
              <LinearGradient
                colors={['#d3f9d8', '#b2f2bb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rotationBadge}
              >
                <MaterialCommunityIcons name="sync" size={12} color="#2b8a3e" />
                <Text style={styles.rotationBadgeText}>In Rotation</Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rotationBadge}
              >
                <MaterialCommunityIcons name="sync-off" size={12} color="#868e96" />
                <Text style={styles.rotationBadgeTextOff}>No Rotation</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const ActivityItem = ({ activity }: { activity: any }) => {
    const getIcon = (type: string) => {
      switch(type) {
        case 'TASK_COMPLETED': return 'check-circle';
        case 'TASK_VERIFIED': return 'check-decagram';
        case 'TASK_CREATED': return 'plus-circle';
        case 'SUBMISSION_PENDING': return 'clock-outline';
        default: return 'bell';
      }
    };

    const getColor = (type: string) => {
      switch(type) {
        case 'TASK_COMPLETED': return '#2b8a3e';
        case 'TASK_VERIFIED': return '#2b8a3e';
        case 'TASK_CREATED': return '#2b8a3e';
        case 'SUBMISSION_PENDING': return '#e67700';
        default: return '#495057';
      }
    };

    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activityItem}
      >
        <LinearGradient
          colors={[`${getColor(activity.type)}20`, `${getColor(activity.type)}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activityIcon}
        >
          <MaterialCommunityIcons name={getIcon(activity.type) as any} size={20} color={getColor(activity.type)} />
        </LinearGradient>
        <View style={styles.activityContent}>
          <Text style={styles.activityDescription}>{activity.description}</Text>
          <Text style={styles.activityTime}>
            {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
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
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
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

  const admins = members.filter(m => m.role === 'ADMIN');
  const membersInRotation = members.filter(m => m.role !== 'ADMIN' && m.isActive);

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
        {/* Welcome Section */}
        <LinearGradient
          colors={['#2b8a3e', '#1e6b2c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
            <Text style={styles.welcomeSubtitle}>
              Monitor and manage your group's activity
            </Text>
          </View>
          <MaterialCommunityIcons name="shield-account" size={48} color="rgba(255,255,255,0.2)" />
        </LinearGradient>

        {/* Rotation Status */}
        {rotationStatus && (
          <LinearGradient
            colors={rotationStatus.hasEnoughTasks ? ['#d3f9d8', '#b2f2bb'] : ['#fff3bf', '#ffec99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rotationCard}
          >
            <View style={styles.rotationHeader}>
              <MaterialCommunityIcons
                name={rotationStatus.hasEnoughTasks ? "check-circle" : "alert"}
                size={24}
                color={rotationStatus.hasEnoughTasks ? "#2b8a3e" : "#e67700"}
              />
              <Text style={[
                styles.rotationTitle,
                { color: rotationStatus.hasEnoughTasks ? "#2b8a3e" : "#e67700" }
              ]}>
                Rotation Status
              </Text>
            </View>
            <Text style={styles.rotationMessage}>
              {rotationStatus.message}
            </Text>
            <View style={styles.rotationStats}>
              <View style={styles.rotationStat}>
                <Text style={styles.rotationStatValue}>{rotationStatus.totalMembers}</Text>
                <Text style={styles.rotationStatLabel}>Members</Text>
              </View>
              <View style={styles.rotationStat}>
                <Text style={styles.rotationStatValue}>{rotationStatus.totalTasks}</Text>
                <Text style={styles.rotationStatLabel}>Tasks</Text>
              </View>
              <View style={styles.rotationStat}>
                <Text style={styles.rotationStatValue}>
                  {rotationStatus.tasksPerMember?.toFixed(1) || 0}
                </Text>
                <Text style={styles.rotationStatLabel}>Per Member</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Members"
            value={members.length}
            icon="account-group"
            color="#2b8a3e"
          />
          <StatCard
            title="Active Members"
            value={members.filter(m => m.isActive).length}
            icon="account-check"
            color="#2b8a3e"
          />
          <StatCard
            title="In Rotation"
            value={membersInRotation.length}
            icon="sync"
            color="#2b8a3e"
          />
          <StatCard
            title="Admins"
            value={admins.length}
            icon="shield-account"
            color="#2b8a3e"
          />
        </View>

        {/* Task Stats */}
        {stats && (
          <>
            <Text style={styles.sectionTitle}>Task Statistics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Tasks"
                value={stats.totalTasks || 0}
                icon="format-list-checks"
                color="#2b8a3e"
              />
              <StatCard
                title="Recurring"
                value={stats.recurringTasks || 0}
                icon="repeat"
                color="#2b8a3e"
              />
              <StatCard
                title="This Week"
                value={stats.currentWeek?.totalAssignments || 0}
                icon="calendar-week"
                color="#2b8a3e"
              />
              <StatCard
                title="Completed"
                value={stats.currentWeek?.completedAssignments || 0}
                icon="check-circle"
                color="#2b8a3e"
                subtitle={`${stats.currentWeek?.completedPoints || 0} pts`}
              />
            </View>

            {/* Completion Progress */}
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.progressCard}
            >
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Weekly Completion</Text>
                <Text style={styles.progressPercentage}>
                  {stats.currentWeek?.totalAssignments > 0
                    ? Math.round((stats.currentWeek?.completedAssignments / stats.currentWeek?.totalAssignments) * 100)
                    : 0}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${stats.currentWeek?.totalAssignments > 0
                        ? (stats.currentWeek?.completedAssignments / stats.currentWeek?.totalAssignments) * 100
                        : 0}%`,
                      backgroundColor: '#2b8a3e'
                    }
                  ]}
                />
              </View>
              <View style={styles.progressStats}>
                <Text style={styles.progressStatsText}>
                  {stats.currentWeek?.completedAssignments || 0} of {stats.currentWeek?.totalAssignments || 0} tasks
                </Text>
                <Text style={styles.progressStatsText}>
                  {stats.currentWeek?.completedPoints || 0} pts earned
                </Text>
              </View>
            </LinearGradient>
          </>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </>
        )}

        {/* Members List */}
        <Text style={styles.sectionTitle}>Team Members</Text>
        {members.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateTask', { groupId, groupName })}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
              <Text style={styles.actionText}>Create Task</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TaskAssignment', { groupId, groupName, userRole: 'ADMIN' })}
          >
            <LinearGradient
              colors={['#495057', '#343a40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="account-switch" size={24} color="white" />
              <Text style={styles.actionText}>Assign Tasks</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('GroupMembers', { groupId, groupName, userRole: 'ADMIN' })}
          >
            <LinearGradient
              colors={['#495057', '#343a40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="account-group" size={24} color="white" />
              <Text style={styles.actionText}>Manage Members</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('RotationSchedule', { groupId, groupName, userRole: 'ADMIN' })}
          >
            <LinearGradient
              colors={['#495057', '#343a40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="calendar-sync" size={24} color="white" />
              <Text style={styles.actionText}>Rotation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

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
  rotationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rotationTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rotationMessage: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 12,
    lineHeight: 18,
  },
  rotationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  rotationStat: {
    alignItems: 'center',
  },
  rotationStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  rotationStatLabel: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  progressCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b8a3e',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStatsText: {
    fontSize: 12,
    color: '#868e96',
  },
  memberCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  memberBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#495057',
  },
  adminRoleText: {
    color: '#2b8a3e',
  },
  rotationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  rotationBadgeText: {
    fontSize: 10,
    color: '#2b8a3e',
    fontWeight: '600',
  },
  rotationBadgeTextOff: {
    fontSize: 10,
    color: '#868e96',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#868e96',
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