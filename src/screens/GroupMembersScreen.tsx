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
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Image
} from 'react-native';
import { GroupMembersService } from '../services/GroupMemberService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGroupMembers } from '../groupHook/useGroupMembers';
import { useImageUpload } from '../uploadHook/useImageUpload';

const { width } = Dimensions.get('window');

export default function GroupMembersScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole, inviteCode } = route.params || {};
  
  const {
    loading,
    refreshing,
    error,
    members,
    groupInfo,
    fetchGroupMembers,
    updateGroupAvatar,
    removeGroupAvatar,
    setMembers,
    updateGroupInfo,
    transferOwnership,
    regenerateInviteCode,
    deleteGroup,
    updateMemberRole,
    removeMember
  } = useGroupMembers();

  const [currentUserRole, setCurrentUserRole] = useState<string>(userRole || 'MEMBER');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState({
    name: '',
    description: ''
  });
  const [savingGroup, setSavingGroup] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState<any>(null);
  
  // Avatar upload hook - for group avatars
  const {
    uploading: uploadingAvatar,
    pickImageFromGallery,
    takePhotoWithCamera,
    uploadGroupAvatar,
    deleteGroupAvatar: deleteGroupAvatarHook
  } = useImageUpload({
    onSuccess: (result) => {
      if (result.success && result.data?.avatarUrl) {
        updateGroupAvatar(result.data.avatarUrl);
        Alert.alert('Success', 'Group avatar updated successfully');
      }
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to upload avatar: ' + error.message);
    }
  });

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

  // Update user role from members data
  useEffect(() => {
    if (members.length > 0 && currentUserId) {
      const currentUser = members.find(member => member.userId === currentUserId);
      if (currentUser) {
        setCurrentUserRole(currentUser.role || 'MEMBER');
      }
    }
  }, [members, currentUserId]);

  // Update editing group when groupInfo changes
  useEffect(() => {
    if (groupInfo) {
      setEditingGroup({
        name: groupInfo.name || '',
        description: groupInfo.description || ''
      });
    }
  }, [groupInfo]);

  const fetchData = async (isRefreshing = false) => {
    await fetchGroupMembers(groupId, isRefreshing);
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
      message: `Join my group "${groupInfo?.name || groupName}" on Group Task! Use invite code: ${code}`,
      title: `Join ${groupInfo?.name || groupName}`
    }).catch(err => console.error('Error sharing:', err));
  };

  const handleEditGroup = () => {
    setShowEditModal(true);
  };

  const handleSaveGroupChanges = async () => {
    // Validate input
    if (!editingGroup.name.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    try {
      setSavingGroup(true);
      
      // Check if group data has actually changed
      const hasChanged = 
        editingGroup.name.trim() !== (groupInfo?.name || '') ||
        editingGroup.description !== (groupInfo?.description || '');

      if (!hasChanged) {
        Alert.alert('Info', 'No changes detected');
        setShowEditModal(false);
        return;
      }

      // Call the updateGroup method
      const result = await GroupMembersService.updateGroup(groupId, {
        name: editingGroup.name.trim(),
        description: editingGroup.description.trim()
      });
      
      if (result.success) {
        updateGroupInfo(result.group);
        Alert.alert('Success', 'Group updated successfully');
        setShowEditModal(false);
        fetchData(true); // Refresh data to get updated group info
      } else {
        Alert.alert('Error', result.message || 'Failed to update group');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update group');
    } finally {
      setSavingGroup(false);
    }
  };

  // Handle group avatar selection
  const handleGroupAvatarSelect = async () => {
    if (currentUserRole !== 'ADMIN') return;
    
    Alert.alert(
      'Group Avatar',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakeGroupPhoto },
        { text: 'Choose from Gallery', onPress: handleChooseGroupPhoto },
        groupInfo?.avatarUrl && { 
          text: 'Remove Avatar', 
          style: 'destructive', 
          onPress: handleRemoveGroupAvatar 
        },
      ].filter(Boolean) as any
    );
  };

  const handleTakeGroupPhoto = async () => {
    try {
      const photo = await takePhotoWithCamera();
      if (photo) {
        await uploadGroupAvatar(groupId, photo);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to take photo: ' + err.message);
    }
  };

  const handleChooseGroupPhoto = async () => {
    try {
      const photo = await pickImageFromGallery();
      if (photo) {
        await uploadGroupAvatar(groupId, photo);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to choose photo: ' + err.message);
    }
  };

  const handleRemoveGroupAvatar = async () => {
    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove the group avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await GroupMembersService.deleteGroupAvatar(groupId);
              if (result.success) {
                removeGroupAvatar();
                Alert.alert('Success', 'Avatar removed');
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (err: any) {
              Alert.alert('Error', 'Failed to remove avatar: ' + err.message);
            }
          }
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
            const result = await removeMember(groupId, member.id);
            if (result.success) {
              Alert.alert('Success', 'Member removed successfully');
            } else {
              Alert.alert('Error', result.message || 'Failed to remove member');
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
            const result = await updateMemberRole(groupId, member.id, newRole);
            if (result.success) {
              Alert.alert('Success', 'Role updated successfully');
            } else {
              Alert.alert('Error', result.message || 'Failed to update role');
            }
          }
        } 
      ]
    );   
  };

  const handleTransferOwnership = () => {
    // Get all members except current user
    const otherMembers = members.filter(m => m.userId !== currentUserId);
    
    if (otherMembers.length === 0) {
      Alert.alert('No Members', 'There are no other members to transfer ownership to.');
      return;
    }

    Alert.alert(
      'Transfer Ownership',
      'Select new group admin:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...otherMembers.map(m => ({
          text: `${m.fullName} ${m.role === 'ADMIN' ? '(Admin)' : ''}`,
          onPress: () => confirmTransfer(m)
        })),
      ]
    );
  };

  const confirmTransfer = (member: any) => {
    Alert.alert(
      'Confirm Transfer',
      `Are you sure you want to make ${member.fullName} the new group admin? You will lose admin privileges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            const result = await transferOwnership(groupId, member.userId);
            if (result.success) {
              Alert.alert(
                'Success',
                'Ownership transferred. You are now a regular member.',
                [{ text: 'OK', onPress: () => fetchData(true) }]
              );
            } else {
              Alert.alert('Error', result.message || 'Failed to transfer ownership');
            }
          }
        }
      ]
    );
  };

  const handleRegenerateInviteCode = () => {
    Alert.alert(
      'Regenerate Invite Code',
      'Are you sure? The old invite code will stop working immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            const result = await regenerateInviteCode(groupId);
            if (result.success) {
              Alert.alert('Success', 'New invite code generated');
            } else {
              Alert.alert('Error', result.message || 'Failed to regenerate code');
            }
          }
        }
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you absolutely sure? This will permanently delete the group and all its tasks. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteGroup(groupId);
            if (result.success) {
              Alert.alert(
                'Group Deleted',
                'The group has been permanently deleted.',
                [{ text: 'OK', onPress: () => navigation.navigate('MyGroups') }]
              );
            } else {
              Alert.alert('Error', result.message || 'Failed to delete group');
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
          'You are the only admin in this group. Transfer ownership or delete the group before leaving.'
        );
        return;
      }
    }

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${groupInfo?.name || groupName}"?`,
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

  const renderAvatar = (member: any, index: number) => {
    const avatarSize = 50;
    const overlap = -15;
    
    if (index >= 6) {
      const remaining = members.length - 6;
      return (
        <View style={[styles.avatarContainer, { left: index * (avatarSize + overlap) }]}>
          <View style={[styles.avatar, styles.moreAvatar]}>
            <Text style={styles.moreAvatarText}>+{remaining}</Text>
          </View>
        </View>
      );
    }

    return (
      <View key={member.id} style={[styles.avatarContainer, { left: index * (avatarSize + overlap) }]}>
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={[
              styles.avatar,
              styles.avatarImage,
              { 
                width: avatarSize, 
                height: avatarSize, 
                borderRadius: avatarSize / 2,
                borderWidth: 2,
                borderColor: member.role === 'ADMIN' ? '#FFD700' : '#fff'
              }
            ]}
          />
        ) : (
          <View style={[
            styles.avatar,
            { 
              backgroundColor: member.role === 'ADMIN' ? '#007AFF' : '#6c757d',
              borderWidth: 2,
              borderColor: member.role === 'ADMIN' ? '#FFD700' : '#fff'
            }
          ]}>
            <Text style={styles.avatarText}>
              {member.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        {member.role === 'ADMIN' && (
          <View style={styles.adminCrown}>
            <MaterialCommunityIcons name="crown" size={12} color="#FFD700" />
          </View>
        )}
      </View>
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
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={[
                styles.memberAvatar,
                styles.memberAvatarImage,
                { 
                  borderWidth: 2,
                  borderColor: item.role === 'ADMIN' ? '#FFD700' : '#e9ecef'
                }
              ]}
            />
          ) : (
            <View style={[
              styles.memberAvatar,
              { backgroundColor: item.role === 'ADMIN' ? '#007AFF' : '#6c757d' }
            ]}>
              <Text style={styles.memberAvatarText}>
                {item.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.memberDetails}>
            <View style={styles.memberHeader}>
              <Text style={styles.memberName}>
                {item.fullName} {isCurrentUser && '(You)'}
              </Text>
              {item.role === 'ADMIN' && (
                <View style={styles.adminBadge}>
                  <MaterialCommunityIcons name="crown" size={14} color="#FFD700" />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            {item.email && (
              <Text style={styles.memberEmail}>{item.email}</Text>
            )}
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
                <MaterialCommunityIcons 
                  name={item.role === 'ADMIN' ? 'account-arrow-down' : 'account-arrow-up'} 
                  size={16} 
                  color={item.role === 'ADMIN' ? '#fa5252' : '#1864ab'} 
                />
              </TouchableOpacity>
            )}
            
            {!isOnlyAdmin && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMember(item)}
              >
                <MaterialCommunityIcons name="account-remove" size={16} color="#fa5252" />
              </TouchableOpacity>
            )}
            
            {isOnlyAdmin && (
              <View style={styles.protectedBadge}>
                <MaterialCommunityIcons name="shield-check" size={14} color="#e67700" />
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
          <Text style={styles.loadingText}>Loading group...</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => fetchData(true)} style={styles.headerIcon}>
            <MaterialCommunityIcons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
          {currentUserRole === 'ADMIN' && (
            <TouchableOpacity 
              onPress={() => setShowSettingsModal(true)} 
              style={styles.headerIcon}
            >
              <MaterialCommunityIcons name="cog" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
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
        {/* Group Avatar Banner */}
        <View style={styles.avatarBanner}>
          <View style={styles.avatarCircleContainer}>
            {members.slice(0, 7).map((member, index) => renderAvatar(member, index))}
          </View>
          
          {/* Group Info with Editable Avatar */}
          <TouchableOpacity 
            onPress={() => currentUserRole === 'ADMIN' && handleGroupAvatarSelect()}
            disabled={currentUserRole !== 'ADMIN'}
            style={styles.groupInfoContainer}
          >
            <View style={styles.groupAvatarContainer}>
              {uploadingAvatar ? (
                <View style={[styles.groupMainAvatar, styles.uploadingAvatar]}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              ) : groupInfo?.avatarUrl ? (
                <Image
                  source={{ uri: groupInfo.avatarUrl }}
                  style={[styles.groupMainAvatar, styles.groupAvatarImage]}
                />
              ) : (
                <View style={styles.groupMainAvatar}>
                  <Text style={styles.groupAvatarText}>
                    {groupInfo?.name?.charAt(0) || groupName?.charAt(0) || 'G'}
                  </Text>
                </View>
              )}
              
              {currentUserRole === 'ADMIN' && !uploadingAvatar && (
                <View style={styles.editAvatarIcon}>
                  <MaterialCommunityIcons 
                    name="camera-plus" 
                    size={18} 
                    color="#fff" 
                  />
                </View>
              )}
            </View>
            
            <View style={styles.groupTextInfo}>
              <Text style={styles.groupName}>{groupInfo?.name || groupName || 'Group'}</Text>
              {groupInfo?.description && (
                <Text style={styles.groupDescription}>{groupInfo.description}</Text>
              )}
              <View style={styles.groupStats}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-group" size={16} color="#6c757d" />
                  <Text style={styles.statText}>{members.length} members</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
                  <Text style={styles.statText}>{adminCount} admins</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Admin Actions */}
          {currentUserRole === 'ADMIN' && (
            <View style={styles.adminActions}>
              <TouchableOpacity style={styles.adminButton} onPress={handleEditGroup}>
                <MaterialCommunityIcons name="pencil" size={20} color="#007AFF" />
                <Text style={styles.adminButtonText}>Edit Group</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.adminButton} onPress={handleShareInvite}>
                <MaterialCommunityIcons name="share-variant" size={20} color="#34c759" />
                <Text style={styles.adminButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Invite Code Section - Only show to admins */}
        {canSeeInviteCode && inviteCodeToShow && (
          <View style={styles.inviteSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="qrcode" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Invite Code</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.inviteCodeCard}
              onPress={() => {
                Alert.alert('Invite Code', inviteCodeToShow, [
                  { text: 'Copy', onPress: () => {
                    // Copy to clipboard
                  }},
                  { text: 'Share', onPress: handleShareInvite },
                  { text: 'OK', style: 'cancel' }
                ]);
              }}
            >
              <Text style={styles.inviteCode}>{inviteCodeToShow}</Text>
              <MaterialCommunityIcons name="content-copy" size={20} color="#007AFF" />
            </TouchableOpacity>
            
            <Text style={styles.inviteInstructions}>
              Share this code with friends to join the group
            </Text>

            {currentUserRole === 'ADMIN' && (
              <TouchableOpacity 
                style={styles.regenerateButton}
                onPress={handleRegenerateInviteCode}
              >
                <MaterialCommunityIcons name="refresh" size={16} color="#e67700" />
                <Text style={styles.regenerateButtonText}>Regenerate Code</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Admin Warning */}
        {isOnlyAdmin && (
          <View style={styles.warningSection}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#e67700" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>You are the only admin</Text>
              <Text style={styles.warningText}>
                Transfer ownership to another member before leaving the group.
              </Text>
            </View>
          </View>
        )}

        {/* Members List */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-multiple" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
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
                  <MaterialCommunityIcons name="account-group" size={48} color="#adb5bd" />
                  <Text style={styles.emptyText}>No members found</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Leave Group Button */}
        <TouchableOpacity
          style={[
            styles.leaveButton,
            isOnlyAdmin && styles.disabledLeaveButton
          ]}
          onPress={handleLeaveGroup}
          disabled={isOnlyAdmin}
        >
          <MaterialCommunityIcons 
            name="exit-to-app" 
            size={20} 
            color={isOnlyAdmin ? "#adb5bd" : "#fa5252"} 
          />
          <Text style={[
            styles.leaveButtonText,
            isOnlyAdmin && styles.disabledLeaveButtonText
          ]}>
            {isOnlyAdmin ? 'Cannot Leave (Only Admin)' : 'Leave Group'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Transfer Ownership */}
              <TouchableOpacity 
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleTransferOwnership();
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: '#EEF2FF' }]}>
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#4F46E5" />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={styles.settingsTitle}>Transfer Ownership</Text>
                  <Text style={styles.settingsDescription}>
                    Make another member the group admin
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Regenerate Invite Code */}
              <TouchableOpacity 
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleRegenerateInviteCode();
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="refresh" size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={styles.settingsTitle}>Regenerate Invite Code</Text>
                  <Text style={styles.settingsDescription}>
                    Create a new invite code (old one stops working)
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Delete Group - Danger */}
              <TouchableOpacity 
                style={[styles.settingsItem, styles.dangerItem]}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleDeleteGroup();
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="trash-can" size={20} color="#EF4444" />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, styles.dangerText]}>Delete Group</Text>
                  <Text style={styles.settingsDescription}>
                    Permanently delete this group and all tasks
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#EF4444" />
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit {editingGroup.name.trim() || groupInfo?.name || 'Group'}
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Group Avatar Edit Section */}
              <View style={styles.avatarEditSection}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowEditModal(false);
                    setTimeout(() => handleGroupAvatarSelect(), 300);
                  }}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <View style={[styles.editAvatar, styles.uploadingAvatar]}>
                      <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                  ) : groupInfo?.avatarUrl ? (
                    <Image
                      source={{ uri: groupInfo.avatarUrl }}
                      style={[styles.editAvatar, styles.editAvatarImage]}
                    />
                  ) : (
                    <View style={styles.editAvatar}>
                      <MaterialCommunityIcons name="camera-plus" size={32} color="#fff" />
                    </View>
                  )}
                  
                  {!uploadingAvatar && (
                    <View style={styles.editAvatarOverlay}>
                      <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.avatarNote}>
                  Tap to change group avatar
                </Text>
                
                {groupInfo?.avatarUrl && (
                  <TouchableOpacity 
                    style={styles.removeAvatarButton}
                    onPress={() => {
                      setShowEditModal(false);
                      setTimeout(() => handleRemoveGroupAvatar(), 300);
                    }}
                  >
                    <MaterialCommunityIcons name="trash-can" size={16} color="#fa5252" />
                    <Text style={styles.removeAvatarText}>Remove Avatar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Group Name</Text>
                <TextInput
                  style={styles.input}
                  value={editingGroup.name}
                  onChangeText={(text) => setEditingGroup({...editingGroup, name: text})}
                  placeholder="Enter group name"
                  maxLength={100}
                />
              </View>

              {/* Description Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editingGroup.description}
                  onChangeText={(text) => setEditingGroup({...editingGroup, description: text})}
                  placeholder="Enter group description"
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
                <Text style={styles.charCount}>
                  {editingGroup.description.length}/500 characters
                </Text>
              </View>

              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information" size={16} color="#6c757d" />
                <Text style={styles.infoText}>
                  Group names and descriptions help members understand the purpose of the group.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  (!editingGroup.name.trim() || savingGroup) && styles.saveButtonDisabled
                ]}
                onPress={handleSaveGroupChanges}
                disabled={!editingGroup.name.trim() || savingGroup}
              >
                {savingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerIcon: {
    padding: 4
  },
  avatarBanner: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  avatarCircleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    height: 60,
    position: 'relative'
  },
  avatarContainer: {
    position: 'absolute',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  avatarImage: {
    backgroundColor: 'transparent',
  },
  moreAvatar: {
    backgroundColor: '#6c757d'
  },
  moreAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  adminCrown: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#FFD700'
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  groupAvatarContainer: {
    position: 'relative',
    marginRight: 16
  },
  groupMainAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupAvatarImage: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#007AFF'
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold'
  },
  uploadingAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  groupTextInfo: {
    flex: 1
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4
  },
  groupDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22
  },
  groupStats: {
    flexDirection: 'row',
    gap: 16
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    fontSize: 14,
    color: '#6c757d'
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12
  },
  adminButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  inviteSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000'
  },
  inviteCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e7f5ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2
  },
  inviteInstructions: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#fff3bf',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e67700'
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff3bf',
    borderWidth: 1,
    borderColor: '#ffd43b',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    gap: 12
  },
  warningContent: {
    flex: 1
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e67700',
    marginBottom: 4
  },
  warningText: {
    fontSize: 14,
    color: '#e67700'
  },
  membersSection: {
    padding: 20
  },
  errorContainer: {
    alignItems: 'center',
    padding: 30
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 16
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative'
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  memberAvatarImage: {
    backgroundColor: 'transparent'
  },
  memberAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  memberDetails: {
    flex: 1
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFD70020',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700'
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  memberJoined: {
    fontSize: 12,
    color: '#999'
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  roleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e7f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  demoteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffc9c9'
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  protectedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff3bf',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  currentUserBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
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
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  disabledLeaveButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef'
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fa5252'
  },
  disabledLeaveButtonText: {
    color: '#adb5bd'
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  modalBody: {
    padding: 20
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d'
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#c0c0c0'
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  avatarEditSection: {
    alignItems: 'center',
    marginBottom: 24
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  editAvatarImage: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#007AFF'
  },
  editAvatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarNote: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8
  },
  removeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8
  },
  removeAvatarText: {
    fontSize: 14,
    color: '#fa5252'
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa'
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 20
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
    lineHeight: 20
  },
  // Settings Modal Items
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 16
  },
  dangerItem: {
    borderBottomWidth: 0
  },
  settingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingsContent: {
    flex: 1
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  settingsDescription: {
    fontSize: 14,
    color: '#6c757d'
  },
  dangerText: {
    color: '#EF4444'
  }
});