// src/screens/HomeScreen.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView 
} from 'react-native';

export default function HomeScreen({ navigation }: any) {
  const user = {
    name: 'Vincent',
    groupsCount: 2,
    tasksDue: 3
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user.name} 👋</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user.groupsCount}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user.tasksDue}</Text>
            <Text style={styles.statLabel}>Tasks Due</Text>
          </View>
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
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>No recent activity</Text>
            <Text style={styles.activitySubtext}>Complete tasks to see activity here</Text>
          </View>
        </View>

        {/* Bottom Navigation Buttons */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('MyGroups')}
          >
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navText}>Groups</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <Text style={styles.navIcon}>➕</Text>
            <Text style={styles.navText}>Create Task</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activityText: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 5,
  },
  activitySubtext: {
    fontSize: 14,
    color: '#6c757d',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: 'white',
  },
  navButton: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  navText: {
    fontSize: 12,
    color: '#6c757d',
  },
});