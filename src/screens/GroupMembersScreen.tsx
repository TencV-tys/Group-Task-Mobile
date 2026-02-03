// src/screens/GroupMembersScreen.tsx
import React, { useEffect, useState } from 'react';
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
  ScrollView
} from 'react-native';
import { GroupMembersService } from '../groupMemberServices/GroupMemberService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GroupMembersScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole, inviteCode } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>(userRole || 'MEMBER');
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Get current user ID from AsyncStorage
  useEffect(() => {
    const loadCurrentUserId = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          setCurrentUserId(userId);
        }
      } catch (err) {
        console.error('Error loading user ID:', err);
      }
    };
    loadCurrentUserId();
  }, []);

  const fetchData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch members
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      
      if (membersResult.success) {
        const formattedMembers = (membersResult.members || []).map((member: any) => ({
          ...member,
          role: member.groupRole || member.role || 'MEMBER'
        }));
        setMembers(formattedMembers);
        setCurrentUserRole(membersResult.userRole || userRole || 'MEMBER');
      } else {
        setError(membersResult.message || 'Failed to load members');
      }

      // Get group info
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setGroupInfo(groupResult.group);
      } else {
        console.warn('Could not load group info:', groupResult.message);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchData();
    }
  }, [groupId]);

  const handleShareInvite = () => {
    const code = inviteCode || groupInfo?.inviteCode;
    if (!code) {
      Alert.alert('Error', 'No invite code available');
      return;
    }

    Share.share({
      message: `Join my group "${groupName}" on Task Manager! Use invite code: ${code}`,
      title: `Join ${groupName}`
    }).catch(err => console.error('Error sharing:', err));
  };

  const handleCopyInviteCode = () => {
    const code = inviteCode || groupInfo?.inviteCode;
    if (!code) return;
    
    Alert.alert(
      'Invite Code',
      `Invite code: ${code}\n\nShare this code with others to join your group.`,
      [
        {
          text: 'Share',
          onPress: handleShareInvite
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
  };

  const handleRemoveMember = async (member: any) => {
    // Check if it's the current user
    if (member.userId === currentUserId) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself. Use "Leave Group" instead.');
      return;
    }

    // Check if trying to remove the only admin
    if (member.role === 'ADMIN') {
      const adminCount = members.filter(m => m.role === 'ADMIN').length;
      if (adminCount <= 1) {
        Alert.alert(
          'Cannot Remove Admin',
          'This is the only admin in the group. Promote another member to admin first.'
        );
        return;
      }
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.fullName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await GroupMembersService.removeMember(groupId, member.id);
              
              if (result.success) {
                setMembers(prev => prev.filter(m => m.id !== member.id));
                Alert.alert('Success', 'Member removed successfully');
              } else {
                Alert.alert('Error', result.message || 'Failed to remove member');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const handleUpdateRole = async (member: any, newRole: string) => {
    if (member.role === newRole) return;

    // Check if trying to demote the only admin
    if (member.role === 'ADMIN' && newRole === 'MEMBER') {
      const adminCount = members.filter(m => m.role === 'ADMIN').length;
      if (adminCount <= 1) {
        Alert.alert(
          'Cannot Demote',
          'This is the only admin in the group. Promote another member to admin first.'
        );
        return;
      }
    }

    Alert.alert(
      'Change Role',
      `Change ${member.fullName}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              const result = await GroupMembersService.updateMemberRole(groupId, member.id, newRole);
              
              if (result.success) {
                setMembers(prev => prev.map(m => 
                  m.id === member.id ? { ...m, role: newRole } : m
                ));
                Alert.alert('Success', 'Role updated successfully');
              } else {
                Alert.alert('Error', result.message || 'Failed to update role');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update role');
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = () => {
    // Check if user is the only admin
    if (currentUserRole === 'ADMIN') {
      const adminCount = members.filter(m => m.role === 'ADMIN').length;
      if (adminCount <= 1) {
        Alert.alert(
          'Cannot Leave as Only Admin',
          'You are the only admin in this group. Promote another member to admin before leaving.'
        );
        return;
      }
    }

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await GroupMembersService.leaveGroup(groupId);
              
              if (result.success) {
                Alert.alert(
                  'Success', 
                  'You have left the group',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('MyGroups')
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.message || 'Failed to leave group');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave group');
            }
          }
        }
      ]
    );
  };

  const renderMember = ({ item }: any) => {
    const isAdmin = currentUserRole === 'ADMIN';
    const isCurrentUser = item.userId === currentUserId;
    const isOnlyAdmin = item.role === 'ADMIN' && 
                      members.filter(m => m.role === 'ADMIN').length <= 1;

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <View style={[
            styles.avatar,
            { backgroundColor: item.role === 'ADMIN' ? '#007AFF' : '#6c757d' }
          ]}>
            <Text style={styles.avatarText}>
              {item.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.fullName} {isCurrentUser && '(You)'}
            </Text>
            <View style={styles.memberMeta}>
              <Text style={[
                styles.memberRole,
                item.role === 'ADMIN' && styles.adminRole,
                isOnlyAdmin && styles.onlyAdminRole
              ]}>
                {item.role === 'ADMIN' ? '👑 Admin' : '👤 Member'}
                {isOnlyAdmin && ' (Only Admin)'}
              </Text>
              {item.email && (
                <Text style={styles.memberEmail}>{item.email}</Text>
              )}
            </View>
            {item.joinedAt && (
              <Text style={styles.memberJoined}>
                Joined {new Date(item.joinedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {isAdmin && !isCurrentUser && (
          <View style={styles.memberActions}>
            {!isOnlyAdmin && (
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  item.role === 'ADMIN' && styles.demoteButton
                ]}
                onPress={() => handleUpdateRole(item, item.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
              >
                <Text style={styles.roleButtonText}>
                  {item.role === 'ADMIN' ? 'Demote' : 'Promote'}
                </Text>
              </TouchableOpacity>
            )}
            
            {!isOnlyAdmin && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMember(item)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
            
            {isOnlyAdmin && (
              <View style={styles.protectedBadge}>
                <Text style={styles.protectedText}>Protected</Text>
              </View>
            )}
          </View>
        )}

        {isCurrentUser && (
          <View style={styles.currentUserBadge}>
            <Text style={styles.currentUserBadgeText}>You</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const inviteCodeToShow = inviteCode || groupInfo?.inviteCode;
  const canSeeInviteCode = currentUserRole === 'ADMIN';
  const adminCount = members.filter(m => m.role === 'ADMIN').length;
  const isOnlyAdmin = currentUserRole === 'ADMIN' && adminCount <= 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {groupName || 'Group Members'}
        </Text>
        <TouchableOpacity onPress={() => fetchData(true)}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#007AFF']}
          />
        }
      >
        {/* Invite Code Section - Only show to admins */}
        {canSeeInviteCode && (
          <View style={styles.inviteSection}>
            <Text style={styles.inviteTitle}>Invite Members</Text>
            <Text style={styles.inviteSubtitle}>
              Share this code with others to join your group
            </Text>
            
            {inviteCodeToShow ? (
              <TouchableOpacity 
                style={styles.inviteCodeCard}
                onPress={handleCopyInviteCode}
              >
                <View style={styles.inviteCodeContainer}>
                  <Text style={styles.inviteCodeLabel}>INVITE CODE</Text>
                  <Text style={styles.inviteCode}>{inviteCodeToShow}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.shareButton}
                  onPress={handleShareInvite}
                >
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              <View style={styles.noInviteCode}>
                <Text style={styles.noInviteCodeText}>No invite code available</Text>
              </View>
            )}

            <Text style={styles.inviteInstructions}>
              • Share the code above with friends{'\n'}
              • They can join from the "Join Group" screen
            </Text>
          </View>
        )}

        {/* Admin Warning */}
        {isOnlyAdmin && (
          <View style={styles.warningSection}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>You are the only admin</Text>
            <Text style={styles.warningText}>
              Promote another member to admin before leaving the group.
            </Text>
          </View>
        )}

        {/* Members List */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Members ({members.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              {currentUserRole === 'ADMIN' 
                ? `Admins: ${adminCount} | You can manage members below` 
                : 'View group members'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchData()}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyText}>No members found</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Leave Group Button (for all members) */}
        <TouchableOpacity
          style={[
            styles.leaveButton,
            isOnlyAdmin && styles.disabledLeaveButton
          ]}
          onPress={handleLeaveGroup}
          disabled={isOnlyAdmin}
        >
          <Text style={[
            styles.leaveButtonText,
            isOnlyAdmin && styles.disabledLeaveButtonText
          ]}>
            {isOnlyAdmin ? 'Cannot Leave (Only Admin)' : 'Leave Group'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    fontSize: 24,
    color: '#007AFF',
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginHorizontal: 12
  },
  refreshButton: {
    fontSize: 20,
    color: '#007AFF',
    padding: 4
  },
  inviteSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  inviteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8
  },
  inviteSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 20,
    lineHeight: 20
  },
  inviteCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e7f5ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  inviteCodeContainer: {
    flex: 1
  },
  inviteCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1864ab',
    marginBottom: 4
  },
  inviteCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    letterSpacing: 2
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  shareButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  noInviteCode: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  noInviteCodeText: {
    color: '#6c757d',
    fontSize: 16
  },
  inviteInstructions: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 20
  },
  warningSection: {
    backgroundColor: '#fff3bf',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffd43b',
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
    color: '#e67700'
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e67700',
    marginBottom: 4
  },
  warningText: {
    fontSize: 14,
    color: '#e67700',
    flex: 1
  },
  membersSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionHeader: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6c757d'
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center'
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    position: 'relative'
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  memberRole: {
    fontSize: 13,
    color: '#6c757d',
    marginRight: 8
  },
  adminRole: {
    color: '#007AFF',
    fontWeight: '600'
  },
  onlyAdminRole: {
    color: '#e67700',
    fontWeight: 'bold'
  },
  memberEmail: {
    fontSize: 12,
    color: '#adb5bd'
  },
  memberJoined: {
    fontSize: 11,
    color: '#adb5bd'
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e7f5ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  demoteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffc9c9'
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1864ab'
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fa5252'
  },
  protectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff3bf',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  protectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700'
  },
  currentUserBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  currentUserBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1864ab'
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.3
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d'
  },
  leaveButton: {
    marginHorizontal: 16,
    marginBottom: 30,
    paddingVertical: 14,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  disabledLeaveButton: {
    backgroundColor: '#f1f3f5',
    borderColor: '#e9ecef'
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fa5252'
  },
  disabledLeaveButtonText: {
    color: '#adb5bd'
  }
});