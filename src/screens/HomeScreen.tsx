// src/screens/HomeScreen.tsx - Animated + Consistent Design (Swap icon removed)
import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHomeData } from '../homeHook/useHomeHook';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useNotifications } from '../notificationHook/useNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useRealtimeGroup } from '../hooks/useRealtimeGroup';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { RotationBanner } from '../components/RotationBanner';
import { GroupListener } from '../components/GroupListener';
import { homeStyles as styles } from '../styles/home.styles';

const { width } = Dimensions.get('window');

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2b8a3e',
  primaryDark: '#1e6b2c',
  primaryLight: '#d3f9d8',
  secondary: '#f8f9fa',
  tertiary: '#e9ecef',
  dark: '#212529',
  gray: '#868e96',
  lightGray: '#adb5bd',
  error: '#fa5252',
  white: '#ffffff',
  black: '#1a1a2e',
  warning: '#fd7e14',
  orange: '#e67700',
};

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rotationAlerts, setRotationAlerts] = useState<{ [key: string]: any }>({});

  // ── Animation Values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const quickActionsAnim = useRef(new Animated.Value(0)).current;
  const groupsAnim = useRef(new Animated.Value(0)).current;
  const tasksAnim = useRef(new Animated.Value(0)).current;
  const activityAnim = useRef(new Animated.Value(0)).current;

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetching = useRef(false);

  const { loading, refreshing, error, homeData, refreshHomeData, authError } = useHomeData();
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();
  const { unreadCount, loadUnreadCount, refreshNotifications } = useNotifications();

  // ── Entrance Animations
  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(statsAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
        Animated.timing(quickActionsAnim, { toValue: 1, duration: 400, delay: 250, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(groupsAnim, { toValue: 1, duration: 400, delay: 350, useNativeDriver: true }),
        Animated.timing(tasksAnim, { toValue: 1, duration: 400, delay: 400, useNativeDriver: true }),
      ]),
      Animated.timing(activityAnim, { toValue: 1, duration: 400, delay: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = setTimeout(() => {
      if (!isFetching.current) {
        console.log('🔄 Debounced refresh - calling refreshHomeData');
        refreshHomeData();
      } else {
        console.log('🔄 Already fetching, retrying in 1s...');
        setTimeout(() => {
          refreshHomeData();
        }, 1000);
      }
      refreshTimer.current = null;
    }, 500);
  }, [refreshHomeData]);

  const { events: groupEvents, clearGroupCreated } = useRealtimeGroup('');

  useEffect(() => {
    if (groupEvents.groupCreated) {
      console.log('🆕 Group created detected in HomeScreen, refreshing data...');
      debouncedRefresh();
      clearGroupCreated();
    }
  }, [groupEvents.groupCreated, debouncedRefresh, clearGroupCreated]);

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
  }, []);

  const { events, clearNewNotification } = useRealtimeNotifications({
    onNewNotification: (notification) => {
      console.log('📢 HomeScreen: New notification received', notification);
      debouncedRefresh();

      if (notification.type?.includes('SWAP')) {
        loadPendingForMe();
      }

      loadUnreadCount();
      refreshNotifications();
    },
    showAlerts: true,
    alertTypes: [
      'SUBMISSION_PENDING',
      'SUBMISSION_VERIFIED',
      'SUBMISSION_REJECTED',
      'SWAP_REQUEST',
      'SWAP_ACCEPTED',
      'SWAP_REJECTED',
      'TASK_ASSIGNED',
      'POINT_DEDUCTION',
      'LATE_SUBMISSION',
      'ROTATION_COMPLETED'
    ]
  });

  useEffect(() => {
    if (events.newNotification) {
      clearNewNotification();
    }
  }, [events.newNotification]);

  useEffect(() => {
    loadPendingForMe();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [authError, navigation]);

  const user = homeData?.user || {
    fullName: 'User',
    groupsCount: 0,
    email: '',
    avatarUrl: null
  };

  const stats = homeData?.stats || {
    groupsCount: 0,
    tasksDueThisWeek: 0,
    overdueTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    completionRate: 0,
    swapRequests: 0
  };

  const recentActivity = homeData?.recentActivity || [];
  const currentWeekTasks = homeData?.currentWeekTasks || [];
  const overdueTasks = homeData?.overdueTasks || [];
  const groups = homeData?.groups || [];

  const handleRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    refreshHomeData();
    loadPendingForMe();
    loadUnreadCount();
  }, [refreshHomeData, loadPendingForMe, loadUnreadCount]);

  const handleViewGroups = () => {
    navigation.navigate('MyGroups');
  };

  const handleViewSwapRequests = () => {
    navigation.navigate('MySwapRequests');
  };

  const handleViewPendingSwapRequests = () => {
    navigation.navigate('PendingSwapRequests');
  };

  const handleViewAllTasks = () => {
    if (groups.length > 0) {
      handleGroupPress(groups[0]);
    } else {
      Alert.alert('No Groups', 'Join a group to see your tasks');
    }
  };

  const handleGroupPress = (group: any) => {
    navigation.navigate('GroupTasks', {
      groupId: group.id,
      groupName: group.name,
      userRole: group.role || 'MEMBER'
    });
  };

  const handleViewNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleCreateGroup = () => {
    console.log('🎯 Navigating to CreateGroup screen');
    navigation.navigate('CreateGroup', {
      onGroupCreated: () => {
        console.log('📢 Callback from CreateGroup: Group created, refreshing...');
        refreshHomeData();
      }
    });
  };

  const handleJoinGroup = () => {
    console.log('🎯 Navigating to JoinGroup screen');
    navigation.navigate('JoinGroup', {
      onGroupJoined: () => {
        console.log('📢 Callback from JoinGroup: Group joined, refreshing...');
        refreshHomeData();
      }
    });
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  const handleOverdueTaskPress = (task: any) => {
    Alert.alert(
      '⚠️ Overdue Task',
      `"${task.title}" is overdue and cannot be completed.\n\nPlease contact your group admin if you have questions.`,
      [{ text: 'OK' }]
    );
  };

  const handleDismissRotationAlert = (groupId: string) => {
    setRotationAlerts(prev => {
      const newAlerts = { ...prev };
      delete newAlerts[groupId];
      return newAlerts;
    });
  };

  const handleRotation = useCallback((groupId: string, alert: any) => {
    setRotationAlerts(prev => ({
      ...prev,
      [groupId]: alert
    }));

    const group = groups.find((g: any) => g.id === groupId);

    Alert.alert(
      '🔄 New Week Started!',
      `${alert.groupName} is now on Week ${alert.newWeek}\n\n` +
      `You have ${alert.myTaskCount} new task(s) assigned.`,
      [
        {
          text: 'View Tasks',
          onPress: () => {
            navigation.navigate('GroupTasks', {
              groupId,
              groupName: alert.groupName,
              userRole: group?.role || 'MEMBER'
            });
            setRotationAlerts(prev => {
              const newAlerts = { ...prev };
              delete newAlerts[groupId];
              return newAlerts;
            });
          }
        },
        {
          text: 'Later',
          onPress: () => {
            setRotationAlerts(prev => {
              const newAlerts = { ...prev };
              delete newAlerts[groupId];
              return newAlerts;
            });
          }
        }
      ]
    );
  }, [groups, navigation]);

  const renderGroupListeners = () => {
    if (!groups.length || !currentUserId) return null;

    return groups.map((group: any) => (
      <GroupListener
        key={group.id}
        group={group}
        currentUserId={currentUserId}
        onRotation={handleRotation}
        onTaskChange={debouncedRefresh}
        onAssignmentChange={debouncedRefresh}
        onSwapChange={() => {
          debouncedRefresh();
          loadPendingForMe();
        }}
      />
    ));
  };

  const renderRotationBanners = () => {
    const alertEntries = Object.entries(rotationAlerts);
    if (alertEntries.length === 0) return null;

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
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !homeData) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshHomeData}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.retryButtonGradient}
            >
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

      {/* Header with Animation */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0]
              })
            }]
          }
        ]}
      >
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, {user.fullName?.split(' ')[0] || 'User'}!
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleViewNotifications}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.primary} />
            {unreadCount > 0 && (
              <Animated.View
                style={[
                  styles.badge,
                  {
                    transform: [{
                      scale: new Animated.Value(1)
                    }]
                  }
                ]}
              >
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 70 + insets.bottom }
        ]}
      >
        {/* Stats Grid with Animation */}
        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: statsAnim,
              transform: [{
                translateY: statsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <TouchableOpacity style={styles.statCard} onPress={handleViewGroups}>
            <LinearGradient
              colors={[COLORS.primaryLight, '#e8f5e9']}
              style={styles.statIconContainer}
            >
              <MaterialCommunityIcons name="account-group" size={24} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.statNumber}>{stats.groupsCount || 0}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={handleViewAllTasks}>
            <LinearGradient
              colors={[COLORS.primaryLight, '#e8f5e9']}
              style={styles.statIconContainer}
            >
              <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.statNumber}>{stats.tasksDueThisWeek || 0}</Text>
            <Text style={styles.statLabel}>Due This Week</Text>
            {stats.overdueTasks > 0 && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>{stats.overdueTasks} overdue</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={handleViewSwapRequests}>
            <LinearGradient
              colors={[COLORS.primaryLight, '#e8f5e9']}
              style={styles.statIconContainer}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={24} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.statNumber}>{stats.swapRequests || 0}</Text>
            <Text style={styles.statLabel}>Swap Requests</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions Section with Animation */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: quickActionsAnim,
              transform: [{
                translateY: quickActionsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleCreateGroup}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="plus-circle" size={24} color={COLORS.white} />
                <Text style={styles.quickActionText}>Create Group</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleJoinGroup}>
              <LinearGradient
                colors={[COLORS.gray, '#495057']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.white} />
                <Text style={styles.quickActionText}>Join Group</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleViewSwapRequests}>
              <LinearGradient
                colors={[COLORS.warning, '#e67700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={24} color={COLORS.white} />
                <Text style={styles.quickActionText}>My Swaps</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: statsAnim,
                transform: [{
                  translateY: statsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>⚠️ Overdue Tasks</Text>
            <View style={styles.overdueList}>
              {overdueTasks.slice(0, 3).map((task: any, index: number) => (
                <Animated.View
                  key={task.id}
                  style={{
                    opacity: statsAnim,
                    transform: [{
                      translateX: statsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0]
                      })
                    }]
                  }}
                >
                  <TouchableOpacity
                    style={styles.overdueTaskItem}
                    onPress={() => handleOverdueTaskPress(task)}
                  >
                    <LinearGradient colors={['#fff5f5', '#ffe3e3']} style={styles.overdueTaskGradient}>
                      <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
                      <View style={styles.overdueTaskContent}>
                        <Text style={styles.overdueTaskTitle} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <Text style={styles.overdueTaskGroup}>{task.groupName}</Text>
                      </View>
                      <Text style={styles.overdueTaskDays}>
                        {task.daysOverdue || 1}d overdue
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
              {overdueTasks.length > 3 && (
                <Text style={styles.moreOverdueText}>
                  +{overdueTasks.length - 3} more overdue tasks
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Your Groups with Animation */}
        {groups.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: groupsAnim,
                transform: [{
                  translateY: groupsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity onPress={handleViewGroups}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupsScroll}>
              {groups.slice(0, 5).map((group: any, index: number) => (
                <Animated.View
                  key={group.id}
                  style={{
                    opacity: groupsAnim,
                    transform: [{
                      scale: groupsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1]
                      })
                    }]
                  }}
                >
                  <TouchableOpacity
                    style={styles.groupCard}
                    onPress={() => handleGroupPress(group)}
                  >
                    {group.avatarUrl ? (
                      <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatar} />
                    ) : (
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.groupAvatarPlaceholder}
                      >
                        <Text style={styles.groupAvatarText}>
                          {group.name?.charAt(0) || 'G'}
                        </Text>
                      </LinearGradient>
                    )}
                    <Text style={styles.groupName} numberOfLines={1}>
                      {group.name || 'Group'}
                    </Text>
                    <View style={styles.groupRoleBadge}>
                      <Text style={[styles.groupRole, group.role === 'ADMIN' && styles.adminRole]}>
                        {group.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Upcoming Tasks with Animation */}
        {currentWeekTasks.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: tasksAnim,
                transform: [{
                  translateY: tasksAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
              <TouchableOpacity onPress={handleViewAllTasks}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tasksContainer}>
              {currentWeekTasks.slice(0, 3).map((task: any, index: number) => (
                <Animated.View
                  key={task.id}
                  style={{
                    opacity: tasksAnim,
                    transform: [{
                      translateX: tasksAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0]
                      })
                    }]
                  }}
                >
                  <TouchableOpacity
                    style={styles.taskCard}
                    onPress={() => navigation.navigate('AssignmentDetails', {
                      assignmentId: task.id,
                      isAdmin: false
                    })}
                  >
                    <LinearGradient
                      colors={[COLORS.primaryLight, '#e8f5e9']}
                      style={styles.taskIcon}
                    >
                      <MaterialCommunityIcons name="clipboard-text" size={20} color={COLORS.primary} />
                    </LinearGradient>
                    <View style={styles.taskContent}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text style={styles.taskGroup}>{task.groupName}</Text>
                    </View>
                    <View style={styles.taskRight}>
                      <Text style={styles.taskPoints}>+{task.points} pts</Text>
                      {task.daysLeft !== undefined && (
                        <Text style={[
                          styles.taskDaysLeft,
                          task.daysLeft === 0 && styles.taskDueToday,
                          task.daysLeft === 1 && styles.taskDueTomorrow
                        ]}>
                          {task.daysLeft === 0 ? 'Today' :
                            task.daysLeft === 1 ? 'Tomorrow' :
                              `${task.daysLeft} days`}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Recent Activity with Animation */}
        <Animated.View
          style={[
            styles.section,
            styles.lastSection,
            {
              opacity: activityAnim,
              transform: [{
                translateY: activityAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={handleViewNotifications}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length > 0 ? (
            <View style={styles.activityContainer}>
              {recentActivity.slice(0, 3).map((activity: any, index: number) => (
                <Animated.View
                  key={index}
                  style={{
                    opacity: activityAnim,
                    transform: [{
                      translateX: activityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0]
                      })
                    }]
                  }}
                >
                  <TouchableOpacity
                    style={styles.activityCard}
                    onPress={handleViewNotifications}
                  >
                    <LinearGradient
                      colors={[COLORS.primaryLight, '#e8f5e9']}
                      style={styles.activityIcon}
                    >
                      <MaterialCommunityIcons
                        name={activity.icon || 'bell-outline'}
                        size={20}
                        color={COLORS.primary}
                      />
                    </LinearGradient>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText} numberOfLines={1}>
                        {activity.title || activity.message}
                      </Text>
                      <Text style={styles.activityTime}>
                        {activity.timeAgo || 'Just now'}
                      </Text>
                    </View>
                    {!activity.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-outline" size={48} color="#dee2e6" />
              <Text style={styles.emptyStateText}>No recent activity</Text>
              <Text style={styles.emptyStateSubtext}>
                Complete tasks or join groups to see activity here
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Navigation with Animation */}
      <Animated.View
        style={[
          styles.bottomNav,
          { paddingBottom: insets.bottom },
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity style={styles.navItem} onPress={handleViewGroups}>
          <MaterialCommunityIcons name="account-group" size={24} color={COLORS.primary} />
          <Text style={styles.navText}>Groups</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.createButtonGradient}>
            <MaterialCommunityIcons name="plus" size={28} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleViewProfile}>
          <MaterialCommunityIcons name="account" size={24} color={COLORS.primary} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScreenWrapper>
  );
}