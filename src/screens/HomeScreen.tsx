// HomeScreen.tsx - UPDATED for simplified hook
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
import { useHomeData } from '../homeHook/useHomeHook';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { useNotifications } from '../notificationHook/useNotifications';
import { AssignmentService } from '../services/AssignmentService';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const { loading, refreshing, error, homeData, refreshHomeData, authError } = useHomeData();
  const { totalPendingForMe, loadPendingForMe } = useSwapRequests();
  const { unreadCount, loadUnreadCount } = useNotifications();
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<any[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  useEffect(() => {
    loadPendingForMe();
    loadUnreadCount();
    fetchUpcomingAssignments();
    fetchTodayAssignments();
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

  const fetchUpcomingAssignments = async () => {
    setLoadingUpcoming(true);
    try {
      console.log("🔍 Fetching upcoming...");
      const result = await AssignmentService.getUpcomingAssignments({ limit: 5 });
      console.log("📦 Upcoming result:", JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        console.log("✅ Upcoming assignments count:", result.data.assignments?.length);
        setUpcomingAssignments(result.data.assignments || []);
      } else {
        console.log("⚠️ No upcoming data");
        setUpcomingAssignments([]);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setUpcomingAssignments([]);
    } finally {
      setLoadingUpcoming(false);
    } 
  };

  const fetchTodayAssignments = async () => {
    try {
      console.log("🔍 Fetching today...");
      const result = await AssignmentService.getTodayAssignments();
      console.log("📦 Today result:", JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        console.log("✅ Today assignments count:", result.data.assignments?.length);
        setTodayAssignments(result.data.assignments || []);
      } else {
        console.log("⚠️ No today data");
        setTodayAssignments([]);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setTodayAssignments([]);
    }
  };

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
    console.log("🔍 Attempting to navigate to 'MyGroups' screen");
    
    try {
      navigation.navigate('MyGroups');
      console.log("✅ Navigation to MyGroups successful");
    } catch (error) {
      console.error("❌ Navigation error:", error);
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
    console.log("🔍 Attempting to navigate to 'GroupTasks' screen");
    console.log("With group ID:", group?.id);
    
    try {
      navigation.navigate('GroupTasks', { 
        groupId: group.id,
        groupName: group.name,
        userRole: group.role || 'MEMBER'
      });
      console.log("✅ Navigation to GroupTasks successful");
    } catch (error) {
      console.error("❌ Navigation error:", error);
      Alert.alert('Navigation Error', 'Could not navigate to group tasks');
    }
  };

  const handleViewNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleAssignmentPress = (assignmentId: string) => {
    navigation.navigate('AssignmentDetails', {
      assignmentId,
      isAdmin: false
    });
  };

  const formatTimeLeft = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      return `${mins}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const renderUpcomingTasks = () => {
    if (loadingUpcoming) {
      return (
        <View style={styles.upcomingLoading}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.upcomingLoadingText}>Loading upcoming tasks...</Text>
        </View>
      );
    }

    if (upcomingAssignments.length === 0 && todayAssignments.length === 0) {
      return (
        <View style={styles.upcomingEmpty}>
          <MaterialCommunityIcons name="calendar-clock" size={48} color="#dee2e6" />
          <Text style={styles.upcomingEmptyText}>No upcoming tasks</Text>
          <Text style={styles.upcomingEmptySubtext}>
            Your scheduled tasks will appear here
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.upcomingContainer}>
        {/* Today's Assignments - Priority */}
        {todayAssignments.length > 0 && (
          <View style={styles.todaySection}>
            <Text style={styles.todaySectionTitle}>📅 Due Today</Text>
            {todayAssignments.map((assignment: any) => (
              <TouchableOpacity
                key={assignment.id}
                style={[
                  styles.upcomingCard,
                  assignment.canSubmit && styles.submittableCard,
                  assignment.willBePenalized && styles.penaltyCard
                ]}
                onPress={() => handleAssignmentPress(assignment.id)}
                activeOpacity={0.7}
              >
                <View style={styles.upcomingHeader}>
                  <View style={[
                    styles.upcomingIcon,
                    assignment.canSubmit ? { backgroundColor: '#2b8a3e' } :
                    assignment.willBePenalized ? { backgroundColor: '#e67700' } :
                    { backgroundColor: '#FF9500' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={assignment.canSubmit ? "clock-check" : "clock"} 
                      size={16} 
                      color="white" 
                    />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle} numberOfLines={1}>
                      {assignment.taskTitle}
                    </Text>
                    <Text style={styles.upcomingGroup}>
                      {assignment.group?.name || 'Group'}
                    </Text>
                  </View>
                  {assignment.timeLeft && (
                    <View style={[
                      styles.timeLeftPill,
                      assignment.timeLeft < 300 ? styles.urgentPill : styles.normalPill
                    ]}>
                      <Text style={[
                        styles.timeLeftPillText,
                        assignment.timeLeft < 300 ? styles.urgentPillText : styles.normalPillText
                      ]}>
                        {formatTimeLeft(assignment.timeLeft)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.upcomingFooter}>
                  <Text style={styles.upcomingTime}>
                    {assignment.timeSlot ? 
                      `${assignment.timeSlot.startTime} - ${assignment.timeSlot.endTime}` : 
                      'Anytime'}
                  </Text>
                  {assignment.canSubmit && (
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableBadgeText}>Available Now</Text>
                    </View>
                  )}
                  {assignment.willBePenalized && (
                    <View style={styles.penaltyBadge}>
                      <Text style={styles.penaltyBadgeText}>Late</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Future Assignments */}
        {upcomingAssignments.filter((a: any) => !a.isToday).length > 0 && (
          <View style={styles.futureSection}>
            <Text style={styles.futureSectionTitle}>📋 Coming Up</Text>
            {upcomingAssignments
              .filter((a: any) => !a.isToday)
              .slice(0, 3)
              .map((assignment: any) => (
                <TouchableOpacity
                  key={assignment.id}
                  style={styles.futureCard}
                  onPress={() => handleAssignmentPress(assignment.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.futureHeader}>
                    <View style={[styles.futureIcon, { backgroundColor: '#6c757d' }]}>
                      <MaterialCommunityIcons name="calendar" size={14} color="white" />
                    </View>
                    <View style={styles.futureContent}>
                      <Text style={styles.futureTitle} numberOfLines={1}>
                        {assignment.taskTitle}
                      </Text>
                      <Text style={styles.futureDate}>
                        {new Date(assignment.dueDate).toLocaleDateString()} • {assignment.timeSlot?.startTime || 'Anytime'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {upcomingAssignments.length > 5 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('UpcomingTasks')}
          >
            <Text style={styles.viewAllText}>View All Upcoming Tasks</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !homeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={refreshHomeData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  } 

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome to GroupTask
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Notification Button */}
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={handleViewNotifications}
          >
            <MaterialCommunityIcons name="bell" size={24} color="#4F46E5" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Swap Request Button */}
          <TouchableOpacity 
            style={styles.swapButton}
            onPress={handleViewPendingSwapRequests}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={24} color="#4F46E5" />
            {totalPendingForMe > 0 && (
              <View style={styles.swapBadge}>
                <Text style={styles.swapBadgeText}>{totalPendingForMe}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Profile Button */}
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {user.avatarUrl ? (
              <Image 
                source={{ uri: user.avatarUrl }} 
                style={styles.avatar} 
              />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refreshHomeData();
              fetchUpcomingAssignments();
              fetchTodayAssignments();
              loadPendingForMe();
              loadUnreadCount();
            }}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user.fullName || 'User'} 👋
            </Text>
            {user.email && (
              <Text style={styles.userEmail}>{user.email}</Text>
            )}
          </View>
          <View style={styles.pointsBadge}>
            <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.pointsText}>{user.totalPoints || 0}</Text>
          </View>
        </View>

        {/* UPCOMING TASKS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            <TouchableOpacity onPress={fetchUpcomingAssignments}>
              <MaterialCommunityIcons name="refresh" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          {renderUpcomingTasks()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Overview</Text>
          
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={handleViewGroups}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, { backgroundColor: '#4CD964' }]}>
                <MaterialCommunityIcons name="account-group" size={22} color="white" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{stats.groupsCount || 0}</Text>
                <Text style={styles.statLabel}>Groups</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            {stats.groupsCount > 0 && stats.tasksDue > 0 && (
              <TouchableOpacity 
                style={[styles.statCard, styles.urgentCard]}
                onPress={() => {
                  if (groups.length > 0) {
                    handleGroupPress(groups[0]);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.statIcon, { backgroundColor: '#FF9500' }]}>
                  <MaterialCommunityIcons name="clipboard-clock" size={22} color="white" />
                </View>
                <View style={styles.statContent}>
                  <Text style={[styles.statNumber, styles.urgentNumber]}>
                    {stats.tasksDue || 0}
                  </Text>
                  <Text style={styles.statLabel}>Due This Week</Text>
                  {stats.overdueTasks > 0 && (
                    <Text style={styles.overdueBadge}>
                      {stats.overdueTasks} overdue
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons 
                  name="alert-circle" 
                  size={18} 
                  color="#FF3B30" 
                />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.statCard}
              onPress={handleViewCompletedTasks}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, { backgroundColor: '#34c759' }]}>
                <MaterialCommunityIcons name="check-circle" size={22} color="white" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{stats.completedTasks || 0}</Text>
                <Text style={styles.statLabel}>Completed</Text>
                {stats.completionRate > 0 && (
                  <Text style={styles.completionRate}>
                    {stats.completionRate.toFixed(0)}% completion rate
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statCard}
              onPress={handleViewSwapRequests}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, { backgroundColor: '#4F46E5' }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={22} color="white" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{stats.swapRequests || 0}</Text>
                <Text style={styles.statLabel}>My Swap Requests</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('CreateGroup')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#4CD964' }]}>
                <MaterialCommunityIcons name="plus-circle" size={28} color="white" />
              </View>
              <Text style={styles.actionTitle}>Create Group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('JoinGroup')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#007AFF' }]}>
                <MaterialCommunityIcons name="link" size={28} color="white" />
              </View>
              <Text style={styles.actionTitle}>Join Group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleViewSwapRequests}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#4F46E5' }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={28} color="white" />
              </View>
              <Text style={styles.actionTitle}>My Swaps</Text>
              {stats.swapRequests > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{stats.swapRequests}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {groups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity 
                onPress={handleViewGroups}
                activeOpacity={0.6}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.groupsScroll}
            >
              {groups.slice(0, 4).map((group: any) => (
                <TouchableOpacity 
                  key={group.id}
                  style={styles.groupCard}
                  onPress={() => handleGroupPress(group)}
                  activeOpacity={0.7}
                >
                  {group.avatarUrl ? (
                    <Image 
                      source={{ uri: group.avatarUrl }} 
                      style={styles.groupAvatar} 
                    />
                  ) : (
                    <View style={styles.groupIcon}>
                      <Text style={styles.groupIconText}>
                        {group.name?.charAt(0) || 'G'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name || 'Group'}
                  </Text>
                  <Text style={styles.groupStats}>
                    {group.stats?.yourTasksThisWeek || 0} tasks this week
                  </Text>
                  <Text style={[
                    styles.groupRole,
                    group.role === 'ADMIN' && styles.adminRole
                  ]}>
                    {group.role || 'Member'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.section, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity 
              onPress={handleViewNotifications}
              activeOpacity={0.6}
            >
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
                    styles.activityIconContainer,
                    { backgroundColor: activity.type === 'task' ? '#34c759' : 
                                      activity.type === 'group' ? '#007AFF' : 
                                      activity.type === 'swap' ? '#4F46E5' : '#6c757d' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={activity.icon || 'information'} 
                      size={16} 
                      color="white" 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText} numberOfLines={2}>
                      {activity.title || activity.message}
                    </Text>
                    <Text style={styles.activityTime}>
                      {activity.timeAgo || 'Recently'}
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  swapButton: {
    position: 'relative',
    padding: 8,
  },
  swapBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  swapBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6c757d',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
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
    color: '#007AFF',
    fontWeight: '500',
  },
  // Upcoming Tasks Styles
  upcomingLoading: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  upcomingEmpty: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
  },
  upcomingEmptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20,
  },
  upcomingContainer: {
    gap: 16,
  },
  todaySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  todaySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 12,
  },
  futureSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  futureSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 12,
  },
  upcomingCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  submittableCard: {
    backgroundColor: '#d3f9d8',
    borderColor: '#2b8a3e',
    borderWidth: 2,
  },
  penaltyCard: {
    backgroundColor: '#fff3bf',
    borderColor: '#e67700',
    borderWidth: 2,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  upcomingGroup: {
    fontSize: 12,
    color: '#6c757d',
  },
  timeLeftPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  normalPill: {
    backgroundColor: '#d3f9d8',
  },
  urgentPill: {
    backgroundColor: '#ffc9c9',
  },
  timeLeftPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  normalPillText: {
    color: '#2b8a3e',
  },
  urgentPillText: {
    color: '#fa5252',
  },
  upcomingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 38,
  },
  upcomingTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  availableBadge: {
    backgroundColor: '#2b8a3e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  availableBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  penaltyBadge: {
    backgroundColor: '#e67700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  penaltyBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  futureCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  futureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  futureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  futureContent: {
    flex: 1,
  },
  futureTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  futureDate: {
    fontSize: 11,
    color: '#6c757d',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  urgentCard: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  urgentNumber: {
    color: '#FF9500',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  overdueBadge: {
    fontSize: 11,
    color: '#FF3B30',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  completionRate: {
    fontSize: 12,
    color: '#34c759',
    marginTop: 4,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  actionBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  groupsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  groupCard: {
    width: 140,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 12,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 4,
  },
  groupStats: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupRole: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
  },
  adminRole: {
    color: '#007AFF',
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
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
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});