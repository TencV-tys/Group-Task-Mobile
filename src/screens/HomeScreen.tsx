// src/screens/HomeScreen.tsx - Fixed Infinite Loop
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useHomeData } from '../homeHook/useHomeHook';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useNotifications } from '../notificationHook/useNotifications'; 
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useRealtimeGroup } from '../hooks/useRealtimeGroup';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { RotationBanner } from '../components/RotationBanner';
import { GroupListener } from '../components/GroupListener';
import { useTheme } from '../context/ThemeContext';
import { makeHomeStyles } from '../styles/home.styles';

export default function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeHomeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rotationAlerts, setRotationAlerts] = useState<{ [key: string]: any }>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Animation values
  const animations = useMemo(() => ({
    header: new Animated.Value(0),
    stats: new Animated.Value(0),
    quickActions: new Animated.Value(0),
    groups: new Animated.Value(0),
    tasks: new Animated.Value(0),
    activity: new Animated.Value(0),
  }), []);

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const { loading, refreshing, error, homeData, refreshHomeData, authError } = useHomeData();
  const { loadPendingForMe } = useSwapRequests();
  const { unreadCount, loadUnreadCount, refreshNotifications } = useNotifications();

  // Entrance animations - only once
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animations.header, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(animations.stats, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
      Animated.timing(animations.quickActions, { toValue: 1, duration: 400, delay: 150, useNativeDriver: true }),
      Animated.timing(animations.groups, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
      Animated.timing(animations.tasks, { toValue: 1, duration: 400, delay: 250, useNativeDriver: true }),
      Animated.timing(animations.activity, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  // Initial data load - only once
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      // Initial load will happen from useHomeData hook
    }
  }, []);

  const { events: groupEvents, clearGroupCreated } = useRealtimeGroup('');

  useEffect(() => {
    if (groupEvents.groupCreated) {
      refreshHomeData();
      clearGroupCreated();
    }
  }, [groupEvents.groupCreated, refreshHomeData, clearGroupCreated]);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user && isMounted.current) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    getUserId();
  }, []);

  const { events, clearNewNotification } = useRealtimeNotifications({
    onNewNotification: useCallback((notification) => {
      refreshHomeData();
      if (notification.type?.includes('SWAP')) loadPendingForMe();
      loadUnreadCount();
      refreshNotifications();
    }, [refreshHomeData, loadPendingForMe, loadUnreadCount, refreshNotifications]),
    showAlerts: true,
    alertTypes: [
      'SUBMISSION_PENDING', 'SUBMISSION_VERIFIED', 'SUBMISSION_REJECTED',
      'SWAP_REQUEST', 'SWAP_ACCEPTED', 'SWAP_REJECTED', 'TASK_ASSIGNED',
      'POINT_DEDUCTION', 'LATE_SUBMISSION', 'ROTATION_COMPLETED'
    ]
  });

  useEffect(() => {
    if (events.newNotification) clearNewNotification();
  }, [events.newNotification, clearNewNotification]);

  // Load initial counts
  useEffect(() => {
    loadPendingForMe();
    loadUnreadCount();
  }, [loadPendingForMe, loadUnreadCount]);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
      ]);
    }
  }, [authError, navigation]);

  // Focus effect - ONLY refresh if needed, not constantly
  useFocusEffect(
    useCallback(() => {
      // Only refresh if data is stale (you can add a timestamp check)
      // For now, just refresh notifications count
      loadUnreadCount();
      loadPendingForMe();
      
      // Optional: refresh home data only if it's been more than 30 seconds
      // You can implement a timestamp check here
      
      return () => {
        // Cleanup if needed
      };
    }, [loadUnreadCount, loadPendingForMe])
  );

  const user = homeData?.user || { fullName: 'User', groupsCount: 0, email: '', avatarUrl: null };
  const stats = homeData?.stats || {
    groupsCount: 0, tasksDueThisWeek: 0, overdueTasks: 0,
    completedTasks: 0, totalTasks: 0, completionRate: 0, swapRequests: 0
  };
  const recentActivity = homeData?.recentActivity || [];
  const currentWeekTasks = homeData?.currentWeekTasks || [];
  const overdueTasks = homeData?.overdueTasks || [];
  const groups = homeData?.groups || [];

  const handleRefresh = useCallback(() => {
    refreshHomeData();
    loadPendingForMe();
    loadUnreadCount();
  }, [refreshHomeData, loadPendingForMe, loadUnreadCount]);

  const handleGroupPress = useCallback((group: any) => {
    navigation.navigate('GroupTasks', {
      groupId: group.id,
      groupName: group.name,
      userRole: group.role || 'MEMBER'
    });
  }, [navigation]);

  const handleViewAllTasks = useCallback(() => {
    if (groups.length > 0) {
      handleGroupPress(groups[0]);
    } else {
      Alert.alert('No Groups', 'Join a group to see your tasks');
    }
  }, [groups, handleGroupPress]);

  const handleCreateGroup = useCallback(() => {
    navigation.navigate('CreateGroup', {
      onGroupCreated: () => refreshHomeData()
    });
  }, [navigation, refreshHomeData]);

  const handleJoinGroup = useCallback(() => {
    navigation.navigate('JoinGroup', {
      onGroupJoined: () => refreshHomeData()
    });
  }, [navigation, refreshHomeData]);

  const handleOverdueTaskPress = useCallback((task: any) => {
    Alert.alert('⚠️ Overdue Task', `"${task.title}" is overdue and cannot be completed.`, [{ text: 'OK' }]);
  }, []);

  const handleDismissRotationAlert = useCallback((groupId: string) => {
    setRotationAlerts(prev => {
      const newAlerts = { ...prev };
      delete newAlerts[groupId];
      return newAlerts;
    });
  }, []);

  const handleRotation = useCallback((groupId: string, alert: any) => {
    setRotationAlerts(prev => ({ ...prev, [groupId]: alert }));
    const group = groups.find((g: any) => g.id === groupId);
    Alert.alert(
      '🔄 New Week Started!',
      `${alert.groupName} is now on Week ${alert.newWeek}\n\nYou have ${alert.myTaskCount} new task(s) assigned.`,
      [
        {
          text: 'View Tasks',
          onPress: () => {
            navigation.navigate('GroupTasks', {
              groupId,
              groupName: alert.groupName,
              userRole: group?.role || 'MEMBER'
            });
            handleDismissRotationAlert(groupId);
          }
        },
        { text: 'Later', onPress: () => handleDismissRotationAlert(groupId) }
      ]
    );
  }, [groups, navigation, handleDismissRotationAlert]);

  const renderGroupListeners = useCallback(() => {
    if (!groups.length || !currentUserId) return null;
    return groups.map((group: any) => (
      <GroupListener
        key={group.id}
        group={group}
        currentUserId={currentUserId}
        onRotation={handleRotation}
        onTaskChange={refreshHomeData}
        onAssignmentChange={refreshHomeData}
        onSwapChange={() => { refreshHomeData(); loadPendingForMe(); }}
      />
    ));
  }, [groups, currentUserId, handleRotation, refreshHomeData, loadPendingForMe]);

  const renderRotationBanners = useCallback(() => {
    const alertEntries = Object.entries(rotationAlerts);
    if (!alertEntries.length) return null;
    return (
      <View style={styles.bannerContainer}>
        {alertEntries.map(([groupId, alert]) => (
          <RotationBanner
            key={groupId}
            groupName={alert.groupName}
            newWeek={alert.newWeek}
            taskCount={alert.myTaskCount}
            onPress={() => {
              navigation.navigate('GroupTasks', {
                groupId,
                groupName: alert.groupName,
                userRole: groups.find((g: any) => g.id === groupId)?.role || 'MEMBER'
              });
              handleDismissRotationAlert(groupId);
            }}
            onClose={() => handleDismissRotationAlert(groupId)}
          />
        ))}
      </View>
    );
  }, [rotationAlerts, styles, navigation, groups, handleDismissRotationAlert]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Error state
  if (error && !homeData) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={theme.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshHomeData}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noBottom={true} style={styles.container}>
      {renderGroupListeners()}
      {renderRotationBanners()}

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: animations.header, transform: [{ translateY: animations.header.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, {user.fullName?.split(' ')[0] || 'User'}!</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={theme.primary} />
            {unreadCount > 0 && (
              <Animated.View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 70 + insets.bottom }]}
      >
        {/* Stats Grid */}
        <Animated.View style={[styles.statsGrid, { opacity: animations.stats, transform: [{ translateY: animations.stats.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('MyGroups')}>
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.statIconContainer}>
              <MaterialCommunityIcons name="account-group" size={24} color={theme.primary} />
            </LinearGradient>
            <Text style={styles.statNumber}>{stats.groupsCount || 0}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={handleViewAllTasks}>
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.statIconContainer}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.primary} />
            </LinearGradient>
            <Text style={styles.statNumber}>{stats.tasksDueThisWeek || 0}</Text>
            <Text style={styles.statLabel}>Due This Week</Text>
            {stats.overdueTasks > 0 && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>{stats.overdueTasks} overdue</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('MySwapRequests')}>
            <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.statIconContainer}>
              <MaterialCommunityIcons name="swap-horizontal" size={24} color={theme.primary} />
            </LinearGradient>
            <Text style={styles.statNumber}>{stats.swapRequests || 0}</Text>
            <Text style={styles.statLabel}>Swap Requests</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[styles.section, { opacity: animations.quickActions, transform: [{ translateY: animations.quickActions.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleCreateGroup}>
              <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="plus-circle" size={24} color="#fff" />
                <Text style={styles.quickActionText}>Create Group</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleJoinGroup}>
              <LinearGradient colors={[theme.textMuted, '#495057']} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="account-plus" size={24} color="#fff" />
                <Text style={styles.quickActionText}>Join Group</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('MySwapRequests')}>
              <LinearGradient colors={['#fd7e14', '#e67700']} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="swap-horizontal" size={24} color="#fff" />
                <Text style={styles.quickActionText}>My Swaps</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <Animated.View style={[styles.section, { opacity: animations.stats, transform: [{ translateY: animations.stats.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <Text style={styles.sectionTitle}>⚠️ Overdue Tasks</Text>
            <View style={styles.overdueList}>
              {overdueTasks.slice(0, 3).map((task: any) => (
                <TouchableOpacity key={task.id} style={styles.overdueTaskItem} onPress={() => handleOverdueTaskPress(task)}>
                  <LinearGradient colors={[theme.errorBg, theme.errorBg]} style={[styles.overdueTaskGradient, { borderColor: theme.errorBorder }]}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
                    <View style={styles.overdueTaskContent}>
                      <Text style={styles.overdueTaskTitle} numberOfLines={1}>{task.title}</Text>
                      <Text style={styles.overdueTaskGroup}>{task.groupName}</Text>
                    </View>
                    <Text style={styles.overdueTaskDays}>{task.daysOverdue || 1}d overdue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
              {overdueTasks.length > 3 && <Text style={styles.moreOverdueText}>+{overdueTasks.length - 3} more overdue tasks</Text>}
            </View>
          </Animated.View>
        )}

        {/* Your Groups */}
        {groups.length > 0 && (
          <Animated.View style={[styles.section, { opacity: animations.groups, transform: [{ translateY: animations.groups.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyGroups')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupsScroll}>
              {groups.slice(0, 5).map((group: any) => (
                <TouchableOpacity key={group.id} style={styles.groupCard} onPress={() => handleGroupPress(group)}>
                  {group.avatarUrl ? (
                    <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatar} />
                  ) : (
                    <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.groupAvatarPlaceholder}>
                      <Text style={styles.groupAvatarText}>{group.name?.charAt(0) || 'G'}</Text>
                    </LinearGradient>
                  )}
                  <Text style={styles.groupName} numberOfLines={1}>{group.name || 'Group'}</Text>
                  <View style={styles.groupRoleBadge}>
                    <Text style={[styles.groupRole, group.role === 'ADMIN' && styles.adminRole]}>
                      {group.role === 'ADMIN' ? 'Admin' : 'Member'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Upcoming Tasks */}
        {currentWeekTasks.length > 0 && (
          <Animated.View style={[styles.section, { opacity: animations.tasks, transform: [{ translateY: animations.tasks.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
              <TouchableOpacity onPress={handleViewAllTasks}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tasksContainer}>
              {currentWeekTasks.slice(0, 3).map((task: any) => (
                <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => navigation.navigate('AssignmentDetails', { assignmentId: task.id, isAdmin: false })}>
                  <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.taskIcon}>
                    <MaterialCommunityIcons name="clipboard-text" size={20} color={theme.primary} />
                  </LinearGradient>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    <Text style={styles.taskGroup}>{task.groupName}</Text>
                  </View>
                  <View style={styles.taskRight}>
                    <Text style={styles.taskPoints}>+{task.points} pts</Text>
                    {task.daysLeft !== undefined && (
                      <Text style={[styles.taskDaysLeft, task.daysLeft === 0 && styles.taskDueToday, task.daysLeft === 1 && styles.taskDueTomorrow]}>
                        {task.daysLeft === 0 ? 'Today' : task.daysLeft === 1 ? 'Tomorrow' : `${task.daysLeft} days`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Recent Activity */}
        <Animated.View style={[styles.section, styles.lastSection, { opacity: animations.activity, transform: [{ translateY: animations.activity.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.length > 0 ? (
            <View style={styles.activityContainer}>
              {recentActivity.slice(0, 3).map((activity: any, index: number) => (
                <TouchableOpacity key={index} style={styles.activityCard} onPress={() => navigation.navigate('Notifications')}>
                  <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.activityIcon}>
                    <MaterialCommunityIcons name={activity.icon || 'bell-outline'} size={20} color={theme.primary} />
                  </LinearGradient>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText} numberOfLines={1}>{activity.title || activity.message}</Text>
                    <Text style={styles.activityTime}>{activity.timeAgo || 'Just now'}</Text>
                  </View>
                  {!activity.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-outline" size={48} color={theme.border} />
              <Text style={styles.emptyStateText}>No recent activity</Text>
              <Text style={styles.emptyStateSubtext}>Complete tasks or join groups to see activity here</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Navigation */}
      <Animated.View style={[styles.bottomNav, { paddingBottom: insets.bottom }, { opacity: animations.header, transform: [{ translateY: animations.header.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyGroups')}>
          <MaterialCommunityIcons name="account-group" size={24} color={theme.primary} />
          <Text style={styles.navText}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
          <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.createButtonGradient}>
            <MaterialCommunityIcons name="plus" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <MaterialCommunityIcons name="account" size={24} color={theme.primary} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScreenWrapper>
  );
} 