// src/screens/MyGroupsScreen.tsx - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share
} from 'react-native';
import { useMyGroups } from '../groupHook/useMyGroups';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup', {
      onGroupCreated: (newGroup: any) => {
        addGroup({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          inviteCode: newGroup.inviteCode,
          createdAt: newGroup.createdAt,
          createdById: newGroup.createdById,
          userRole: 'ADMIN',
          memberCount: 1,
          taskCount: 0
        });
        Alert.alert('Success!', 'Group created successfully');
      }
    });
  };

  const handleJoinGroup = () => {
    navigation.navigate('JoinGroup', {
      onGroupJoined: (newGroup: any) => {
        addGroup({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          inviteCode: newGroup.inviteCode,
          createdAt: newGroup.createdAt,
          createdById: newGroup.createdById,
          userRole: 'MEMBER',
          memberCount: newGroup.memberCount || 1,
          taskCount: newGroup.taskCount || 0
        });
        Alert.alert('Success!', 'Joined group successfully');
      }
    });
  };

  const handleGroupPress = (group: any) => {
    navigation.navigate('GroupTasks', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER'
    });
  };

  // Updated: Manage button now goes to GroupMembersScreen
  const handleManageGroup = (group: any) => {
    navigation.navigate('GroupMembers', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER',
      inviteCode: group.inviteCode
    });
  };

  // Updated: Invite button shows invite code
  const handleInviteGroup = (group: any) => {
    Alert.alert(
      'Invite Code',
      `Share this code to invite members:\n\n📋 ${group.inviteCode || 'No invite code available'}`,
      [
        { text: 'Copy', onPress: () => {/* Copy to clipboard */} }, 
        { text: 'Share', onPress: () => handleShareInvite(group) },
        { text: 'OK' }
      ]
    );
  };

  const handleShareInvite = (group: any) => {
    const code = group.inviteCode;
    if (!code) {
      Alert.alert('Error', 'No invite code available');
      return;
    }

    Share.share({
      message: `Join my group "${group.name}" on Group Task! Use invite code: ${code}`,
      title: `Join ${group.name}`
    }).catch((err:any) => console.error('Error sharing:', err));
  };

  const handleTasksGroup = (group: any) => {
    navigation.navigate('GroupTasks', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER'
    });
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroup = ({ item }: any) => {
    const groupName = item.name || 'Unnamed Group';
    const userRole = item.userRole || item.role || 'MEMBER';
    const isAdmin = userRole === 'ADMIN';
    
    return (
      <TouchableOpacity 
        style={styles.groupCard}
        onPress={() => handleGroupPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupIconContainer}>
            <View style={[
              styles.groupIcon,
              { backgroundColor: isAdmin ? '#007AFF' : '#6c757d' }
            ]}>
              <Text style={styles.groupIconText}>{groupName.charAt(0).toUpperCase()}</Text>
            </View>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <MaterialCommunityIcons name="crown" size={12} color="#FFD700" />
              </View>
            )}
          </View>
          
          <View style={styles.groupMainInfo}>
            <View style={styles.groupTitleRow}>
              <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
              <Text style={[styles.groupRole, isAdmin && styles.adminRoleText]}>
                {isAdmin ? 'Admin' : 'Member'}
              </Text>
            </View>
            
            {item.description ? (
              <Text style={styles.groupDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : (
              <Text style={styles.groupNoDescription}>No description</Text>
            )}
            
            <View style={styles.groupQuickStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="account-group" size={16} color="#6c757d" />
                <Text style={styles.statText}>{item.memberCount || 1}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clipboard-check" size={16} color="#6c757d" />
                <Text style={styles.statText}>{item.taskCount || 0}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.groupActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleInviteGroup(item);
            }}
          >
            <MaterialCommunityIcons name="account-plus" size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Invite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleTasksGroup(item);
            }}
          >
            <MaterialCommunityIcons name="clipboard-text" size={18} color="#28a745" />
            <Text style={styles.actionButtonText}>Tasks</Text>
          </TouchableOpacity>
          
          {isAdmin && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleManageGroup(item);
              }}
            >
              <MaterialCommunityIcons name="cog" size={18} color="#6c757d" />
              <Text style={styles.actionButtonText}>Manage</Text>
            </TouchableOpacity>
          )}
        </View>
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
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#fa5252" />
          </View>
          <Text style={styles.emptyTitle}>Error Loading Groups</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => fetchGroups()}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredGroups}
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
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>
              {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
            </Text>
            {searchQuery ? (
              <Text style={styles.listHeaderSubtitle}>
                Showing {filteredGroups.length} result{filteredGroups.length !== 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="account-group" size={60} color="#dee2e6" />
            </View>
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first group to organize tasks with friends or family
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleCreateGroup}
              >
                <MaterialCommunityIcons name="plus" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Create Group</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleJoinGroup}
              >
                <MaterialCommunityIcons name="login" size={20} color="#007AFF" />
                <Text style={styles.secondaryButtonText}>Join Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Consistent with CreateTaskScreen */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>My Groups</Text>
          <Text style={styles.subtitle}>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={refreshGroups}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions Bar - Consistent with CreateTaskScreen */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickAction, styles.createAction]}
          onPress={handleCreateGroup}
        >
          <MaterialCommunityIcons name="plus-circle" size={20} color="white" />
          <Text style={styles.quickActionText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickAction, styles.joinAction]}
          onPress={handleJoinGroup}
        >
          <MaterialCommunityIcons name="login" size={20} color="white" />
          <Text style={styles.quickActionText}>Join</Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Header - Consistent with CreateTaskScreen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  // Quick Actions - Consistent with CreateTaskScreen
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createAction: {
    backgroundColor: '#007AFF',
  },
  joinAction: {
    backgroundColor: '#28a745',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // Rest of the styles remain the same
  listContent: {
    padding: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  listHeaderSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  groupIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  adminBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  groupMainInfo: {
    flex: 1,
  },
  groupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginRight: 8,
  },
  groupRole: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminRoleText: {
    color: '#1971c2',
    backgroundColor: '#e7f5ff',
  },
  groupDescription: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8,
  },
  groupNoDescription: {
    fontSize: 14,
    color: '#adb5bd',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  groupQuickStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  groupActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});