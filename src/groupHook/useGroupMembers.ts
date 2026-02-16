import { useState, useCallback } from 'react';
import { GroupMembersService } from '../services/GroupMemberService';
import { API_BASE_URL } from '../config/api';

export function useGroupMembers() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  // Helper to ensure URLs are complete
  const ensureFullUrl = useCallback((url: string): string => {
    if (!url) return url;
    
    // If it's already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it starts with /uploads, prepend base URL
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Default case
    return url;
  }, []);

  const fetchGroupMembers = useCallback(async (groupId: string, isRefreshing = false) => {
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
          role: member.groupRole || member.role || 'MEMBER',
          // Ensure avatarUrl is complete
          avatarUrl: member.avatarUrl ? ensureFullUrl(member.avatarUrl) : null
        }));
        setMembers(formattedMembers);
      } else {
        setError(membersResult.message || 'Failed to load members');
      }

      // Get group info
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        const groupData = groupResult.group || {};
        // Ensure group avatar URL is complete
        if (groupData.avatarUrl) {
          groupData.avatarUrl = ensureFullUrl(groupData.avatarUrl);
        }
        setGroupInfo(groupData);
      } else {
        console.warn('Could not load group info:', groupResult.message);
      }

    } catch (err: any) {
      console.error('Error fetching group members:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ensureFullUrl]);

  // Method to update group avatar locally
  const updateGroupAvatar = useCallback((avatarUrl: string) => {
    setGroupInfo((prev: any) => ({
      ...prev,
      avatarUrl: ensureFullUrl(avatarUrl)
    }));
  }, [ensureFullUrl]);

  // Method to remove group avatar locally
  const removeGroupAvatar = useCallback(() => {
    setGroupInfo((prev: any) => ({
      ...prev,
      avatarUrl: null
    }));
  }, []);

  // ✅ NEW: Update group info after editing
  const updateGroupInfo = useCallback((updatedGroup: any) => {
    setGroupInfo((prev: any) => ({
      ...prev,
      ...updatedGroup,
      avatarUrl: updatedGroup.avatarUrl ? ensureFullUrl(updatedGroup.avatarUrl) : prev?.avatarUrl
    }));
  }, [ensureFullUrl]);

  // ✅ NEW: Transfer ownership
  const transferOwnership = useCallback(async (groupId: string, newAdminId: string) => {
    try {
      const result = await GroupMembersService.transferOwnership(groupId, newAdminId);
      
      if (result.success) {
        // Update members list to reflect role changes
        setMembers((prevMembers: any[]) => 
          prevMembers.map(member => {
            if (member.userId === newAdminId) {
              return { ...member, role: 'ADMIN' };
            }
            // Find current user ID from groupInfo or members
            const currentUserId = groupInfo?.userId || members.find(m => m.role === 'ADMIN')?.userId;
            if (member.userId === currentUserId) {
              return { ...member, role: 'MEMBER' };
            }
            return member;
          })
        );
        
        // Update groupInfo userRole if needed
        if (groupInfo) {
          setGroupInfo((prev: any) => ({
            ...prev,
            userRole: prev.userId === newAdminId ? 'ADMIN' : 'MEMBER'
          }));
        }
      }
      
      return result;
    } catch (err: any) {
      console.error('Error transferring ownership:', err);
      return { success: false, message: err.message };
    }
  }, [groupInfo, members]);

  // ✅ NEW: Regenerate invite code
  const regenerateInviteCode = useCallback(async (groupId: string) => {
    try {
      const result = await GroupMembersService.regenerateInviteCode(groupId);
      
      if (result.success) {
        setGroupInfo((prev: any) => ({
          ...prev,
          inviteCode: result.inviteCode
        }));
      }
      
      return result;
    } catch (err: any) {
      console.error('Error regenerating invite code:', err);
      return { success: false, message: err.message };
    }
  }, []);

  // ✅ NEW: Delete group
  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      const result = await GroupMembersService.deleteGroup(groupId);
      return result;
    } catch (err: any) {
      console.error('Error deleting group:', err);
      return { success: false, message: err.message };
    }
  }, []);

  // ✅ NEW: Get group settings
  const getGroupSettings = useCallback(async (groupId: string) => {
    try {
      const result = await GroupMembersService.getGroupSettings(groupId);
      return result;
    } catch (err: any) {
      console.error('Error getting group settings:', err);
      return { success: false, message: err.message };
    }
  }, []);

  // ✅ NEW: Update member role with automatic state update
  const updateMemberRole = useCallback(async (groupId: string, memberId: string, newRole: string) => {
    try {
      const result = await GroupMembersService.updateMemberRole(groupId, memberId, newRole);
      
      if (result.success) {
        setMembers((prevMembers: any[]) =>
          prevMembers.map(member =>
            member.id === memberId ? { ...member, role: newRole } : member
          )
        );
      }
      
      return result;
    } catch (err: any) {
      console.error('Error updating member role:', err);
      return { success: false, message: err.message };
    }
  }, []);

  // ✅ NEW: Remove member with automatic state update
  const removeMember = useCallback(async (groupId: string, memberId: string) => {
    try {
      const result = await GroupMembersService.removeMember(groupId, memberId);
      
      if (result.success) {
        setMembers((prevMembers: any[]) =>
          prevMembers.filter(member => member.id !== memberId)
        );
      }
      
      return result;
    } catch (err: any) {
      console.error('Error removing member:', err);
      return { success: false, message: err.message };
    }
  }, []);

  return {
    // State
    loading,
    refreshing,
    error,
    members,
    groupInfo,
    
    // Core methods
    fetchGroupMembers,
    updateGroupAvatar,
    removeGroupAvatar,
    setMembers,
    setGroupInfo,
    setError,
    
    // ✅ NEW: Additional methods
    updateGroupInfo,
    transferOwnership,
    regenerateInviteCode,
    deleteGroup,
    getGroupSettings,
    updateMemberRole,
    removeMember
  };
}