import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Clipboard,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GroupService } from '../services/GroupService';
import { GroupMembersService } from '../services/GroupMemberService';

export const GroupSettingsScreen = ({ navigation, route }: any) => {
  const { groupId, groupName, userRole } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      // Get group info from GroupMembersService (already exists)
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setGroup(groupResult.group);
        setEditedName(groupResult.group?.name || '');
        setEditedDescription(groupResult.group?.description || '');
        setInviteCode(groupResult.group?.inviteCode || '');
      }

      // Get members for admin transfer (already exists)
      if (isAdmin) {
        const membersResult = await GroupMembersService.getGroupMembers(groupId);
        if (membersResult.success) {
          setMembers(membersResult.members || []);
        }
      }

    } catch (error) {
      console.error('Error loading group settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      // Using GroupMembersService.updateGroup (already exists in your service)
      const result = await GroupMembersService.updateGroup(groupId, {
        name: editedName.trim(),
        description: editedDescription.trim() || undefined,
      });

      if (result.success) {
        Alert.alert('Success', 'Group settings updated');
        setIsEditing(false);
        loadGroupData();
      } else {
        Alert.alert('Error', result.message || 'Failed to update group');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (inviteCode) {
      Clipboard.setString(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const handleShareInviteCode = async () => {
    if (inviteCode) {
      try {
        await Share.share({
          message: `Join my group "${group?.name || groupName}" on GroupTask with invite code: ${inviteCode}`,
          title: 'Group Invite',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
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
            try {
              // Note: You might need to add this method to your backend
              // For now, show coming soon
              Alert.alert('Coming Soon', 'Regenerate invite code will be available soon');
              
              // When backend is ready, uncomment:
              // const result = await GroupService.regenerateInviteCode(groupId);
              // if (result.success) {
              //   setInviteCode(result.inviteCode);
              //   Alert.alert('Success', 'New invite code generated');
              // } else {
              //   Alert.alert('Error', result.message || 'Failed to regenerate code');
              // }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to regenerate code');
            }
          }
        }
      ]
    );
  };

  const handleTransferOwnership = () => {
    // Filter out current user and get other members
    const otherMembers = members.filter(m => m.userId !== group?.createdById);
    
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
          text: `${m.user?.fullName} ${m.groupRole === 'ADMIN' ? '(Admin)' : '(Member)'}`,
          onPress: () => confirmTransfer(m.userId, m.user?.fullName)
        })),
      ]
    );
  };

  const confirmTransfer = (newAdminId: string, newAdminName: string) => {
    Alert.alert(
      'Confirm Transfer',
      `Are you sure you want to make ${newAdminName} the new group admin? You will lose admin privileges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Using GroupMembersService.updateMemberRole (already exists)
              const result = await GroupMembersService.updateMemberRole(groupId, newAdminId, 'ADMIN');
              
              if (result.success) {
                // Also demote current admin to MEMBER
                await GroupMembersService.updateMemberRole(groupId, group?.createdById, 'MEMBER');
                
                Alert.alert(
                  'Success',
                  'Ownership transferred. You are now a regular member.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else {
                Alert.alert('Error', result.message || 'Failed to transfer ownership');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to transfer ownership');
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
            try {
              // Note: You might need to add deleteGroup to your GroupService
              Alert.alert('Coming Soon', 'Delete group feature will be available soon');
              
              // When backend is ready, uncomment:
              // const result = await GroupService.deleteGroup(groupId);
              // if (result.success) {
              //   Alert.alert(
              //     'Group Deleted',
              //     'The group has been permanently deleted.',
              //     [{ text: 'OK', onPress: () => navigation.navigate('MyGroups') }]
              //   );
              // } else {
              //   Alert.alert('Error', result.message || 'Failed to delete group');
              // }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete group');
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              // Using GroupMembersService.leaveGroup (already exists)
              const result = await GroupMembersService.leaveGroup(groupId);
              
              if (result.success) {
                Alert.alert(
                  'Left Group',
                  'You have successfully left the group.',
                  [{ text: 'OK', onPress: () => navigation.navigate('MyGroups') }]
                );
              } else {
                Alert.alert('Error', result.message || 'Failed to leave group');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave group');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading group settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        {isAdmin && !isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
        )}
        {isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Group Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          
          <View style={styles.infoCard}>
            {isEditing ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Group Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter group name"
                    maxLength={50}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editedDescription}
                    onChangeText={setEditedDescription}
                    placeholder="Enter group description (optional)"
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Ionicons name="people" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Group Name:</Text>
                  <Text style={styles.infoValue}>{group?.name || groupName}</Text>
                </View>
                
                {group?.description ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text" size={20} color="#6B7280" />
                    <Text style={styles.infoLabel}>Description:</Text>
                    <Text style={styles.infoValue}>{group.description}</Text>
                  </View>
                ) : null}
                
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Created:</Text>
                  <Text style={styles.infoValue}>
                    {group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Invite Code Section - Admin Only */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite Code</Text>
            
            <View style={styles.inviteCard}>
              <TouchableOpacity
                style={styles.codeContainer}
                onPress={() => setShowInviteCode(!showInviteCode)}
              >
                <Text style={styles.codeLabel}>Invite Code:</Text>
                <Text style={styles.codeValue}>
                  {showInviteCode ? inviteCode : '••••••••'}
                </Text>
                <Ionicons 
                  name={showInviteCode ? 'eye-off' : 'eye'} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>

              <View style={styles.inviteActions}>
                <TouchableOpacity style={styles.inviteButton} onPress={handleCopyInviteCode}>
                  <Ionicons name="copy" size={18} color="#4F46E5" />
                  <Text style={styles.inviteButtonText}>Copy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.inviteButton} onPress={handleShareInviteCode}>
                  <Ionicons name="share-social" size={18} color="#4F46E5" />
                  <Text style={styles.inviteButtonText}>Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.inviteButton} onPress={handleRegenerateInviteCode}>
                  <Ionicons name="refresh" size={18} color="#EF4444" />
                  <Text style={[styles.inviteButtonText, { color: '#EF4444' }]}>Regenerate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Admin Actions - Admin Only */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleTransferOwnership}
              >
                <View style={styles.actionLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="swap-horizontal" size={20} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={styles.actionTitle}>Transfer Ownership</Text>
                    <Text style={styles.actionDescription}>
                      Make another member the group admin
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRow, styles.dangerRow]}
                onPress={handleDeleteGroup}
              >
                <View style={styles.actionLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </View>
                  <View>
                    <Text style={[styles.actionTitle, styles.dangerText]}>
                      Delete Group
                    </Text>
                    <Text style={styles.actionDescription}>
                      Permanently delete this group and all tasks
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Member Actions */}
        {!isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Member Actions</Text>
            
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={[styles.actionRow, styles.dangerRow]}
                onPress={handleLeaveGroup}
              >
                <View style={styles.actionLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="exit" size={20} color="#EF4444" />
                  </View>
                  <View>
                    <Text style={[styles.actionTitle, styles.dangerText]}>
                      Leave Group
                    </Text>
                    <Text style={styles.actionDescription}>
                      Remove yourself from this group
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Group Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Statistics</Text>
          
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{members.length || 0}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{group?.taskCount || 0}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Week {group?.currentRotationWeek || 1}</Text>
              <Text style={styles.statLabel}>Rotation</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  codeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  codeValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 1,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  dangerText: {
    color: '#EF4444',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
});