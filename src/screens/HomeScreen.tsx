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
  RefreshControl
} from 'react-native';
import { useHomeData } from '../homeHook/useHomeHook'; // Fixed import path

export default function HomeScreen({ navigation }: any) {
  const { loading, refreshing, error, homeData, refreshHomeData } = useHomeData();

  // Add debug log to see actual data structure
  useEffect(() => {
    console.log("HomeScreen - homeData:", homeData);
  }, [homeData]);

  // Extract data with proper fallbacks - FIXED to match backend structure
  const user = homeData?.user || { 
    fullName: 'User', 
    groupsCount: 0, 
    tasksDue: 0,
    email: '',
    avatarUrl: null
  };
  
  const stats = homeData?.stats || { 
    groupsCount: 0, 
    tasksDue: 0, 
    completedTasks: 0,
    totalTasks: 0,
    completionRate: 0
  };
  
  const recentActivity = homeData?.recentActivity || [];

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user.fullName || 'User'} {user.fullName && '👋'} {/* Fixed: fullName */}
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
            <Text style={styles.statLabel}>Tasks Due</Text>
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

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#AF52DE' }]}>
              <Text style={styles.iconText}>✓</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Create Task</Text>
              <Text style={styles.actionSubtitle}>Assign new task</Text>
            </View>
          </TouchableOpacity>
        </View>

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
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>No recent activity</Text>
              <Text style={styles.activitySubtext}>Complete tasks to see activity here</Text>
            </View>
          )}
        </View>

        {/* If you have groups data */}
        {homeData?.groups && homeData.groups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyGroups')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {homeData.groups.slice(0, 2).map((group: any) => (
              <TouchableOpacity 
                key={group.id}
                style={styles.groupCard}
                onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
              >
                <View style={styles.groupIcon}>
                  <Text style={styles.groupIconText}>
                    {group.name?.charAt(0) || 'G'}
                  </Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name || 'Group'}</Text>
                  <Text style={styles.groupStats}>
                    {group.taskCount || 0} tasks • {group.role || 'Member'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
  header: {
    padding: 20,
    paddingTop: 30,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6c757d',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
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
    fontSize: 28,
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
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
  activitySubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
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
});