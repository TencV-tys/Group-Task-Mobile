// src/screens/MyGroupsScreen.tsx - UPDATED with clean UI and consistent colors
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
  Share,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    addGroup,
    updateGroupAvatar
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
          avatarUrl: newGroup.avatarUrl,
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
          avatarUrl: newGroup.avatarUrl,
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

  const handleManageGroup = (group: any) => {
    navigation.navigate('GroupMembers', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER',
      inviteCode: group.inviteCode
    });
  };

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

  const renderGroupIcon = (group: any, isAdmin: boolean) => {
    if (group.avatarUrl) {
      return (
        <View style={styles.groupIconContainer}>
          <Image
            source={{ uri: group.avatarUrl }}
            style={[
              styles.groupIcon,
              styles.groupAvatarImage,
              { borderColor: isAdmin ? '#2b8a3e' : '#e9ecef' }
            ]}
          />
          {isAdmin && (
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.adminBadge}
            >
              <MaterialCommunityIcons name="crown" size={10} color="white" />
            </LinearGradient>
          )}
        </View>
      );
    } else {
      const groupName = group.name || 'Unnamed Group';
      return (
        <View style={styles.groupIconContainer}>
          <LinearGradient
            colors={isAdmin ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.groupIcon,
              { borderWidth: 1, borderColor: isAdmin ? '#2b8a3e' : '#e9ecef' }
            ]}
          >
            <Text style={[
              styles.groupIconText,
              { color: isAdmin ? 'white' : '#495057' }
            ]}>
              {groupName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          {isAdmin && (
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.adminBadge}
            >
              <MaterialCommunityIcons name="crown" size={10} color="white" />
            </LinearGradient>
          )}
        </View>
      );
    }
  };

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
          {renderGroupIcon(item, isAdmin)}
          
          <View style={styles.groupMainInfo}>
            <View style={styles.groupTitleRow}>
              <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
              <LinearGradient
                colors={isAdmin ? ['#d3f9d8', '#b2f2bb'] : ['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.roleBadge}
              >
                <Text style={[
                  styles.groupRole,
                  isAdmin && styles.adminRoleText
                ]}>
                  {isAdmin ? 'Admin' : 'Member'}
                </Text>
              </LinearGradient>
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
                <MaterialCommunityIcons name="account-group" size={14} color="#868e96" />
                <Text style={styles.statText}>{item.memberCount || 1}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clipboard-check" size={14} color="#868e96" />
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
            <MaterialCommunityIcons name="account-plus" size={16} color="#2b8a3e" />
            <Text style={styles.actionButtonText}>Invite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleTasksGroup(item);
            }}
          >
            <MaterialCommunityIcons name="clipboard-text" size={16} color="#495057" />
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
              <MaterialCommunityIcons name="cog" size={16} color="#495057" />
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
          <ActivityIndicator size="large" color="#2b8a3e" />
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
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="white" />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </LinearGradient>
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
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
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
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButtonGradient}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="white" />
                  <Text style={styles.primaryButtonText}>Create Group</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleJoinGroup}
              >
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.secondaryButtonGradient}
                >
                  <MaterialCommunityIcons name="login" size={18} color="#495057" />
                  <Text style={styles.secondaryButtonText}>Join Group</Text>
                </LinearGradient>
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
      {/* Header */}
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
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
            <ActivityIndicator size="small" color="#2b8a3e" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={22} color="#495057" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick Actions Bar */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleCreateGroup}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#2b8a3e', '#1e6b2c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionGradient}
          >
            <MaterialCommunityIcons name="plus-circle" size={18} color="white" />
            <Text style={styles.quickActionText}>Create</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleJoinGroup}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionGradient}
          >
            <MaterialCommunityIcons name="login" size={18} color="#495057" />
            <Text style={[styles.quickActionText, styles.joinActionText]}>Join</Text>
          </LinearGradient>
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  quickAction: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  joinActionText: {
    color: '#495057',
  },
  // Group List
  listContent: {
    padding: 16,
    paddingTop: 0,
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
    color: '#868e96',
    marginTop: 4,
  },
  // Group Card
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: 12,
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
  groupAvatarImage: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  adminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
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
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupRole: {
    fontSize: 11,
    fontWeight: '500',
    color: '#495057',
  },
  adminRoleText: {
    color: '#2b8a3e',
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
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  groupActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#868e96',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 140,
    shadowColor: '#2b8a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
});  