// src/screens/MyGroupsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useMyGroups } from '../groupHook/useMyGroups';

export default function MyGroupsScreen({ navigation }: any) {
  const { 
    groups, 
    loading, 
    refreshing, 
    error,
    fetchGroups, 
    refreshGroups, 
    addGroup 
  } = useMyGroups();

  // Fetch groups when screen loads
  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup', {
      onGroupCreated: (newGroup: any) => {
        // Add the new group to our list
        addGroup({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          inviteCode: newGroup.inviteCode,
          createdAt: newGroup.createdAt,
          createdById: newGroup.createdById,
          userRole: 'ADMIN', // Creator is ADMIN
          memberCount: 1,
          taskCount: 0
        });
      }
    });
  };

  const handleJoinGroup = () => {
    navigation.navigate('JoinGroup', {
      onGroupJoined: (newGroup: any) => {
        // Add the joined group to our list
        addGroup({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          inviteCode: newGroup.inviteCode,
          createdAt: newGroup.createdAt,
          createdById: newGroup.createdById,
          userRole: 'MEMBER', // Joining makes you MEMBER
          memberCount: newGroup.memberCount || 1,
          taskCount: newGroup.taskCount || 0
        });
      }
    });
  };

  const handleGroupPress = (group: any) => {
    // UPDATED: Navigate to GroupTasksScreen instead of GroupDetails
    navigation.navigate('GroupTasks', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER'
    });
  };

  const renderGroup = ({ item }: any) => {
    const groupName = item.name || 'Unnamed Group';
    const userRole = item.userRole || item.role || 'MEMBER';
    
    return (
      <TouchableOpacity 
        style={styles.groupCard}
        onPress={() => handleGroupPress(item)}
      >
        <View style={styles.groupHeader}>
          <View style={[
            styles.groupIcon,
            { 
              backgroundColor: userRole === 'ADMIN' ? '#007AFF' : '#6c757d' 
            }
          ]}>
            <Text style={styles.groupIconText}>{groupName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupRole}>
              {userRole === 'ADMIN' ? '👑 Admin' : '👤 Member'}
            </Text>
            {item.description && (
              <Text style={styles.groupDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
          {item.inviteCode && (
            <View style={styles.inviteBadge}>
              <Text style={styles.inviteText}>{item.inviteCode}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.groupStats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {item.memberCount || 1}
            </Text>
            <Text style={styles.statLabel}>members</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {item.taskCount || 0}
            </Text>
            <Text style={styles.statLabel}>tasks</Text>
          </View>
          {item.createdAt && (
            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={styles.statLabel}>created</Text>
            </View>
          )}
        </View>
        
        {/* Show admin badge if user is admin */}
        {userRole === 'ADMIN' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Can Create Tasks</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your groups...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error Loading Groups</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity 
              style={[styles.retryButton, styles.primaryButton]}
              onPress={() => fetchGroups()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.retryButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.secondaryButtonText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshGroups}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first group or join an existing one to get started with tasks
            </Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity 
                style={[styles.emptyButton, styles.primaryEmptyButton]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.emptyButtonText}>Create Group</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.emptyButton, styles.secondaryEmptyButton]}
                onPress={handleJoinGroup}
              >
                <Text style={styles.secondaryEmptyButtonText}>Join Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={[
          styles.listContainer,
          groups.length === 0 && styles.emptyListContainer
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateGroup}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={refreshGroups}
            disabled={refreshing}
            style={styles.refreshButtonContainer}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.refreshButton}>🔄</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}

      {/* FAB for mobile */}
      {groups.length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity 
            style={styles.fab} 
            onPress={handleJoinGroup}
          >
            <Text style={styles.fabText}>🔗</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.fab, styles.primaryFab]} 
            onPress={handleCreateGroup}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButtonContainer: {
    padding: 4,
  },
  refreshButton: {
    fontSize: 20,
    color: '#007AFF',
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
    marginBottom: 16,
    color: '#dc3545',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 3,
  },
  groupRole: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 13,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
  inviteBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inviteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  groupStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 11,
    color: '#6c757d',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  adminBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5d8ff',
  },
  adminBadgeText: {
    fontSize: 10,
    color: '#1971c2',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 25,
    maxWidth: 300,
    lineHeight: 20,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryEmptyButton: {
    backgroundColor: '#007AFF',
  },
  secondaryEmptyButton: {
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryEmptyButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  primaryFab: {
    backgroundColor: '#007AFF',
  },
  fabText: {
    fontSize: 24,
    color: 'white',
  },
});