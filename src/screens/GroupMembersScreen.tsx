// src/screens/GroupMembersScreen.tsx - UPDATED with clean UI and consistent colors
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
import { LinearGradient } from 'expo-linear-gradient';
import { GroupMembersService } from '../services/GroupMemberService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGroupMembers } from '../groupHook/useGroupMembers';
import { useImageUpload } from '../uploadHook/useImageUpload';
import { useRealtimeGroup } from '../hooks/useRealtimeGroup';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

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

   const {
    events: groupEvents,
    clearMemberJoined,
    clearMemberLeft,
    clearMemberRoleChanged,
    clearGroupUpdated,
    clearRotationCompleted
  } = useRealtimeGroup(groupId);

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

  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if (notification.data?.groupId === groupId) {
        fetchData();
      }
    },
    showAlerts: true
  });

  // ========== ADD THIS: Handle real-time group events ==========
  useEffect(() => {
    if (groupEvents.memberJoined) {
      Alert.alert(
        '👋 New Member',
        `${groupEvents.memberJoined.userName} joined the group`,
        [{ text: 'OK' }]
      );
      fetchData(true);
      clearMemberJoined();
    }
  }, [groupEvents.memberJoined]);

  useEffect(() => {
    if (groupEvents.memberLeft) {
      Alert.alert(
        '👋 Member Left',
        `${groupEvents.memberLeft.userName} left the group`,
        [{ text: 'OK' }]
      );
      fetchData(true);
      clearMemberLeft();
    }
  }, [groupEvents.memberLeft]);

  useEffect(() => {
    if (groupEvents.memberRoleChanged) {
      Alert.alert(
        '🔄 Role Changed',
        `${groupEvents.memberRoleChanged.userName} is now ${groupEvents.memberRoleChanged.newRole}`,
        [{ text: 'OK' }]
      );
      fetchData(true);
      clearMemberRoleChanged();
    }
  }, [groupEvents.memberRoleChanged]);

  useEffect(() => {
    if (groupEvents.rotationCompleted) {
      Alert.alert(
        '🔄 Rotation Completed',
        `Tasks rotated to week ${groupEvents.rotationCompleted.newWeek}`,
        [{ text: 'OK' }]
      );
      fetchData(true);
      clearRotationCompleted();
    }
  }, [groupEvents.rotationCompleted]);
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
      // ✅ FIX: Pass both groupId and updated group data
      updateGroupInfo(groupId, {
        ...groupInfo,
        ...result.group,
        name: editingGroup.name.trim(),
        description: editingGroup.description.trim()
      });
      
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
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatar, styles.moreAvatar]}
          >
            <Text style={styles.moreAvatarText}>+{remaining}</Text>
          </LinearGradient>
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
                borderColor: member.role === 'ADMIN' ? '#2b8a3e' : '#e9ecef'
              }
            ]}
          />
        ) : (
          <LinearGradient
            colors={member.role === 'ADMIN' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.avatar,
              { 
                width: avatarSize, 
                height: avatarSize, 
                borderRadius: avatarSize / 2,
                borderWidth: 2,
                borderColor: member.role === 'ADMIN' ? '#2b8a3e' : '#e9ecef'
              }
            ]}
          >
            <Text style={[
              styles.avatarText,
              { color: member.role === 'ADMIN' ? 'white' : '#495057' }
            ]}>
              {member.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </LinearGradient>
        )}
        {member.role === 'ADMIN' && (
          <View style={styles.adminCrown}>
            <MaterialCommunityIcons name="crown" size={10} color="#2b8a3e" />
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
                  borderColor: item.role === 'ADMIN' ? '#2b8a3e' : '#e9ecef'
                }
              ]}
            />
          ) : (
            <LinearGradient
              colors={item.role === 'ADMIN' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.memberAvatar,
                { borderWidth: 2, borderColor: item.role === 'ADMIN' ? '#2b8a3e' : '#e9ecef' }
              ]}
            >
              <Text style={[
                styles.memberAvatarText,
                { color: item.role === 'ADMIN' ? 'white' : '#495057' }
              ]}>
                {item.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.memberDetails}>
            <View style={styles.memberHeader}>
              <Text style={styles.memberName}>
                {item.fullName} {isCurrentUser && '(You)'}
              </Text>
              {item.role === 'ADMIN' && (
                <LinearGradient
                  colors={['#d3f9d8', '#b2f2bb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminBadge}
                >
                  <MaterialCommunityIcons name="crown" size={12} color="#2b8a3e" />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </LinearGradient>
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
                  color={item.role === 'ADMIN' ? '#fa5252' : '#2b8a3e'} 
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
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.protectedBadge}
              >
                <MaterialCommunityIcons name="shield-check" size={14} color="#e67700" />
              </LinearGradient>
            )}
          </View>
        )}

        {isCurrentUser && (
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentUserBadge}
          >
            <Text style={styles.currentUserBadgeText}>You</Text>
          </LinearGradient>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
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
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => fetchData(true)} style={styles.headerIcon}>
            <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
          </TouchableOpacity>
          {currentUserRole === 'ADMIN' && (
            <TouchableOpacity 
              onPress={() => setShowSettingsModal(true)} 
              style={styles.headerIcon}
            >
              <MaterialCommunityIcons name="cog" size={20} color="#495057" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Group Avatar Banner */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarBanner}
        >
          <View style={styles.avatarCircleContainer}>
            {members.slice(0, 7).map((member, index) => renderAvatar(member, index))}
          </View>
          
          {/* Group Info with Editable Avatar */}
          <TouchableOpacity 
            onPress={() => currentUserRole === 'ADMIN' && handleGroupAvatarSelect()}
            disabled={currentUserRole !== 'ADMIN'}
            style={styles.groupInfoContainer}
            activeOpacity={0.7}
          >
            <View style={styles.groupAvatarContainer}>
              {uploadingAvatar ? (
                <View style={[styles.groupMainAvatar, styles.uploadingAvatar]}>
                  <ActivityIndicator size="small" color="#2b8a3e" />
                </View>
              ) : groupInfo?.avatarUrl ? (
                <Image
                  source={{ uri: groupInfo.avatarUrl }}
                  style={[styles.groupMainAvatar, styles.groupAvatarImage]}
                />
              ) : (
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.groupMainAvatar}
                >
                  <Text style={styles.groupAvatarText}>
                    {groupInfo?.name?.charAt(0) || groupName?.charAt(0) || 'G'}
                  </Text>
                </LinearGradient>
              )}
              
              {currentUserRole === 'ADMIN' && !uploadingAvatar && (
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.editAvatarIcon}
                >
                  <MaterialCommunityIcons name="camera-plus" size={14} color="white" />
                </LinearGradient>
              )}
            </View>
            
            <View style={styles.groupTextInfo}>
              <Text style={styles.groupName}>{groupInfo?.name || groupName || 'Group'}</Text>
              {groupInfo?.description && (
                <Text style={styles.groupDescription}>{groupInfo.description}</Text>
              )}
              <View style={styles.groupStats}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-group" size={14} color="#868e96" />
                  <Text style={styles.statText}>{members.length} members</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="crown" size={14} color="#2b8a3e" />
                  <Text style={styles.statText}>{adminCount} admins</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Admin Actions */}
          {currentUserRole === 'ADMIN' && (
            <View style={styles.adminActions}>
              <TouchableOpacity 
                style={[styles.adminButton, styles.editButton]} 
                onPress={handleEditGroup}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminButtonGradient}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color="#495057" />
                  <Text style={styles.adminButtonText}>Edit</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.adminButton, styles.shareButton]} 
                onPress={handleShareInvite}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminButtonGradient}
                >
                  <MaterialCommunityIcons name="share-variant" size={16} color="#495057" />
                  <Text style={styles.adminButtonText}>Share</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        {/* Invite Code Section - Only show to admins */}
        {canSeeInviteCode && inviteCodeToShow && (
          <View style={styles.inviteSection}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sectionIcon}
              >
                <MaterialCommunityIcons name="qrcode" size={14} color="#495057" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Invite Code</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.inviteCodeCard}
              onPress={() => {
                Alert.alert('Invite Code', inviteCodeToShow, [
                  { text: 'Copy', onPress: () => {/* Copy to clipboard */} },
                  { text: 'Share', onPress: handleShareInvite },
                  { text: 'Cancel', style: 'cancel' }
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.inviteCode}>{inviteCodeToShow}</Text>
              <MaterialCommunityIcons name="content-copy" size={18} color="#495057" />
            </TouchableOpacity>
            
            <Text style={styles.inviteInstructions}>
              Share this code with friends to join the group
            </Text>

            {currentUserRole === 'ADMIN' && (
              <TouchableOpacity 
                style={styles.regenerateButton}
                onPress={handleRegenerateInviteCode}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#fff3bf', '#ffec99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.regenerateButtonGradient}
                >
                  <MaterialCommunityIcons name="refresh" size={14} color="#e67700" />
                  <Text style={styles.regenerateButtonText}>Regenerate</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Admin Warning */}
        {isOnlyAdmin && (
          <LinearGradient
            colors={['#fff3bf', '#ffec99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.warningSection}
          >
            <MaterialCommunityIcons name="alert-circle" size={20} color="#e67700" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>You are the only admin</Text>
              <Text style={styles.warningText}>
                Transfer ownership before leaving
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Members List */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionIcon}
            >
              <MaterialCommunityIcons name="account-multiple" size={14} color="#495057" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchData()}
              >
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.retryButtonGradient}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </LinearGradient>
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
                  <MaterialCommunityIcons name="account-group" size={48} color="#dee2e6" />
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
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isOnlyAdmin ? ['#f8f9fa', '#e9ecef'] : ['#fff5f5', '#ffe3e3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.leaveButtonGradient}
          >
            <MaterialCommunityIcons 
              name="exit-to-app" 
              size={18} 
              color={isOnlyAdmin ? "#adb5bd" : "#fa5252"} 
            />
            <Text style={[
              styles.leaveButtonText,
              isOnlyAdmin && styles.disabledLeaveButtonText
            ]}>
              {isOnlyAdmin ? 'Cannot Leave' : 'Leave Group'}
            </Text>
          </LinearGradient>
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
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={20} color="#868e96" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Transfer Ownership */}
              <TouchableOpacity 
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleTransferOwnership();
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#EEF2FF', '#dbe4ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.settingsIcon}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={18} color="#4F46E5" />
                </LinearGradient>
                <View style={styles.settingsContent}>
                  <Text style={styles.settingsTitle}>Transfer Ownership</Text>
                  <Text style={styles.settingsDescription}>
                    Make another member admin
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
              </TouchableOpacity>

              {/* Regenerate Invite Code */}
              <TouchableOpacity 
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleRegenerateInviteCode();
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#fff3bf', '#ffec99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.settingsIcon}
                >
                  <MaterialCommunityIcons name="refresh" size={18} color="#e67700" />
                </LinearGradient>
                <View style={styles.settingsContent}>
                  <Text style={styles.settingsTitle}>Regenerate Code</Text>
                  <Text style={styles.settingsDescription}>
                    Create new invite code
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
              </TouchableOpacity>

              {/* Delete Group - Danger */}
              <TouchableOpacity 
                style={[styles.settingsItem, styles.dangerItem]}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleDeleteGroup();
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#fff5f5', '#ffe3e3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.settingsIcon}
                >
                  <MaterialCommunityIcons name="trash-can" size={18} color="#fa5252" />
                </LinearGradient>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, styles.dangerText]}>Delete Group</Text>
                  <Text style={styles.settingsDescription}>
                    Permanently delete group
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#fa5252" />
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </LinearGradient>
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
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Group</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={20} color="#868e96" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Group Avatar Edit Section */}
              <View style={styles.avatarEditSection}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowEditModal(false);
                    setTimeout(() => handleGroupAvatarSelect(), 300);
                  }}
                  disabled={uploadingAvatar}
                  activeOpacity={0.7}
                >
                  {uploadingAvatar ? (
                    <View style={[styles.editAvatar, styles.uploadingAvatar]}>
                      <ActivityIndicator size="small" color="#2b8a3e" />
                    </View>
                  ) : groupInfo?.avatarUrl ? (
                    <Image
                      source={{ uri: groupInfo.avatarUrl }}
                      style={[styles.editAvatar, styles.editAvatarImage]}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#2b8a3e', '#1e6b2c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.editAvatar}
                    >
                      <MaterialCommunityIcons name="camera-plus" size={28} color="white" />
                    </LinearGradient>
                  )}
                  
                  {!uploadingAvatar && (
                    <LinearGradient
                      colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.editAvatarOverlay}
                    >
                      <MaterialCommunityIcons name="pencil" size={14} color="white" />
                    </LinearGradient>
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
                    <MaterialCommunityIcons name="trash-can" size={14} color="#fa5252" />
                    <Text style={styles.removeAvatarText}>Remove Avatar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Group Name</Text>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.inputGradient}
                >
                  <TextInput
                    style={styles.input}
                    value={editingGroup.name}
                    onChangeText={(text) => setEditingGroup({...editingGroup, name: text})}
                    placeholder="Enter group name"
                    placeholderTextColor="#adb5bd"
                    maxLength={100}
                  />
                </LinearGradient>
              </View>

              {/* Description Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.inputGradient, styles.textAreaGradient]}
                >
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editingGroup.description}
                    onChangeText={(text) => setEditingGroup({...editingGroup, description: text})}
                    placeholder="Enter group description"
                    placeholderTextColor="#adb5bd"
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </LinearGradient>
                <Text style={styles.charCount}>
                  {editingGroup.description.length}/500
                </Text>
              </View>

              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoBox}
              >
                <MaterialCommunityIcons name="information" size={14} color="#868e96" />
                <Text style={styles.infoText}>
                  Group name helps members identify the group
                </Text>
              </LinearGradient>
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
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={editingGroup.name.trim() ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  {savingGroup ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={[
                      styles.saveButtonText,
                      !editingGroup.name.trim() && styles.saveButtonTextDisabled
                    ]}>
                      Save
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
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
    color: '#868e96',
    fontSize: 14
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  avatarBanner: {
    padding: 20,
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
    borderColor: 'white'
  },
  avatarImage: {
    backgroundColor: 'transparent',
  },
  moreAvatar: {
    borderColor: '#e9ecef'
  },
  moreAvatarText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 13
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 16
  },
  adminCrown: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b8a3e'
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  groupAvatarContainer: {
    position: 'relative',
    marginRight: 16
  },
  groupMainAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupAvatarImage: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2b8a3e'
  },
  groupAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  uploadingAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white'
  },
  groupTextInfo: {
    flex: 1
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  groupDescription: {
    fontSize: 14,
    color: '#868e96',
    marginBottom: 8,
    lineHeight: 20
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
    fontSize: 13,
    color: '#495057'
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12
  },
  adminButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  adminButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  editButton: {},
  shareButton: {},
  inviteSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529'
  },
  inviteCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    letterSpacing: 2
  },
  inviteInstructions: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 12
  },
  regenerateButton: {
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start'
  },
  regenerateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700'
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  warningContent: {
    flex: 1
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e67700',
    marginBottom: 2
  },
  warningText: {
    fontSize: 13,
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
    color: '#fa5252',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  memberAvatarImage: {
    backgroundColor: 'transparent'
  },
  memberAvatarText: {
    fontWeight: 'bold',
    fontSize: 16
  },
  memberDetails: {
    flex: 1
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529'
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2b8a3e'
  },
  memberEmail: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 2
  },
  memberJoined: {
    fontSize: 11,
    color: '#adb5bd'
  },
  memberActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  roleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  demoteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffc9c9'
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  protectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  currentUserBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  currentUserBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#495057'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#868e96',
    marginTop: 8
  },
  leaveButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  leaveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14
  },
  disabledLeaveButton: {
    opacity: 0.7
  },
  leaveButtonText: {
    fontSize: 15,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBody: {
    padding: 20
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#868e96'
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden'
  },
  saveButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white'
  },
  saveButtonTextDisabled: {
    color: '#868e96'
  },
  avatarEditSection: {
    alignItems: 'center',
    marginBottom: 24
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  editAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#2b8a3e'
  },
  editAvatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarNote: {
    fontSize: 13,
    color: '#868e96',
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
    fontSize: 13,
    color: '#fa5252'
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  inputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  textAreaGradient: {
    minHeight: 80
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212529',
    backgroundColor: 'transparent'
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  charCount: {
    fontSize: 11,
    color: '#868e96',
    textAlign: 'right',
    marginTop: 4
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  infoText: {
    fontSize: 13,
    color: '#868e96',
    flex: 1,
    lineHeight: 18
  },
  // Settings Modal Items
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12
  },
  dangerItem: {
    borderBottomWidth: 0
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingsContent: {
    flex: 1
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2
  },
  settingsDescription: {
    fontSize: 13,
    color: '#868e96'
  },
  dangerText: {
    color: '#fa5252'
  }
});