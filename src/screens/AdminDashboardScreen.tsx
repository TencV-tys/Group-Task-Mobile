// src/screens/AdminDashboardScreen.tsx - FIXED header and stat cards
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
import * as SecureStore from 'expo-secure-store';

import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import { GroupActivityService } from '../services/GroupActivityService';
import { useRotationStatus } from '../hooks/useRotationStatus';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { SettingsModal } from '../components/SettingsModal';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { adminDashboardStyles as styles } from '../styles/adminDashboard.styles';

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
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

  // Update rotationStatus when status changes
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

      const dashboardResult = await GroupActivityService.getAdminDashboard(groupId);
      
      if (dashboardResult.success) {
        if (isMounted.current) {
          setStats(dashboardResult.data.stats);
          setMembers(dashboardResult.data.members);
          setRecentActivity(dashboardResult.data.recentActivity || []);
          initialLoadDone.current = true;
        }
      } else {
        // Fallback to individual calls
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

      await checkStatus();
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

  const handleSettingsPress = () => {
    setShowSettingsModal(true);
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

  // ===== STAT CARD =====
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = '#2b8a3e', 
    subtitle,
    onPress,
    navigateTo,
    navigationParams
  }: any) => {
    const handlePress = () => {
      if (onPress) {
        onPress();
      } else if (navigateTo) {
        navigation.navigate(navigateTo, navigationParams || { groupId, groupName });
      }
    };

    return (
      <TouchableOpacity
        style={styles.statCard}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={!navigateTo && !onPress}
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
        {(navigateTo || onPress) && (
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={16} 
            color="#adb5bd" 
            style={{ position: 'absolute', bottom: 12, right: 12 }}
          />
        )}
      </TouchableOpacity>
    );
  };

  const MemberCard = ({ member }: { member: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('MemberContributions', { 
        groupId, 
        groupName, 
        memberId: member.userId,
        userRole: 'ADMIN'
      })}
      activeOpacity={0.7}
    >
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
          <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
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
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={22} color="#2b8a3e" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
            <MaterialCommunityIcons name="cog" size={22} color="#2b8a3e" />
          </TouchableOpacity>
        </View>
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
          <TouchableOpacity
            onPress={() => navigation.navigate('RotationSchedule', { groupId, groupName, userRole: 'ADMIN' })}
            activeOpacity={0.7}
          >
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
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={20} 
                color="#adb5bd" 
                style={{ position: 'absolute', bottom: 16, right: 16 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick Stats Grid - CLICKABLE */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Members"
            value={members.length}
            icon="account-group"
            color="#2b8a3e"
            navigateTo="GroupMembers"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="Active Members"
            value={members.filter(m => m.isActive).length}
            icon="account-check"
            color="#2b8a3e"
            navigateTo="GroupMembers"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="In Rotation"
            value={membersInRotation.length}
            icon="sync"
            color="#2b8a3e"
            navigateTo="RotationSchedule"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="Admins"
            value={admins.length}
            icon="shield-account"
            color="#2b8a3e"
            navigateTo="GroupMembers"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
        </View>

        {/* Task Stats - CLICKABLE */}
        {stats && (
          <>
            <Text style={styles.sectionTitle}>Task Statistics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Tasks"
                value={stats.totalTasks || 0}
                icon="format-list-checks"
                color="#2b8a3e"
                navigateTo="GroupTasks"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
              <StatCard
                title="Recurring"
                value={stats.recurringTasks || 0}
                icon="repeat"
                color="#2b8a3e"
                navigateTo="RotationSchedule"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
              <StatCard
                title="This Week"
                value={stats.currentWeek?.totalAssignments || 0}
                icon="calendar-week"
                color="#2b8a3e"
                navigateTo="TaskCompletionHistory"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN', week: stats.currentWeek?.weekNumber }}
              />
              <StatCard
                title="Completed"
                value={stats.currentWeek?.completedAssignments || 0}
                icon="check-circle"
                color="#2b8a3e"
                subtitle={`${stats.currentWeek?.completedPoints || 0} pts`}
                navigateTo="TaskCompletionHistory"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
            </View>

            {/* Completion Progress - CLICKABLE */}
            <TouchableOpacity
              onPress={() => navigation.navigate('TaskCompletionHistory', { groupId, groupName, userRole: 'ADMIN' })}
              activeOpacity={0.7}
            >
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
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={20} 
                  color="#adb5bd" 
                  style={{ position: 'absolute', bottom: 16, right: 16 }}
                />
              </LinearGradient>
            </TouchableOpacity>
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

        {/* Members List - CLICKABLE */}
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

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        groupId={groupId}
        groupName={groupName}
        userRole="ADMIN"
        navigation={navigation}
        onRefreshTasks={() => loadDashboardData(true)}
      />
    </ScreenWrapper>
  );
};