// src/screens/HomeScreen.tsx - FIXED bottom navigation
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHomeData } from '../homeHook/useHomeHook';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useNotifications } from '../notificationHook/useNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 👈 ADD THIS

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets(); // 👈 ADD THIS
  const { loading, refreshing, error, homeData, refreshHomeData, authError } = useHomeData();
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();
  const { unreadCount, loadUnreadCount, refreshNotifications } = useNotifications();
  
  const { events, clearNewNotification } = useRealtimeNotifications({
    onNewNotification: (notification) => {
      console.log('📢 HomeScreen: New notification received', notification);
      
      if (notification.type?.includes('TASK') || 
          notification.type?.includes('ASSIGNMENT') ||
          notification.type?.includes('SUBMISSION')) {
        refreshHomeData();
      }
      
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
      'LATE_SUBMISSION'
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
        [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]
      );
    }
  }, [authError, navigation]);

  const user = homeData?.user || { 
    fullName: 'User', 
    groupsCount: 0, 
    tasksDue: 0,
    email: '',
    avatarUrl: null,
    pointsThisWeek: 0,
    totalPoints: 0
  };
  
  const stats = homeData?.stats || { 
    groupsCount: 0, 
    tasksDueThisWeek: 0, 
    overdueTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    completionRate: 0,
    swapRequests: 0,
    pointsThisWeek: 0
  };
  
  const recentActivity = homeData?.recentActivity || [];
  const groups = homeData?.groups || [];
  const leaderboard = homeData?.leaderboard || [];
  const currentWeekTasks = homeData?.currentWeekTasks || [];
  const overdueTasks = homeData?.overdueTasks || [];

  const handleViewGroups = () => {
    try {
      navigation.navigate('MyGroups');
    } catch (error) {
      Alert.alert('Navigation Error', 'Could not navigate to groups');
    }
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
    try {
      navigation.navigate('GroupTasks', { 
        groupId: group.id,
        groupName: group.name,
        userRole: group.role || 'MEMBER'
      });
    } catch (error) {
      Alert.alert('Navigation Error', 'Could not navigate to group tasks');
    }
  };

  const handleViewNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup', {
      onGroupCreated: () => {
        refreshHomeData();
      }
    });
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  // ✅ FIXED: Overdue tasks now show message instead of navigating
  const handleOverdueTaskPress = (task: any) => {
    Alert.alert(
      '⚠️ Overdue Task',
      `"${task.title}" is overdue and cannot be completed.\n\nPlease contact your group admin if you have questions.`,
      [{ text: 'OK' }]
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !homeData) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={refreshHomeData}
          >
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

  return (
    <ScreenWrapper noBottom={true} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, {user.fullName?.split(' ')[0] || 'User'}!
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Notification Button */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleViewNotifications}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color="#2b8a3e" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Swap Request Button */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleViewPendingSwapRequests}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={24} color="#2b8a3e" />
            {totalPendingForMe > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalPendingForMe}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refreshHomeData();
              loadPendingForMe();
              loadUnreadCount();
            }}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        // 👇 FIXED: Add bottom padding to account for bottom nav + safe area
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 70 + insets.bottom }
        ]}
      >
        {/* Points Card */}
        <LinearGradient
          colors={['#2b8a3e', '#1e6b2c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsCard}
        >
          <View style={styles.pointsCardContent}>
            <View>
              <Text style={styles.pointsCardLabel}>Total Points</Text>
              <Text style={styles.pointsCardValue}>{user.totalPoints || 0}</Text>
            </View>
            <View style={styles.pointsCardIcon}>
              <MaterialCommunityIcons name="trophy" size={32} color="white" />
            </View>
          </View>
          <View style={styles.pointsCardFooter}>
            <Text style={styles.pointsCardFooterText}>
              {stats.pointsThisWeek || 0} points this week
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Grid - 3 CARDS */}
        <View style={styles.statsGrid}>
          {/* Groups Card */}
          <TouchableOpacity 
            style={styles.statCard}
            onPress={handleViewGroups}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="account-group" size={24} color="#2b8a3e" />
            </View>
            <Text style={styles.statNumber}>{stats.groupsCount || 0}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </TouchableOpacity>

          {/* Due This Week Card */}
          <TouchableOpacity 
            style={styles.statCard}
            onPress={handleViewAllTasks}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#2b8a3e" />
            </View>
            <Text style={styles.statNumber}>{stats.tasksDueThisWeek || 0}</Text>
            <Text style={styles.statLabel}>Due This Week</Text>
            {stats.overdueTasks > 0 && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>{stats.overdueTasks} overdue</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Swap Requests Card */}
          <TouchableOpacity 
            style={styles.statCard}
            onPress={handleViewSwapRequests}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={24} color="#2b8a3e" />
            </View>
            <Text style={styles.statNumber}>{stats.swapRequests || 0}</Text>
            <Text style={styles.statLabel}>Swap Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Overdue Tasks List */}
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Overdue Tasks</Text>
            <View style={styles.overdueList}>
              {overdueTasks.slice(0, 3).map((task: any) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.overdueTaskItem}
                  onPress={() => handleOverdueTaskPress(task)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#fff5f5', '#ffe3e3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.overdueTaskGradient}
                  >
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#fa5252" />
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
              ))}
              {overdueTasks.length > 3 && (
                <Text style={styles.moreOverdueText}>
                  +{overdueTasks.length - 3} more overdue tasks
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Your Groups */}
        {groups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity onPress={handleViewGroups}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.groupsScroll}
            >
              {groups.slice(0, 5).map((group: any) => (
                <TouchableOpacity 
                  key={group.id}
                  style={styles.groupCard}
                  onPress={() => handleGroupPress(group)}
                  activeOpacity={0.7}
                >
                  {group.avatarUrl ? (
                    <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatar} />
                  ) : (
                    <LinearGradient
                      colors={['#2b8a3e', '#1e6b2c']}
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
                    <Text style={[
                      styles.groupRole,
                      group.role === 'ADMIN' && styles.adminRole
                    ]}>
                      {group.role === 'ADMIN' ? 'Admin' : 'Member'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Tasks Preview */}
        {currentWeekTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
              <TouchableOpacity onPress={handleViewAllTasks}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.tasksContainer}>
              {currentWeekTasks.slice(0, 3).map((task: any) => (
                <TouchableOpacity 
                  key={task.id} 
                  style={styles.taskCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    navigation.navigate('AssignmentDetails', { 
                      assignmentId: task.id,
                      isAdmin: false 
                    });
                  }}
                >
                  <View style={[styles.taskIcon, { backgroundColor: '#e8f5e9' }]}>
                    <MaterialCommunityIcons name="clipboard-text" size={20} color="#2b8a3e" />
                  </View>
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
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={handleViewNotifications}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentActivity.length > 0 ? (
            <View style={styles.activityContainer}>
              {recentActivity.slice(0, 3).map((activity: any, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.activityCard}
                  activeOpacity={0.7}
                  onPress={handleViewNotifications}
                >
                  <View style={[
                    styles.activityIcon,
                    { backgroundColor: '#e8f5e9' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={activity.icon || 'bell-outline'} 
                      size={20} 
                      color="#2b8a3e" 
                    />
                  </View>
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
        </View>
      </ScrollView>

      {/* 👇 FIXED: Bottom Navigation with safe area padding */}
      <View style={[
        styles.bottomNav,
        { paddingBottom: insets.bottom }
      ]}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('MyGroups')}
        >
          <MaterialCommunityIcons name="account-group" size={24} color="#2b8a3e" />
          <Text style={styles.navText}>Groups</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateGroup}
        >
          <LinearGradient
            colors={['#2b8a3e', '#1e6b2c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <MaterialCommunityIcons name="plus" size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleViewProfile}
        >
          <MaterialCommunityIcons name="account" size={24} color="#2b8a3e" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#868e96',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fa5252',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 80, // Space for bottom nav
  },
  pointsCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pointsCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsCardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  pointsCardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  pointsCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsCardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  pointsCardFooterText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '30%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: '1.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
  },
  overdueBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  overdueBadgeText: {
    fontSize: 9,
    color: '#fa5252',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2b8a3e',
    fontWeight: '600',
  },
  // Overdue Task Styles
  overdueList: {
    gap: 8,
  },
  overdueTaskItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  overdueTaskGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  overdueTaskContent: {
    flex: 1,
  },
  overdueTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  overdueTaskGroup: {
    fontSize: 12,
    color: '#868e96',
  },
  overdueTaskDays: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fa5252',
  },
  moreOverdueText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#868e96',
    marginTop: 8,
    fontStyle: 'italic',
  },
  groupsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  groupCard: {
    width: 120,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  groupAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 4,
  },
  groupRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  groupRole: {
    fontSize: 10,
    color: '#868e96',
    fontWeight: '500',
  },
  adminRole: {
    color: '#2b8a3e',
    fontWeight: '600',
  },
  tasksContainer: {
    gap: 8,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  taskGroup: {
    fontSize: 12,
    color: '#868e96',
  },
  taskRight: {
    alignItems: 'flex-end',
  },
  taskPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 2,
  },
  taskDaysLeft: {
    fontSize: 11,
    color: '#868e96',
  },
  taskDueToday: {
    color: '#fa5252',
    fontWeight: '600',
  },
  taskDueTomorrow: {
    color: '#e67700',
    fontWeight: '500',
  },
  activityContainer: {
    gap: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#868e96',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2b8a3e',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#868e96',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#868e96',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#fa5252',
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
    bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingTop: 12, // Add top padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  createButton: {
    marginTop: -20,
  },
  createButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
});