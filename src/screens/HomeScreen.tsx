// HomeScreen.tsx - UPDATED with cleaner UI and proper icon colors
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
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
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const { loading, refreshing, error, homeData, refreshHomeData, authError } = useHomeData();
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();
  const { unreadCount, loadUnreadCount } = useNotifications();

  useEffect(() => {
    loadPendingForMe();
    loadUnreadCount();
  }, []);

  // Show auth error if needed
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
    tasksDue: 0, 
    completedTasks: 0,
    totalTasks: 0,
    completionRate: 0,
    overdueTasks: 0,
    swapRequests: 0,
    pointsThisWeek: 0
  };
  
  const recentActivity = homeData?.recentActivity || [];
  const groups = homeData?.groups || [];
  const leaderboard = homeData?.leaderboard || [];
  const currentWeekTasks = homeData?.currentWeekTasks || [];

  const handleViewGroups = () => {
    try {
      navigation.navigate('MyGroups');
    } catch (error) {
      Alert.alert('Navigation Error', 'Could not navigate to groups');
    }
  };

  const handleViewCompletedTasks = () => {
    Alert.alert('Coming Soon', 'Task history screen will show your completed tasks');
  };
 
  const handleViewSwapRequests = () => {
    navigation.navigate('MySwapRequests');
  };

  const handleViewPendingSwapRequests = () => {
    navigation.navigate('PendingSwapRequests');
  };

  const handleViewLeaderboard = () => {
    Alert.alert('Coming Soon', 'Leaderboard will be implemented soon!');
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !homeData) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  } 

  return (
    <SafeAreaView style={styles.container}>
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
            <MaterialCommunityIcons name="bell-outline" size={24} color="#495057" />
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
            <MaterialCommunityIcons name="swap-horizontal" size={24} color="#4F46E5" />
            {totalPendingForMe > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalPendingForMe}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Profile Button */}
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.fullName?.charAt(0) || 'U'}
                </Text>
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

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
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

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => {
              if (groups.length > 0) handleGroupPress(groups[0]);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#e67700" />
            </View>
            <Text style={styles.statNumber}>{stats.tasksDue || 0}</Text>
            <Text style={styles.statLabel}>Due This Week</Text>
            {stats.overdueTasks > 0 && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>{stats.overdueTasks} overdue</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={handleViewCompletedTasks}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#2b8a3e" />
            </View>
            <Text style={styles.statNumber}>{stats.completedTasks || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={handleViewSwapRequests}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#ede7f6' }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.statNumber}>{stats.swapRequests || 0}</Text>
            <Text style={styles.statLabel}>Swap Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('CreateGroup')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionIcon}
              >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionTitle}>Create Group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('JoinGroup')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionIcon}
              >
                <MaterialCommunityIcons name="link" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionTitle}>Join Group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleViewSwapRequests}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionIcon}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionTitle}>My Swaps</Text>
            </TouchableOpacity>
          </View>
        </View>

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
                    { backgroundColor: activity.type === 'task' ? '#e8f5e9' : '#f8f9fa' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={activity.icon || 'bell-outline'} 
                      size={20} 
                      color={activity.type === 'task' ? '#2b8a3e' : '#495057'} 
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
    </SafeAreaView>
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
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
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
    width: '46%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: '2%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#868e96',
  },
  overdueBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueBadgeText: {
    fontSize: 10,
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
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
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
});