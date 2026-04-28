// src/screens/GroupMembersScreen.tsx - Dark Mode Added
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert, 
  Share,
  ScrollView,
  Modal,
  TextInput, 
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';

import { GroupMembersService } from '../services/GroupMemberService';
import { GroupSettingsService } from '../services/GroupSettingsService';
import { useGroupMembers } from '../groupHook/useGroupMembers';
import { useImageUpload } from '../uploadHook/useImageUpload';
import { useRealtimeGroup } from '../hooks/useRealtimeGroup';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { makeGroupMembersStyles } from '../styles/groupMembers.styles';
import { UploadResponse } from '../uploadService/UploadService';

export default function GroupMembersScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const styles = makeGroupMembersStyles(theme);
  
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
    updateMaxMembers,
    setMembers,
    setGroupInfo,
    updateGroupInfo,
    transferOwnership,
    regenerateInviteCode,
    deleteGroup,
    updateMemberRole,
    removeMember
  } = useGroupMembers();

  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

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
  
  // Member Limit State
  const [showMaxModal, setShowMaxModal] = useState(false);
  const [newMax, setNewMax] = useState('6');
  const [updatingMax, setUpdatingMax] = useState(false);
  
  // Avatar upload hook - for group avatars
  const {
    uploading: uploadingAvatar,
    pickImageFromGallery,
    takePhotoWithCamera,
    uploadGroupAvatar,
    uploadGroupAvatarToCloudinary,  
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

  // ===== UPDATED: Use TokenUtils.checkToken() =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => {
        Alert.alert('Session Expired', 'Please log in again');
      }
    });
    return hasToken;
  }, []); 

  // ===== HANDLE REAL-TIME GROUP EVENTS =====
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

  // Get current user ID from SecureStore
  useEffect(() => {
    const loadCurrentUserId = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }
      } catch (err) {
        console.error('Error loading user ID:', err);
      }
    };
    loadCurrentUserId();
    
    return () => {
      isMounted.current = false;
    };
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
      setNewMax(groupInfo.maxMembers?.toString() || '6');
    }
  }, [groupInfo]);

  const fetchData = async (isRefreshing = false) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      return;
    }
    await fetchGroupMembers(groupId, isRefreshing);
  };

  useEffect(() => {
    if (groupId && !initialLoadDone.current) {
      fetchData();
      initialLoadDone.current = true;
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
const handleCopyInviteCode = async () => {
  const code = inviteCode || groupInfo?.inviteCode;
  if (!code) {
    Alert.alert('Error', 'No invite code available');
    return;
  }
  
  await Clipboard.setStringAsync(code);
  Alert.alert('✅ Copied!', 'Invite code copied to clipboard');
};
  const handleEditGroup = () => {
    setShowEditModal(true);
  };

  const handleSaveGroupChanges = async () => {
    if (!editingGroup.name.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    try {
      setSavingGroup(true);
      
      const hasChanged = 
        editingGroup.name.trim() !== (groupInfo?.name || '') ||
        editingGroup.description !== (groupInfo?.description || '');

      if (!hasChanged) {
        Alert.alert('Info', 'No changes detected');
        setShowEditModal(false);
        return;
      }

      const result = await GroupMembersService.updateGroup(groupId, {
        name: editingGroup.name.trim(),
        description: editingGroup.description.trim()
      });
      
      if (result.success && isMounted.current) {
        updateGroupInfo(groupId, {
          ...groupInfo,
          ...result.group,
          name: editingGroup.name.trim(),
          description: editingGroup.description.trim()
        });
        
        Alert.alert('Success', 'Group updated successfully');
        setShowEditModal(false);
        fetchData(true);
      } else {
        Alert.alert('Error', result.message || 'Failed to update group');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update group');
    } finally {
      if (isMounted.current) {
        setSavingGroup(false);
      }
    }
  };

  const handleUpdateMaxMembers = async () => {
    const max = parseInt(newMax);
    if (isNaN(max) || max < 6 || max > 10) {
      Alert.alert('Error', 'Please select a number between 6 and 10');
      return;
    }

    setUpdatingMax(true);
    try {
      const result = await GroupSettingsService.updateMaxMembers(groupId, max);
      if (result.success && isMounted.current) {
        updateMaxMembers(max);
        
        Alert.alert('Success', `Group capacity updated to ${max} members`);
        setShowMaxModal(false);
        
        fetchData(true);
      } else {
        Alert.alert('Error', result.message || 'Failed to update capacity');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update capacity');
    } finally {
      if (isMounted.current) {
        setUpdatingMax(false);
      }
    }
  };

  const renderMemberLimitBanner = () => {
    if (!groupInfo) return null;
    
    const memberCount = members.length;
    const maxMembers = groupInfo.maxMembers || 6;
    const isLow = memberCount < 6;
    const isFull = memberCount >= maxMembers;
    
    let bannerColor = isFull ? theme.error : (isLow ? theme.primary : theme.primary);
    let bannerBg = isFull ? theme.errorBg : (isLow ? theme.primaryLight : theme.primaryLight);
    let message = '';
    
    if (isFull) {
      message = `Group is full (${memberCount}/${maxMembers} members)`;
    } else if (isLow) {
      message = `Need ${6 - memberCount} more member${6 - memberCount > 1 ? 's' : ''} to reach minimum (${memberCount}/${maxMembers})`;
    } else {
      message = `${memberCount}/${maxMembers} members - Good for rotation`;
    }

    return (
      <LinearGradient
        colors={[bannerBg, bannerBg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.limitBanner}
      >
        <MaterialCommunityIcons 
          name={isFull ? "alert-circle" : (isLow ? "alert" : "check-circle")} 
          size={20} 
          color={bannerColor} 
        />
        <Text style={[styles.limitText, { color: bannerColor }]}>
          {message}
        </Text>
        
        {currentUserRole === 'ADMIN' && (
          <TouchableOpacity 
            onPress={() => setShowMaxModal(true)}
            style={styles.editLimitButton}
          >
            <MaterialCommunityIcons name="pencil" size={18} color={theme.primary} />
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  };

  // Group avatar handlers
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
      const result = await uploadGroupAvatarToCloudinary(groupId, photo);
      // ✅ Type assertion - tell TypeScript this is UploadResponse
      const uploadResult = result as UploadResponse;
      if (uploadResult.success && uploadResult.data?.avatarUrl) {
        updateGroupAvatar(uploadResult.data.avatarUrl);
        Alert.alert('Success', 'Group avatar updated successfully');
      } else {
        Alert.alert('Error', uploadResult.message || 'Failed to upload avatar');
      }
    }
  } catch (err: any) {
    Alert.alert('Error', 'Failed to take photo: ' + err.message);
  }
};

const handleChooseGroupPhoto = async () => {
  try {
    const photo = await pickImageFromGallery();
    if (photo) {
      const result = await uploadGroupAvatarToCloudinary(groupId, photo);
      // ✅ Check result.success first, then access data
       const uploadResult = result as UploadResponse;
      if (uploadResult.success && uploadResult.data?.avatarUrl) {
        updateGroupAvatar(uploadResult.data.avatarUrl);
        Alert.alert('Success', 'Group avatar updated successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to upload avatar');
      }
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
    if (member.userId === currentUserId) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself. Use "Leave Group" instead.');
      return;
    }

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
            colors={[theme.bgSecondary, theme.bgTertiary]}
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
                borderColor: member.role === 'ADMIN' ? theme.primary : theme.border
              }
            ]}
          />
        ) : (
          <LinearGradient
            colors={member.role === 'ADMIN' ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.avatar,
              { 
                width: avatarSize, 
                height: avatarSize, 
                borderRadius: avatarSize / 2,
                borderWidth: 2,
                borderColor: member.role === 'ADMIN' ? theme.primary : theme.border
              }
            ]}
          >
            <Text style={[
              styles.avatarText,
              { color: member.role === 'ADMIN' ? '#fff' : theme.textSecondary }
            ]}>
              {member.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </LinearGradient>
        )}
        {member.role === 'ADMIN' && (
          <View style={styles.adminCrown}>
            <MaterialCommunityIcons name="crown" size={10} color={theme.primary} />
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
      <View style={[styles.memberCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.memberInfo}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={[
                styles.memberAvatar,
                styles.memberAvatarImage,
                { 
                  borderWidth: 2,
                  borderColor: item.role === 'ADMIN' ? theme.primary : theme.border
                }
              ]}
            />
          ) : (
            <LinearGradient
              colors={item.role === 'ADMIN' ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.memberAvatar,
                { borderWidth: 2, borderColor: item.role === 'ADMIN' ? theme.primary : theme.border }
              ]}
            >
              <Text style={[
                styles.memberAvatarText,
                { color: item.role === 'ADMIN' ? '#fff' : theme.textSecondary }
              ]}>
                {item.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.memberDetails}>
            <View style={styles.memberHeader}>
              <Text style={[styles.memberName, { color: theme.text }]}>
                {item.fullName} {isCurrentUser && '(You)'}
              </Text>
              {item.role === 'ADMIN' && (
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminBadge}
                >
                  <MaterialCommunityIcons name="crown" size={12} color={theme.primary} />
                  <Text style={[styles.adminBadgeText, { color: theme.primary }]}>Admin</Text>
                </LinearGradient>
              )}
            </View>
            {item.email && (
              <Text style={[styles.memberEmail, { color: theme.textMuted }]}>{item.email}</Text>
            )}
            {item.joinedAt && (
              <Text style={[styles.memberJoined, { color: theme.textMuted }]}>
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
                  color={item.role === 'ADMIN' ? theme.error : theme.primary} 
                />
              </TouchableOpacity>
            )}
            
            {!isOnlyAdmin && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMember(item)}
              >
                <MaterialCommunityIcons name="account-remove" size={16} color={theme.error} />
              </TouchableOpacity>
            )}
            
            {isOnlyAdmin && (
              <LinearGradient
                colors={[theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.protectedBadge}
              >
                <MaterialCommunityIcons name="shield-check" size={14} color={theme.primary} />
              </LinearGradient>
            )}
          </View>
        )}

        {isCurrentUser && (
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentUserBadge}
          >
            <Text style={[styles.currentUserBadgeText, { color: theme.textSecondary }]}>You</Text>
          </LinearGradient>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading group...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const inviteCodeToShow = inviteCode || groupInfo?.inviteCode;
  const canSeeInviteCode = currentUserRole === 'ADMIN';
  const adminCount = members.filter(m => m.role === 'ADMIN').length;
  const isOnlyAdmin = currentUserRole === 'ADMIN' && adminCount <= 1;

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Group Info</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => fetchData(true)} style={styles.headerIcon}>
            <MaterialCommunityIcons name="refresh" size={20} color={theme.primary} />
          </TouchableOpacity>
          {currentUserRole === 'ADMIN' && (
            <TouchableOpacity 
              onPress={() => setShowSettingsModal(true)} 
              style={styles.headerIcon}
            >
              <MaterialCommunityIcons name="cog" size={20} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Member Limit Banner */}
      {renderMemberLimitBanner()}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[theme.primary]}
            tintColor={theme.primary}
            progressBackgroundColor={theme.bgSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Group Avatar Banner */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.avatarBanner, { borderColor: theme.border }]}
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
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : groupInfo?.avatarUrl ? (
                <Image
                  source={{ uri: groupInfo.avatarUrl }}
                  style={[styles.groupMainAvatar, styles.groupAvatarImage]}
                />
              ) : (
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
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
                  colors={[theme.primary, theme.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.editAvatarIcon}
                >
                  <MaterialCommunityIcons name="camera-plus" size={14} color="#fff" />
                </LinearGradient>
              )}
            </View>
            
            <View style={styles.groupTextInfo}>
              <Text style={[styles.groupName, { color: theme.text }]}>{groupInfo?.name || groupName || 'Group'}</Text>
              {groupInfo?.description && (
                <Text style={[styles.groupDescription, { color: theme.textMuted }]}>{groupInfo.description}</Text>
              )}
              <View style={styles.groupStats}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-group" size={14} color={theme.textMuted} />
                  <Text style={[styles.statText, { color: theme.textMuted }]}>{members.length} members</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="crown" size={14} color={theme.primary} />
                  <Text style={[styles.statText, { color: theme.textMuted }]}>{adminCount} admins</Text>
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
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminButtonGradient}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color={theme.textSecondary} />
                  <Text style={[styles.adminButtonText, { color: theme.textSecondary }]}>Edit</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.adminButton, styles.shareButton]} 
                onPress={handleShareInvite}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminButtonGradient}
                >
                  <MaterialCommunityIcons name="share-variant" size={16} color={theme.textSecondary} />
                  <Text style={[styles.adminButtonText, { color: theme.textSecondary }]}>Share</Text>
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
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sectionIcon}
              >
                <MaterialCommunityIcons name="qrcode" size={14} color={theme.textSecondary} />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Invite Code</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.inviteCodeCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
              onPress={() => {
                Alert.alert('Invite Code', inviteCodeToShow, [
                  { text: 'Copy', onPress: () => {handleCopyInviteCode} },
                  { text: 'Share', onPress: handleShareInvite },
                  { text: 'Cancel', style: 'cancel' }
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.inviteCode, { color: theme.text }]}>{inviteCodeToShow}</Text>
              <MaterialCommunityIcons name="content-copy" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            
            <Text style={[styles.inviteInstructions, { color: theme.textMuted }]}>
              Share this code with friends to join the group
            </Text>

            {currentUserRole === 'ADMIN' && (
              <TouchableOpacity 
                style={styles.regenerateButton}
                onPress={handleRegenerateInviteCode}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.regenerateButtonGradient}
                >
                  <MaterialCommunityIcons name="refresh" size={14} color={theme.primary} />
                  <Text style={[styles.regenerateButtonText, { color: theme.primary }]}>Regenerate</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Admin Warning */}
        {isOnlyAdmin && (
          <LinearGradient
            colors={[theme.primaryLight, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.warningSection, { borderColor: theme.primaryBorder }]}
          >
            <MaterialCommunityIcons name="alert-circle" size={20} color={theme.primary} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: theme.primary }]}>You are the only admin</Text>
              <Text style={[styles.warningText, { color: theme.primary }]}>
                Transfer ownership before leaving
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Members List */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionIcon}
            >
              <MaterialCommunityIcons name="account-multiple" size={14} color={theme.textSecondary} />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Members ({members.length})</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchData()}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
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
                  <MaterialCommunityIcons name="account-group" size={48} color={theme.border} />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>No members found</Text>
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
            colors={isOnlyAdmin ? [theme.bgSecondary, theme.bgTertiary] : [theme.errorBg, theme.errorBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.leaveButtonGradient}
          >
            <MaterialCommunityIcons 
              name="exit-to-app" 
              size={18} 
              color={isOnlyAdmin ? theme.textPlaceholder : theme.error} 
            />
            <Text style={[
              styles.leaveButtonText,
              isOnlyAdmin && styles.disabledLeaveButtonText,
              { color: isOnlyAdmin ? theme.textPlaceholder : theme.error }
            ]}>
              {isOnlyAdmin ? 'Cannot Leave' : 'Leave Group'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal - Keep original styles with inline colors */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.overlay }]}>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Group Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={[styles.closeButton, { backgroundColor: theme.bgSecondary }]}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Transfer Ownership */}
              <TouchableOpacity 
                style={[styles.settingsItem, { borderBottomColor: theme.border }]}
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
                  <Text style={[styles.settingsTitle, { color: theme.text }]}>Transfer Ownership</Text>
                  <Text style={[styles.settingsDescription, { color: theme.textMuted }]}>
                    Make another member admin
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>

              {/* Regenerate Invite Code */}
              <TouchableOpacity 
                style={[styles.settingsItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleRegenerateInviteCode();
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.settingsIcon}
                >
                  <MaterialCommunityIcons name="refresh" size={18} color={theme.primary} />
                </LinearGradient>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, { color: theme.text }]}>Regenerate Code</Text>
                  <Text style={[styles.settingsDescription, { color: theme.textMuted }]}>
                    Create new invite code
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>

              {/* Delete Group - Danger */}
              <TouchableOpacity 
                style={[styles.settingsItem, styles.dangerItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleDeleteGroup();
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[theme.errorBg, theme.errorBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.settingsIcon}
                >
                  <MaterialCommunityIcons name="trash-can" size={18} color={theme.error} />
                </LinearGradient>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, styles.dangerText, { color: theme.error }]}>Delete Group</Text>
                  <Text style={[styles.settingsDescription, { color: theme.textMuted }]}>
                    Permanently delete group
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.error} />
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* Edit Group Modal - Keep original styles with inline colors */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.overlay }]}>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Group</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={[styles.closeButton, { backgroundColor: theme.bgSecondary }]}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
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
                      <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                  ) : groupInfo?.avatarUrl ? (
                    <Image
                      source={{ uri: groupInfo.avatarUrl }}
                      style={[styles.editAvatar, styles.editAvatarImage]}
                    />
                  ) : (
                    <LinearGradient
                      colors={[theme.primary, theme.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.editAvatar}
                    >
                      <MaterialCommunityIcons name="camera-plus" size={28} color="#fff" />
                    </LinearGradient>
                  )}
                  
                  {!uploadingAvatar && (
                    <LinearGradient
                      colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.editAvatarOverlay}
                    >
                      <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
                <Text style={[styles.avatarNote, { color: theme.textMuted }]}>
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
                    <MaterialCommunityIcons name="trash-can" size={14} color={theme.error} />
                    <Text style={[styles.removeAvatarText, { color: theme.error }]}>Remove Avatar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Group Name</Text>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.inputGradient, { borderColor: theme.border }]}
                >
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={editingGroup.name}
                    onChangeText={(text) => setEditingGroup({...editingGroup, name: text})}
                    placeholder="Enter group name"
                    placeholderTextColor={theme.textPlaceholder}
                    maxLength={100}
                    selectionColor={theme.primary}
                  />
                </LinearGradient>
              </View>

              {/* Description Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.inputGradient, styles.textAreaGradient, { borderColor: theme.border }]}
                >
                  <TextInput
                    style={[styles.input, styles.textArea, { color: theme.text }]}
                    value={editingGroup.description}
                    onChangeText={(text) => setEditingGroup({...editingGroup, description: text})}
                    placeholder="Enter group description"
                    placeholderTextColor={theme.textPlaceholder}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                    selectionColor={theme.primary}
                  />
                </LinearGradient>
                <Text style={[styles.charCount, { color: theme.textMuted }]}>
                  {editingGroup.description.length}/500
                </Text>
              </View>

              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.infoBox, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="information" size={14} color={theme.textMuted} />
                <Text style={[styles.infoText, { color: theme.textMuted }]}>
                  Group name helps members identify the group
                </Text>
              </LinearGradient>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
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
                  colors={editingGroup.name.trim() ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  {savingGroup ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[
                      styles.saveButtonText,
                      !editingGroup.name.trim() && styles.saveButtonTextDisabled,
                      { color: editingGroup.name.trim() ? '#fff' : theme.textMuted }
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

      {/* Max Members Modal */}
      <Modal
        visible={showMaxModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMaxModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.overlay }]}>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Update Group Capacity</Text>
              <TouchableOpacity onPress={() => setShowMaxModal(false)} style={[styles.closeButton, { backgroundColor: theme.bgSecondary }]}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Current: {members.length}/{groupInfo?.maxMembers || 6} members
              </Text>

              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: theme.text }]}>Max Members: {newMax}</Text>
                <View style={styles.slider}>
                  {[6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.sliderOption,
                        parseInt(newMax) === num && styles.sliderOptionActive,
                        { borderColor: theme.border }
                      ]}
                      onPress={() => setNewMax(num.toString())}
                      disabled={num < members.length}
                    >
                      <Text style={[
                        styles.sliderOptionText,
                        parseInt(newMax) === num && styles.sliderOptionTextActive,
                        num < members.length && styles.sliderOptionDisabled,
                        { color: parseInt(newMax) === num ? '#fff' : theme.textSecondary }
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                  onPress={() => setShowMaxModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateMaxMembers}
                  disabled={updatingMax}
                >
                  <LinearGradient
                    colors={[theme.primary, theme.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButtonGradient}
                  >
                    {updatingMax ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}