// src/screens/HomeScreen.tsx - Option C: Task-First, Group-Labeled
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

// ─── helpers ────────────────────────────────────────────────────────────────

const isToday = (date: Date | string): boolean => {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth()    === now.getUTCMonth()    &&
    d.getUTCDate()     === now.getUTCDate()
  );
};

const isTomorrow = (date: Date | string): boolean => {
  const d = new Date(date);
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return (
    d.getUTCFullYear() === tomorrow.getUTCFullYear() &&
    d.getUTCMonth()    === tomorrow.getUTCMonth()    &&
    d.getUTCDate()     === tomorrow.getUTCDate()
  );
};

const dueLabelText = (task: any): string => {
  if (isToday(task.dueDate))     return 'Today';
  if (isTomorrow(task.dueDate))  return 'Tomorrow';
  if (task.daysLeft !== undefined) return `${task.daysLeft}d left`;
  return '';
};

// Add this helper function at the top of HomeScreen (outside component)
const convertUTCToPHT = (utcDateString: string): { date: string; time: string } => {
  const date = new Date(utcDateString);
  // Add 8 hours to convert UTC to PHT
  const phtDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  
  const year = phtDate.getUTCFullYear();
  const month = phtDate.getUTCMonth();
  const day = phtDate.getUTCDate();
  const hours = phtDate.getUTCHours();
  const minutes = phtDate.getUTCMinutes();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  
  return {
    date: `${monthNames[month]} ${day}, ${year}`,
    time: `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  };
};

// Helper to format time slot to PHT
const formatTimeSlotToPHT = (timeSlot: any) => {
  if (!timeSlot) return '';
  
  // Convert start time (PHT string) to display format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  return `${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}`;
};

// ─── component ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeHomeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rotationAlerts, setRotationAlerts] = useState<{ [key: string]: any }>({});

  const animations = useMemo(() => ({
    header:       new Animated.Value(0),
    focus:        new Animated.Value(0),
    upcoming:     new Animated.Value(0),
    groups:       new Animated.Value(0),
    quickActions: new Animated.Value(0),
    activity:     new Animated.Value(0),
  }), []);

  const isMounted = useRef(true);

  const { loading, refreshing, error, homeData, refreshHomeData, authError } = useHomeData();
  const { loadPendingForMe } = useSwapRequests();
  const { unreadCount, loadUnreadCount, refreshNotifications } = useNotifications();

  // ── entrance animations (once) ──────────────────────────────────────────
  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(animations.header,       { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(animations.focus,        { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(animations.upcoming,     { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(animations.groups,       { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(animations.quickActions, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(animations.activity,     { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // ── realtime group ──────────────────────────────────────────────────────
  const { events: groupEvents, clearGroupCreated } = useRealtimeGroup('');
  useEffect(() => {
    if (groupEvents.groupCreated) { refreshHomeData(); clearGroupCreated(); }
  }, [groupEvents.groupCreated, refreshHomeData, clearGroupCreated]);

  // ── current user ────────────────────────────────────────────────────────
  useEffect(() => {
    const getUserId = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user && isMounted.current) setCurrentUserId(user.id);
      } catch (e) { console.error('Error getting user ID:', e); }
    };
    getUserId();
  }, []);

  // ── realtime notifications ──────────────────────────────────────────────
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
      'POINT_DEDUCTION', 'LATE_SUBMISSION', 'ROTATION_COMPLETED',
    ],
  });

  useEffect(() => {
    if (events.newNotification) clearNewNotification();
  }, [events.newNotification, clearNewNotification]);

  useEffect(() => {
    loadPendingForMe();
    loadUnreadCount();
  }, [loadPendingForMe, loadUnreadCount]);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) },
      ]);
    }
  }, [authError, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
      loadPendingForMe();
    }, [loadUnreadCount, loadPendingForMe])
  );

  // ── derived data ────────────────────────────────────────────────────────
  const user            = homeData?.user         || { fullName: 'User', email: '', avatarUrl: null };
  const recentActivity  = homeData?.recentActivity  || [];
  const currentWeekTasks = homeData?.currentWeekTasks || [];
  const overdueTasks    = homeData?.overdueTasks    || [];
  const groups          = homeData?.groups          || [];
  const swapRequests    = homeData?.stats?.swapRequests || 0;

  // ── Option C filtering ──────────────────────────────────────────────────
  const todayTasks = useMemo(
    () => currentWeekTasks.filter((t: any) => isToday(t.dueDate)),
    [currentWeekTasks]
  );

  const upcomingTasks = useMemo(
    () => currentWeekTasks.filter((t: any) => !isToday(t.dueDate)),
    [currentWeekTasks]
  );

  // ── handlers ────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    refreshHomeData();
    loadPendingForMe();
    loadUnreadCount();
  }, [refreshHomeData, loadPendingForMe, loadUnreadCount]);

  const handleGroupPress = useCallback((group: any) => {
    navigation.navigate('GroupTasks', {
      groupId:   group.id,
      groupName: group.name,
      userRole:  group.role || 'MEMBER',
    });
  }, [navigation]);

  const handleViewAllTasks = useCallback(() => {
    if (groups.length > 0) handleGroupPress(groups[0]);
    else Alert.alert('No Groups', 'Join a group to see your tasks');
  }, [groups, handleGroupPress]);

  const handleCreateGroup = useCallback(() => {
    navigation.navigate('CreateGroup', { onGroupCreated: () => refreshHomeData() });
  }, [navigation, refreshHomeData]);

  const handleJoinGroup = useCallback(() => {
    navigation.navigate('JoinGroup', { onGroupJoined: () => refreshHomeData() });
  }, [navigation, refreshHomeData]);

  const handleOverdueTaskPress = useCallback((task: any) => {
    Alert.alert('⚠️ Overdue Task', `"${task.title}" is overdue and cannot be completed.`, [{ text: 'OK' }]);
  }, []);

  const handleDismissRotationAlert = useCallback((groupId: string) => {
    setRotationAlerts(prev => { const n = { ...prev }; delete n[groupId]; return n; });
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
            navigation.navigate('GroupTasks', { groupId, groupName: alert.groupName, userRole: group?.role || 'MEMBER' });
            handleDismissRotationAlert(groupId);
          },
        },
        { text: 'Later', onPress: () => handleDismissRotationAlert(groupId) },
      ]
    );
  }, [groups, navigation, handleDismissRotationAlert]);

  // ── sub-renders ─────────────────────────────────────────────────────────
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
    const entries = Object.entries(rotationAlerts);
    if (!entries.length) return null;
    return (
      <View style={styles.bannerContainer}>
        {entries.map(([groupId, alert]) => (
          <RotationBanner
            key={groupId}
            groupName={(alert as any).groupName}
            newWeek={(alert as any).newWeek}
            taskCount={(alert as any).myTaskCount}
            onPress={() => {
              navigation.navigate('GroupTasks', {
                groupId,
                groupName: (alert as any).groupName,
                userRole: groups.find((g: any) => g.id === groupId)?.role || 'MEMBER',
              });
              handleDismissRotationAlert(groupId);
            }}
            onClose={() => handleDismissRotationAlert(groupId)}
          />
        ))}
      </View>
    );
  }, [rotationAlerts, styles, navigation, groups, handleDismissRotationAlert]);

 const renderTaskCard = useCallback((task: any) => {
  const dueToday    = isToday(task.dueDate);
  const dueTomorrow = isTomorrow(task.dueDate);
  const label       = dueLabelText(task);
  const dueColor = dueToday ? theme.error : dueTomorrow ? '#e67700' : theme.textMuted;
  
  // Get time slot display text in PHT
  const timeSlotText = task.timeSlot ? formatTimeSlotToPHT(task.timeSlot) : '';
  
  // Convert due date to PHT for display
  const phtDisplay = convertUTCToPHT(task.dueDate);
  const displayDate = dueToday ? 'Today' : dueTomorrow ? 'Tomorrow' : phtDisplay.date;
  
  return (
    <TouchableOpacity
      key={task.id}
      style={styles.taskCard}
      onPress={() => {
        console.log(`📱 [HomeScreen] Opening task:`, {
          taskId: task.taskId,
          title: task.title,
          assignmentId: task.id,
          timeSlot: timeSlotText
        });
        
        // ✅ Navigate to TaskDetails for ALL tasks - it handles everything correctly
        navigation.navigate('TaskDetails', {
          taskId: task.taskId,
          groupId: task.groupId,
          userRole: 'MEMBER',
        });
      }}
      activeOpacity={0.7}
    >
      {/* left accent dot */}
      <View style={[styles.taskDot, { backgroundColor: dueToday ? theme.error : theme.primary }]} />

      {/* content */}
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
        <View style={styles.taskMetaRow}>
          {/* group pill */}
          <View style={[styles.groupPill, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.groupPillText, { color: theme.primary }]} numberOfLines={1}>
              {task.groupName}
            </Text>
          </View>
          {/* Show time slot if available (PHT format) */}
          {timeSlotText ? (
            <Text style={[styles.taskMetaText, { color: theme.textMuted }]}>{timeSlotText}</Text>
          ) : null}
        </View>
      </View>

      {/* right side */}
      <View style={styles.taskRight}>
        <Text style={styles.taskPoints}>+{task.points} pts</Text>
        {label ? (
          <Text style={[styles.taskDueLabel, { color: dueColor }]}>{label}</Text>
        ) : (
          <Text style={[styles.taskDueLabel, { color: theme.textMuted }]}>{displayDate}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}, [theme, styles, navigation]);


  // ── loading / error states ───────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading your Home...</Text>
        </View>
      </ScreenWrapper>
    );
  }

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

  const firstName = user.fullName?.split(' ')[0] || 'User';

  // ── main render ──────────────────────────────────────────────────────────
  return (
    <ScreenWrapper noBottom={true} style={styles.container}>
      {renderGroupListeners()}
      {renderRotationBanners()}

      {/* ── Header ── */}
      <Animated.View style={[
        styles.header,
        {
          opacity: animations.header,
          transform: [{ translateY: animations.header.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        },
      ]}>
        <View>
          <Text style={styles.headerTitle}>Home</Text>
          <Text style={styles.headerSubtitle}>Welcome back, {firstName}!</Text>
        </View>
        <View style={styles.headerRight}>
          {swapRequests > 0 && (
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('MySwapRequests')}>
              <MaterialCommunityIcons name="swap-horizontal" size={22} color={theme.primary} />
              <Animated.View style={styles.badge}>
                <Text style={styles.badgeText}>{swapRequests > 9 ? '9+' : swapRequests}</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 70 + insets.bottom }]}
      >

        {/* ── Overdue banner ── */}
        {overdueTasks.length > 0 && (
          <View style={styles.overdueBanner}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={theme.error} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.overdueBannerText, { color: theme.error }]}>
                {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'}
              </Text>
              <Text style={[styles.overdueBannerSub, { color: theme.textMuted }]}>
                {overdueTasks.slice(0, 2).map((t: any) => t.title).join(', ')}
                {overdueTasks.length > 2 ? ` +${overdueTasks.length - 2} more` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={handleViewAllTasks}>
              <Text style={[styles.overdueBannerLink, { color: theme.error }]}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Today's Focus ── */}
        <Animated.View style={[
          styles.section,
          {
            opacity: animations.focus,
            transform: [{ translateY: animations.focus.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's focus</Text>
            {todayTasks.length > 3 && (
              <TouchableOpacity onPress={handleViewAllTasks}>
                <Text style={styles.seeAllText}>See all ({todayTasks.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {todayTasks.length > 0 ? (
            <View style={styles.tasksContainer}>
              {todayTasks.slice(0, 4).map(renderTaskCard)}
            </View>
          ) : (
            <View style={styles.emptyFocusCard}>
              <MaterialCommunityIcons name="check-circle-outline" size={36} color={theme.border} />
              <Text style={styles.emptyFocusTitle}>All clear today</Text>
              <Text style={styles.emptyFocusSub}>No tasks due today — check upcoming tasks below</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Upcoming this week ── */}
        {upcomingTasks.length > 0 && (
          <Animated.View style={[
            styles.section,
            {
              opacity: animations.upcoming,
              transform: [{ translateY: animations.upcoming.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            },
          ]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming this week</Text>
              {upcomingTasks.length > 3 && (
                <TouchableOpacity onPress={handleViewAllTasks}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.tasksContainer}>
              {upcomingTasks.slice(0, 3).map(renderTaskCard)}
            </View>
          </Animated.View>
        )}

        {/* ── Your Groups ── */}
        {groups.length > 0 && (
          <Animated.View style={[
            styles.section,
            {
              opacity: animations.groups,
              transform: [{ translateY: animations.groups.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            },
          ]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your groups</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyGroups')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupsScroll}>
              {groups.slice(0, 6).map((group: any) => {
                const groupTaskCount = currentWeekTasks.filter(
                  (t: any) => t.groupId === group.id
                ).length;

                const isGroupAdmin = group.role === 'ADMIN';
                const badgeLabel = groupTaskCount > 0
                  ? `${groupTaskCount} task${groupTaskCount > 1 ? 's' : ''}`
                  : isGroupAdmin
                    ? 'admin'
                    : 'no tasks';
                const badgeBg    = groupTaskCount > 0 ? theme.primaryLight : theme.bgTertiary;
                const badgeColor = groupTaskCount > 0 ? theme.primary : theme.textMuted;

                return (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.groupCard}
                    onPress={() => handleGroupPress(group)}
                    activeOpacity={0.7}
                  >
                    {group.avatarUrl ? (
                      <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatar} />
                    ) : (
                      <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.groupAvatarPlaceholder}>
                        <Text style={styles.groupAvatarText}>{group.name?.charAt(0) || 'G'}</Text>
                      </LinearGradient>
                    )}
                    <Text style={styles.groupName} numberOfLines={1}>{group.name || 'Group'}</Text>

                    {/* task count / role badge */}
                    <View style={[styles.groupTaskBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.groupTaskBadgeText, { color: badgeColor }]}>
                        {badgeLabel}
                      </Text>
                    </View>

                    <View style={styles.groupRoleBadge}>
                      <Text style={[styles.groupRole, group.role === 'ADMIN' && styles.adminRole]}>
                        {group.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Quick Actions ── */}
        <Animated.View style={[
          styles.section,
          {
            opacity: animations.quickActions,
            transform: [{ translateY: animations.quickActions.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={[styles.quickActionsGrid, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleCreateGroup}>
              <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="plus-circle" size={22} color="#fff" />
                <Text style={styles.quickActionText}>Create group</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleJoinGroup}>
              <LinearGradient colors={[theme.textMuted, '#495057']} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="account-plus" size={22} color="#fff" />
                <Text style={styles.quickActionText}>Join group</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('MySwapRequests')}>
              <LinearGradient colors={['#fd7e14', '#e67700']} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="swap-horizontal" size={22} color="#fff" />
                <Text style={styles.quickActionText}>My swaps</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Recent Activity ── */}
        <Animated.View style={[
          styles.section,
          styles.lastSection,
          {
            opacity: animations.activity,
            transform: [{ translateY: animations.activity.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.seeAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length > 0 ? (
            <View style={styles.activityContainer}>
              {recentActivity.slice(0, 3).map((activity: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.activityCard}
                  onPress={() => navigation.navigate('Notifications')}
                >
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

      {/* ── Bottom Navigation ── */}
      <Animated.View style={[
        styles.bottomNav,
        { paddingBottom: insets.bottom },
        {
          opacity: animations.header,
          transform: [{ translateY: animations.header.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
        },
      ]}>
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