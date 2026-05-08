// src/screens/AdminDashboardScreen.tsx - CLEAN WORKING VERSION

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert, 
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { TaskService } from '../services/TaskService';
import { GroupMembersService } from '../services/GroupMemberService';
import { GroupActivityService } from '../services/GroupActivityService';
import { AssignmentService } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils';
import { useRotationStatus } from '../hooks/useRotationStatus';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks'; 
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { SettingsModal } from '../components/SettingsModal';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { makeAdminDashboardStyles } from '../styles/adminDashboard.styles';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';

export const AdminDashboardScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeAdminDashboardStyles(theme), [theme]);
  
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
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);
  
  const { status, checkStatus, authError: rotationAuthError } = useRotationStatus(groupId);
  
  const { 
    totalPendingForAdmin, 
    loadPendingForAdmin,
    pendingForAdmin
  } = useSwapRequests();

  // ===== GET USER ID ON MOUNT =====
  useEffect(() => {
    const getUserId = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user) {
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

  // ===== TOKEN CHECK =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // ===== FETCH PENDING VERIFICATIONS COUNT =====
  const fetchPendingVerificationsCount = useCallback(async () => {
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
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  }, [groupId, checkToken]);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError || rotationAuthError) {
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
  }, [authError, rotationAuthError, navigation]);

  // ===== REAL-TIME EVENT LISTENERS =====
  const { events: taskEvents, clearRotationCompleted } = useRealtimeTasks(groupId);
  const { events: assignmentEvents } = useRealtimeAssignments(groupId, currentUserId || '');
  const { events: swapEvents } = useRealtimeSwapRequests(groupId, currentUserId || '');

  useEffect(() => {
    if (taskEvents.taskCreated || 
        taskEvents.taskUpdated || 
        taskEvents.taskDeleted ||
        taskEvents.taskAssigned) {
      refreshDashboardData();
    }
  }, [
    taskEvents.taskCreated,
    taskEvents.taskUpdated, 
    taskEvents.taskDeleted,
    taskEvents.taskAssigned
  ]);

  useEffect(() => {
    if (assignmentEvents.assignmentCompleted ||
        assignmentEvents.assignmentVerified ||
        assignmentEvents.assignmentPendingVerification) {
      refreshDashboardData();
    }
  }, [
    assignmentEvents.assignmentCompleted,
    assignmentEvents.assignmentVerified,
    assignmentEvents.assignmentPendingVerification
  ]);

  useEffect(() => {
    if (swapEvents.swapCreated ||
        swapEvents.swapResponded ||
        swapEvents.swapPendingApproval ||
        swapEvents.swapAdminAction) {
      refreshDashboardData();
    }
  }, [
    swapEvents.swapCreated,
    swapEvents.swapResponded,
    swapEvents.swapPendingApproval,
    swapEvents.swapAdminAction
  ]);

  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if ([
        'SUBMISSION_PENDING',
        'SUBMISSION_VERIFIED',
        'SUBMISSION_REJECTED',
        'SWAP_ADMIN_NOTIFICATION',
        'SWAP_PENDING_APPROVAL',
        'SWAP_ADMIN_APPROVED',
        'SWAP_ADMIN_REJECTED',
        'SWAP_READY_FOR_ACCEPTANCE',
        'NEGLECT_DETECTED'
      ].includes(notification.type)) {
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

  useEffect(() => {
    if (taskEvents.rotationCompleted) {
      Alert.alert(
        '🔄 Rotation Completed',
        `Week ${taskEvents.rotationCompleted.newWeek} has started!\n\n` +
        `${taskEvents.rotationCompleted.rotatedTasks?.length || 0} tasks were rotated.`,
        [
          { 
            text: 'View Schedule', 
            onPress: () => {
              navigation.navigate('RotationSchedule', { 
                groupId, 
                groupName, 
                userRole: 'ADMIN' 
              });
              clearRotationCompleted();
            }
          },
          { 
            text: 'OK',
            onPress: () => clearRotationCompleted()
          }
        ]
      );
      refreshDashboardData();
    }
  }, [taskEvents.rotationCompleted]);

  useEffect(() => {
    if (status && isMounted.current) {
      setRotationStatus(status);
    }
  }, [status]);

  useEffect(() => {
    if (groupId) {
      loadPendingForAdmin(groupId);
      fetchPendingVerificationsCount();
    }
  }, [groupId, loadPendingForAdmin, fetchPendingVerificationsCount]);

 const loadDashboardData = async (isRefreshing = false) => {
  const hasToken = await checkToken();
  if (!hasToken) {
    setLoading(false);
    return;
  }

  if (!isRefreshing && !initialLoadDone.current) {
    setLoading(true);
  }
  setError(null);

  try {
    const dashboardResult = await GroupActivityService.getAdminDashboard(groupId);
    
    if (dashboardResult.success) {
      if (isMounted.current) {
        setStats(dashboardResult.data.stats);
        setMembers(dashboardResult.data.members);
        setRecentActivity(dashboardResult.data.recentActivity || []);
        await loadPendingForAdmin(groupId);
        await fetchPendingVerificationsCount();
        initialLoadDone.current = true;
      }
    } else { 
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
      
      await loadPendingForAdmin(groupId);
      await fetchPendingVerificationsCount();
    }

    await checkStatus();
    if (status && isMounted.current) {
      setRotationStatus(status);
    }

  } catch (err: any) {
    console.error('Error loading admin dashboard:', err);
    if (isMounted.current) {
      setError(err.message || 'Failed to load dashboard data');
    }
  } finally {
    if (isMounted.current) {
      setLoading(false);
    }
  }
};

const refreshDashboardData = useCallback(async () => {
  console.log('🔄 Refreshing admin dashboard...');
  setRefreshing(true);
  await loadDashboardData(true);
  setRefreshing(false);
}, []);

  const handleRefresh = () => {
    refreshDashboardData();
  };

  const handleSettingsPress = () => {
    setShowSettingsModal(true);
  };


 // ===== STAT CARD - COMPLETE FIX FOR ALL TYPES =====
const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = theme.primary, 
  subtitle,
  navigateTo,
  navigationParams,
  badge
}: any) => {
  // ✅ Fix 1: Convert value to safe number/string
  let safeValue: number | string = 0;
  
  if (typeof value === 'number') {
    safeValue = value;
  } else if (typeof value === 'string') {
    safeValue = value;
  } else if (value && typeof value === 'object') {
    // If it's an object, try to get a numeric property
    const numValue = value.count ?? value.value ?? value.total ?? 0;
    safeValue = typeof numValue === 'number' ? numValue : 0;
  } else {
    safeValue = 0;
  }
  
  // ✅ Fix 2: Convert badge to number (or null)
  const safeBadge = typeof badge === 'number' ? badge : (badge ? Number(badge) : 0);
  
  const safeTitle = title || '';
  
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={() => {
        if (navigateTo) {
          navigation.navigate(navigateTo, navigationParams || { groupId, groupName, userRole: 'ADMIN' });
        }
      }}
      activeOpacity={0.7}
      disabled={!navigateTo}
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
        <View style={styles.statValueContainer}>
          <Text style={styles.statValue}>{safeValue}</Text>
          {safeBadge > 0 && (
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>{safeBadge > 99 ? '99+' : safeBadge}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.statTitle}>{safeTitle}</Text>
      {subtitle && typeof subtitle === 'string' && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      {navigateTo && (
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={16} 
          color={theme.textMuted} 
          style={{ position: 'absolute', bottom: 12, right: 12 }}
        />
      )}
    </TouchableOpacity>
  );
};

  // ===== MemberCard =====
  const MemberCard = ({ member }: { member: any }) => {
    const memberName = member?.fullName || 'Unknown Member';
    const memberRole = member?.role || 'MEMBER';
    const memberAvatarText = memberName.charAt(0).toUpperCase() || '?';
    
    return (
      <TouchableOpacity
        onPress={() => {
          const memberId = member.userId || member.id;
          if (!memberId) {
            Alert.alert('Error', 'Cannot view member details - missing ID');
            return;
          }
          navigation.navigate('MemberContributions', { 
            groupId, 
            groupName, 
            memberId,
            userRole: 'ADMIN'
          }); 
        }}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={member.inRotation ? [theme.card, theme.bgSecondary] : [theme.bgSecondary, theme.bgTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.memberCard}
        >
          <View style={styles.memberHeader}>
            {member.avatarUrl ? (
              <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatarImage} />
            ) : (
              <LinearGradient
                colors={member.role === 'ADMIN' ? [theme.primary, theme.primaryDark] : [theme.textSecondary, theme.textMuted]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.memberAvatar}
              >
                <Text style={styles.memberAvatarText}>{memberAvatarText}</Text>
              </LinearGradient>
            )}
            
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{memberName}</Text>
              <View style={styles.memberBadges}>
                <LinearGradient
                  colors={member.role === 'ADMIN' ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.roleBadge}
                >
                  <Text style={[
                    styles.roleBadgeText,
                    member.role === 'ADMIN' && styles.adminRoleText
                  ]}>
                    {memberRole}
                  </Text>
                </LinearGradient>
                
                {member.role !== 'ADMIN' && (
                  member.inRotation ? (
                    <LinearGradient
                      colors={[theme.primaryLight, theme.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.rotationBadge}
                    >
                      <MaterialCommunityIcons name="sync" size={12} color={theme.primary} />
                      <Text style={styles.rotationBadgeText}>In Rotation</Text>
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={[theme.bgSecondary, theme.bgTertiary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.rotationBadge}
                    >
                      <MaterialCommunityIcons name="sync-off" size={12} color={theme.textMuted} />
                      <Text style={styles.rotationBadgeTextOff}>No Rotation</Text>
                    </LinearGradient>
                  )
                )}
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

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
        case 'TASK_COMPLETED': return theme.primary;
        case 'TASK_VERIFIED': return theme.primary;
        case 'TASK_CREATED': return theme.primary;
        case 'SUBMISSION_PENDING': return theme.primary;
        default: return theme.textSecondary;
      }
    };

    const safeDescription = activity?.description || 'No activity';
    const safeTime = activity?.createdAt 
      ? new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Just now';

    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
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
          <Text style={styles.activityDescription}>{safeDescription}</Text>
          <Text style={styles.activityTime}>{safeTime}</Text>
        </View>
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
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
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboardData()}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
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
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{groupName}</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={22} color={theme.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
            <MaterialCommunityIcons name="cog" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
            progressBackgroundColor={theme.bgSecondary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Section */}
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
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
        {/* Rotation Status - FIXED FOR DARK MODE */}
{rotationStatus && (
  <TouchableOpacity
    onPress={() => navigation.navigate('RotationSchedule', { groupId, groupName, userRole: 'ADMIN' })}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}  // ✅ Use theme colors instead of hardcoded
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.rotationCard, { borderColor: theme.border }]}
    >
      <View style={styles.rotationHeader}>
        <MaterialCommunityIcons
          name={rotationStatus.hasEnoughTasks ? "check-circle" : "alert"}
          size={24}
          color={rotationStatus.hasEnoughTasks ? theme.primary : theme.primary}
        />
        <Text style={[styles.rotationTitle, { color: theme.text }]}>
          Rotation Status
        </Text>
      </View>
      <Text style={[styles.rotationMessage, { color: theme.textSecondary }]}>
        {rotationStatus.message}
      </Text>
      <View style={[styles.rotationStats, { borderTopColor: theme.border }]}>
        <View style={styles.rotationStat}>
          <Text style={[styles.rotationStatValue, { color: theme.text }]}>{rotationStatus.totalMembers}</Text>
          <Text style={[styles.rotationStatLabel, { color: theme.textMuted }]}>Members</Text>
        </View>
        <View style={styles.rotationStat}>
          <Text style={[styles.rotationStatValue, { color: theme.text }]}>{rotationStatus.totalTasks}</Text>
          <Text style={[styles.rotationStatLabel, { color: theme.textMuted }]}>Tasks</Text>
        </View>
        <View style={styles.rotationStat}>
          <Text style={[styles.rotationStatValue, { color: theme.text }]}>
            {rotationStatus.tasksPerMember?.toFixed(1) || 0}
          </Text>
          <Text style={[styles.rotationStatLabel, { color: theme.textMuted }]}>Per Member</Text>
        </View>
      </View>
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={20} 
        color={theme.textMuted} 
        style={{ position: 'absolute', bottom: 16, right: 16 }}
      />
    </LinearGradient>
  </TouchableOpacity>
)}

        {/* Overview - 3x3 Grid (9 cards) */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Members"
            value={members.length}
            icon="account-group"
            color={theme.primary}
            navigateTo="GroupMembers"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="Active Members"
            value={members.filter(m => m.isActive).length}
            icon="account-check"
            color={theme.primary}
            navigateTo="GroupMembers"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="In Rotation"
            value={membersInRotation.length}
            icon="sync"
            color={theme.primary}
            navigateTo="RotationSchedule"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="Admins"
            value={admins.length}
            icon="shield-account"
            color={theme.primary}
            navigateTo="GroupMembers"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="Total Tasks"
            value={stats?.totalTasks || 0}
            icon="format-list-checks"
            color={theme.primary}
            navigateTo="GroupTasks"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="This Week"
            value={stats?.weeklyCompletion?.total || 0}
            icon="calendar-week"
            color={theme.primary}
            navigateTo="DetailedStatistics"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="Pending Review"
            value={pendingVerificationsCount}
            icon="clipboard-check"
            color={theme.error}
            navigateTo="PendingVerifications"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
          <StatCard
            title="Swap Approvals"
            value={totalPendingForAdmin}
            icon="swap-horizontal"
            color={theme.primary}
            badge={totalPendingForAdmin}
            navigateTo="AdminSwapApprovals"
            navigationParams={{ groupId, groupName }}
          />
          <StatCard
            title="Neglected"
            value={stats?.neglected?.count || 0}
            icon="timer-off"
            color={theme.error}
            navigateTo="NeglectedTasks"
            navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
          />
        </View>

        {/* Task Statistics */}
        {stats && (
          <>
            <Text style={styles.sectionTitle}>Task Statistics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Recurring"
                value={stats.recurringTasks || 0}
                icon="repeat"
                color={theme.primary}
                navigateTo="RotationSchedule"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
              <StatCard
                title="Completed"
                value={stats.weeklyCompletion?.completed || 0}
                icon="check-circle"
                color={theme.primary}
                subtitle={`${stats.points?.earned || 0} pts`}
                navigateTo="TaskCompletionHistory"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
              <StatCard
                title="Pending Tasks"
                value={stats.weeklyCompletion?.pending || 0}
                icon="clock-outline"
                color={theme.primary}
                navigateTo="DetailedStatistics"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
              <StatCard
                title="Team Overview"
                value={members.length}
                icon="account-group"
                color={theme.primary}
                navigateTo="TeamOverview"
                navigationParams={{ groupId, groupName }}
              />
              <StatCard
                title="Completion Rate"
                value={`${stats.weeklyCompletion?.percentage || 0}%`}
                icon="percent"
                color={theme.primary}
                navigateTo="TaskCompletionHistory"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
              <StatCard
                title="Detailed Stats"
                value="View"
                icon="chart-box"
                color={theme.primary}
                navigateTo="DetailedStatistics"
                navigationParams={{ groupId, groupName, userRole: 'ADMIN' }}
              />
            </View>

            {/* Weekly Completion Progress */}
            <TouchableOpacity
              onPress={() => navigation.navigate('TaskCompletionHistory', { groupId, groupName, userRole: 'ADMIN' })}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[theme.card, theme.bgSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.progressCard}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Weekly Completion</Text>
                  <Text style={styles.progressPercentage}>
                    {stats.weeklyCompletion?.percentage || 0}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${stats.weeklyCompletion?.percentage || 0}%`,
                        backgroundColor: theme.primary
                      }
                    ]}
                  />
                </View>
                <View style={styles.progressStats}>
                  <Text style={styles.progressStatsText}>
                    {stats.weeklyCompletion?.completed || 0} of {stats.weeklyCompletion?.total || 0} active tasks
                  </Text>
                  <Text style={styles.progressStatsText}>
                    {stats.points?.earned || 0} pts earned
                  </Text>
                </View>
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

        {/* Group Members */}
        <Text style={styles.sectionTitle}>Group Members</Text>
        {members.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}

        {/* Quick Actions - 3x2 Grid (6 buttons) */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateTask', { groupId, groupName })}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
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
              colors={[theme.textSecondary, theme.textMuted]}
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
            onPress={() => navigation.navigate('PendingVerifications', { groupId, groupName, userRole: 'ADMIN' })}
          >
            <LinearGradient
              colors={[theme.error, theme.error]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="clipboard-check" size={24} color="white" />
              <Text style={styles.actionText}>Review Submissions</Text>
              {pendingVerificationsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingVerificationsCount}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('GroupMembers', { groupId, groupName, userRole: 'ADMIN' })}
          >
            <LinearGradient
              colors={[theme.textSecondary, theme.textMuted]}
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
              colors={[theme.textSecondary, theme.textMuted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="calendar-sync" size={24} color="white" />
              <Text style={styles.actionText}>Rotation</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AdminSwapApprovals', { groupId, groupName })}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={24} color="white" />
              <Text style={styles.actionText}>Swap Approvals</Text>
              {totalPendingForAdmin > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalPendingForAdmin}</Text>
                </View>
              )}
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