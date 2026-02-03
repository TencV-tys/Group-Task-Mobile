// src/screens/HomeScreen.tsx
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { useHomeData } from '../homeHook/useHomeHook'; // Fixed import path

export default function HomeScreen({ navigation }: any) {
  const { loading, refreshing, error, homeData, refreshHomeData } = useHomeData();

  // Add debug log to see actual data structure
  useEffect(() => {
    console.log("HomeScreen - homeData:", homeData);
  }, [homeData]);

  // Extract data with proper fallbacks
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
  const upcomingTasks = homeData?.upcomingTasks || [];

  // Show loading state
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

  // Show error state
  if (error && !homeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
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
      {/* Header with Profile Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          {user.pointsThisWeek > 0 && (
            <Text style={styles.headerSubtitle}>
              {user.pointsThisWeek} points this week
            </Text>
          )}
        </View>
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

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshHomeData}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user.fullName || 'User'} {user.fullName && '👋'}
          </Text>
          {user.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('MyGroups')}
          >
            <Text style={styles.statNumber}>{stats.groupsCount || 0}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={[styles.statNumber, stats.tasksDue > 0 && styles.statNumberWarning]}>
              {stats.tasksDue || 0}
            </Text>
            <Text style={styles.statLabel}>Due This Week</Text>
            {stats.overdueTasks > 0 && (
              <Text style={styles.overdueBadge}>{stats.overdueTasks} overdue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={[styles.statNumber, styles.statNumberSuccess]}>
              {stats.completedTasks || 0}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
            {stats.completionRate > 0 && (
              <Text style={styles.completionRate}>
                {stats.completionRate.toFixed(0)}% rate
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Points Display */}
        {user.pointsThisWeek > 0 && (
          <View style={styles.pointsContainer}>
            <View style={styles.pointsCard}>
              <Text style={styles.pointsIcon}>🏆</Text>
              <View style={styles.pointsContent}>
                <Text style={styles.pointsTitle}>Weekly Points</Text>
                <Text style={styles.pointsValue}>{user.pointsThisWeek} points</Text>
              </View>
              <View style={styles.pointsDivider} />
              <View style={styles.pointsContent}>
                <Text style={styles.pointsTitle}>Total Points</Text>
                <Text style={styles.pointsValue}>{user.totalPoints || 0} points</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4CD964' }]}>
              <Text style={styles.iconText}>+</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Create Group</Text>
              <Text style={styles.actionSubtitle}>Start a new group</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('JoinGroup')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.iconText}>🔗</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Join Group</Text>
              <Text style={styles.actionSubtitle}>Use invite code</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('MyGroups')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FF9500' }]}>
              <Text style={styles.iconText}>👥</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Groups</Text>
              <Text style={styles.actionSubtitle}>View all groups</Text>
            </View>
          </TouchableOpacity>

          {/* Removed Create Task action */}

          {stats.swapRequests > 0 && (
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SwapRequests')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FF3B30' }]}>
                <Text style={styles.iconText}>🔄</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Swap Requests</Text>
                <Text style={styles.actionSubtitle}>
                  {stats.swapRequests} pending
                </Text>
              </View>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{stats.swapRequests}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Tasks This Week */}
        {currentWeekTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tasks This Week</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {currentWeekTasks.slice(0, 3).map((task: any) => (
              <TouchableOpacity 
                key={task.id}
                style={styles.taskCard}
                onPress={() => navigation.navigate('TaskDetail', { 
                  taskId: task.taskId,
                  assignmentId: task.id
                })}
              >
                <View style={[styles.taskStatus, task.completed && styles.taskStatusCompleted]}>
                  <Text style={styles.taskStatusIcon}>
                    {task.completed ? '✓' : '○'}
                  </Text>
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskGroup}>{task.groupName}</Text>
                    <Text style={styles.taskPoints}>• {task.points} points</Text>
                    {task.timeOfDay && (
                      <Text style={styles.taskTime}>• {task.timeOfDay.toLowerCase()}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.taskDue}>
                  {new Date(task.dueDate).toLocaleDateString('en-US', { 
                    weekday: 'short' 
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Your Groups Section */}
        {groups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyGroups')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {groups.slice(0, 2).map((group: any) => (
              <TouchableOpacity 
                key={group.id}
                style={styles.groupCard}
                onPress={() => navigation.navigate('GroupTasks', { 
                  groupId: group.id,
                  groupName: group.name,
                  userRole: group.role || 'MEMBER'
                })}
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
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name || 'Group'}</Text>
                  <Text style={styles.groupStats}>
                    {group.stats?.yourTasksThisWeek || 0} tasks this week • {group.role || 'Member'}
                  </Text>
                </View>
                <Text style={styles.groupArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performers This Week</Text>
            <View style={styles.leaderboardCard}>
              {leaderboard.slice(0, 3).map((item: any, index: number) => (
                <View key={item.user.id} style={styles.leaderboardItem}>
                  <View style={styles.leaderboardRank}>
                    <Text style={styles.leaderboardRankText}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.leaderboardAvatar}>
                    {item.user.avatarUrl ? (
                      <Image 
                        source={{ uri: item.user.avatarUrl }} 
                        style={styles.leaderboardAvatarImage} 
                      />
                    ) : (
                      <Text style={styles.leaderboardAvatarText}>
                        {item.user.fullName?.charAt(0) || 'U'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardName}>
                      {item.user.fullName || 'User'}
                      {item.isCurrentUser && ' (You)'}
                    </Text>
                    <Text style={styles.leaderboardStats}>
                      {item.completedTasks} tasks • {item.totalPoints} points
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity 
                style={styles.viewLeaderboardButton}
                onPress={() => navigation.navigate('Leaderboard')}
              >
                <Text style={styles.viewLeaderboardText}>View Full Leaderboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 3).map((activity: any, index: number) => (
              <TouchableOpacity key={index} style={styles.activityCard}>
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityIcon}>{activity.icon || '📝'}</Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {activity.title || activity.message}
                  </Text>
                  <Text style={styles.activityTime}>
                    {activity.timeAgo || new Date(activity.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {!activity.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyActivityContainer}>
              <View style={styles.emptyActivityCard}>
                <Text style={styles.emptyActivityIcon}>📭</Text>
                <Text style={styles.emptyActivityText}>No recent activity</Text>
                <Text style={styles.emptyActivitySubtext}>
                  Complete tasks to see your activity here
                </Text>
              </View>
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
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#34c759',
    marginTop: 2,
    fontWeight: '500',
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  // Welcome Section
  welcomeSection: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6c757d',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statNumberWarning: {
    color: '#ff9500',
  },
  statNumberSuccess: {
    color: '#34c759',
  },
  statLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 5,
    textAlign: 'center',
  },
  completionRate: {
    fontSize: 10,
    color: '#34c759',
    marginTop: 2,
    fontWeight: '500',
  },
  overdueBadge: {
    fontSize: 9,
    color: '#ff3b30',
    backgroundColor: '#ffebee',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  // Points Section
  pointsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pointsCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  pointsIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  pointsContent: {
    flex: 1,
  },
  pointsTitle: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 2,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
  pointsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#FFECB5',
    marginHorizontal: 15,
  },
  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Action Cards
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 24,
    color: 'white',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 15,
    backgroundColor: '#FF3B30',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Task Cards
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskStatus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  taskStatusCompleted: {
    backgroundColor: '#34c759',
    borderColor: '#34c759',
  },
  taskStatusIcon: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  taskGroup: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 6,
  },
  taskPoints: {
    fontSize: 12,
    color: '#34c759',
    marginRight: 6,
  },
  taskTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  taskDue: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  // Group Cards
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  groupIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 3,
  },
  groupStats: {
    fontSize: 12,
    color: '#6c757d',
  },
  groupArrow: {
    fontSize: 20,
    color: '#adb5bd',
    marginLeft: 10,
  },
  // Leaderboard
  leaderboardCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  leaderboardRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  leaderboardRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  leaderboardAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 3,
  },
  leaderboardStats: {
    fontSize: 12,
    color: '#6c757d',
  },
  viewLeaderboardButton: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  viewLeaderboardText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Activity Cards
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  emptyActivityContainer: {
    marginBottom: 10,
  },
  emptyActivityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyActivityIcon: {
    fontSize: 40,
    marginBottom: 15,
    opacity: 0.5,
  },
  emptyActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyActivitySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },
  unreadDot: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 25,
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