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
    navigation.navigate('GroupDetails', { 
      groupId: group.id,
      groupName: group.name,
      groupRole: group.userRole || group.role
    });
  };

  const renderGroup = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.groupCard}
      onPress={() => handleGroupPress(item)}
    >
      <View style={styles.groupHeader}>
        <View style={[
          styles.groupIcon,
          { 
            backgroundColor: (item.userRole || item.role) === 'ADMIN' ? '#007AFF' : '#6c757d' 
          }
        ]}>
          <Text style={styles.groupIconText}>{(item.name || "G").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupRole}>
            {(item.userRole || item.role) === 'ADMIN' ? '👑 Admin' : '👤 Member'}
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
    </TouchableOpacity>
  );

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
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchGroups()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
              Create your first group or join an existing one to get started
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleCreateGroup}
            >
              <Text style={styles.emptyButtonText}>Create Your First Group</Text>
            </TouchableOpacity>
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
        <TouchableOpacity 
          onPress={refreshGroups}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.refreshButton}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderContent()}

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
  refreshButton: {
    fontSize: 20,
    padding: 5,
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
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
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
  },
  emptyButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
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