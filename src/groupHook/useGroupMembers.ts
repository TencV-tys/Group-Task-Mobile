// src/hooks/useGroupMembers.ts - UPDATED with maxMembers support
import { useState, useCallback } from 'react';
import { GroupMembersService } from '../services/GroupMemberService';
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

export function useGroupMembers() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [authError, setAuthError] = useState(false);

  // Check token before making requests from SecureStore
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 useGroupMembers: No auth token available in SecureStore');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      console.log('✅ useGroupMembers: Auth token found in SecureStore');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ useGroupMembers: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  // Helper to ensure URLs are complete
  const ensureFullUrl = useCallback((url: string): string => {
    if (!url) return url;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    return url;
  }, []);

  const fetchGroupMembers = useCallback(async (groupId: string, isRefreshing = false) => {
    // Check token first
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setAuthError(false);

    try {
      console.log(`📥 useGroupMembers: Fetching members for group ${groupId}`);
      
      // Fetch members
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      
      if (membersResult.success) {
        const formattedMembers = (membersResult.members || []).map((member: any) => ({
          ...member,
          role: member.groupRole || member.role || 'MEMBER',
          avatarUrl: member.avatarUrl ? ensureFullUrl(member.avatarUrl) : null
        }));
        setMembers(formattedMembers);
        console.log(`✅ useGroupMembers: Loaded ${formattedMembers.length} members`);
      } else {
        setError(membersResult.message || 'Failed to load members');
        if (membersResult.message?.toLowerCase().includes('token') || 
            membersResult.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
 
      // Get group info - FIXED to include maxMembers
      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      console.log('📦 RAW API RESPONSE:', JSON.stringify(groupResult, null, 2)); // ← ADD THIS
      if (groupResult.success) {
             console.log('📦 Group data from API:', groupResult.group.maxMembers); // ← ADD THIS
  console.log('📦 maxMembers from API:', groupResult.group?.maxMembers); //

        const groupData = groupResult.group || {};
        if (groupData.avatarUrl) {
          groupData.avatarUrl = ensureFullUrl(groupData.avatarUrl);
        }
        // ===== FIX: Ensure maxMembers is set (default to 6) =====
        setGroupInfo({
          ...groupData,
          maxMembers: groupData.maxMembers || 6
        });
        console.log(`✅ useGroupMembers: Loaded group info for ${groupData.name} with maxMembers: ${groupData.maxMembers || 6}`);
      } else {
        console.warn('⚠️ Could not load group info:', groupResult.message);
      }

    } catch (err: any) {
      console.error('❌ Error fetching group members:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ensureFullUrl, checkToken]);

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

  const updateMaxMembers = useCallback((newMax: number) => {
  setGroupInfo((prev: any) => ({
    ...prev,
    maxMembers: newMax
  }));
}, []);


  const updateGroupInfo = useCallback(async (groupId: string, updatedGroup: any) => {
  try {
    const hasToken = await checkToken();
    if (!hasToken) return { success: false, message: 'Authentication required' };

    setGroupInfo((prev: any) => ({
      ...prev,
      ...updatedGroup,
      maxMembers: updatedGroup.maxMembers || prev?.maxMembers || 6, // ← This should work but might not be called
      avatarUrl: updatedGroup.avatarUrl ? ensureFullUrl(updatedGroup.avatarUrl) : prev?.avatarUrl
    }));
    return { success: true };
  } catch (err: any) {
    console.error('❌ Error updating group info:', err);
    return { success: false, message: err.message };
  }
}, [ensureFullUrl, checkToken]);
  // Transfer ownership
  const transferOwnership = useCallback(async (groupId: string, newAdminId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.transferOwnership(groupId, newAdminId);
      
      if (result.success) {
        setMembers((prevMembers: any[]) => 
          prevMembers.map(member => {
            if (member.userId === newAdminId) {
              return { ...member, role: 'ADMIN' };
            }
            const currentUserId = groupInfo?.userId || members.find(m => m.role === 'ADMIN')?.userId;
            if (member.userId === currentUserId) {
              return { ...member, role: 'MEMBER' };
            }
            return member;
          })
        );
        
        if (groupInfo) {
          setGroupInfo((prev: any) => ({
            ...prev,
            userRole: prev.userId === newAdminId ? 'ADMIN' : 'MEMBER'
          }));
        }
      }
      
      return result;
    } catch (err: any) {
      console.error('❌ Error transferring ownership:', err);
      return { success: false, message: err.message };
    }
  }, [groupInfo, members, checkToken]);

  // Regenerate invite code
  const regenerateInviteCode = useCallback(async (groupId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.regenerateInviteCode(groupId);
      
      if (result.success) {
        setGroupInfo((prev: any) => ({
          ...prev,
          inviteCode: result.inviteCode
        }));
      }
      
      return result;
    } catch (err: any) {
      console.error('❌ Error regenerating invite code:', err);
      return { success: false, message: err.message };
    }
  }, [checkToken]);

  // Delete group
  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.deleteGroup(groupId);
      return result;
    } catch (err: any) {
      console.error('❌ Error deleting group:', err);
      return { success: false, message: err.message };
    }
  }, [checkToken]);

  // Get group settings
  const getGroupSettings = useCallback(async (groupId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.getGroupSettings(groupId);
      return result;
    } catch (err: any) {
      console.error('❌ Error getting group settings:', err);
      return { success: false, message: err.message };
    }
  }, [checkToken]);

  // Update member role with automatic state update
  const updateMemberRole = useCallback(async (groupId: string, memberId: string, newRole: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

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
      console.error('❌ Error updating member role:', err);
      return { success: false, message: err.message };
    }
  }, [checkToken]);

  // Remove member with automatic state update
  const removeMember = useCallback(async (groupId: string, memberId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.removeMember(groupId, memberId);
      
      if (result.success) {
        setMembers((prevMembers: any[]) =>
          prevMembers.filter(member => member.id !== memberId)
        );
      }
      
      return result;
    } catch (err: any) {
      console.error('❌ Error removing member:', err);
      return { success: false, message: err.message };
    }
  }, [checkToken]);

  return {
    // State
    loading,
    refreshing,
    error,
    members,
    groupInfo,
    authError,
    
    // Core methods
    fetchGroupMembers,
    updateGroupAvatar,
    removeGroupAvatar,
    setMembers,
    setGroupInfo,
    setError,
    
    // Additional methods
    updateGroupInfo,
    updateMaxMembers, // ← NEW
    transferOwnership,
    regenerateInviteCode,
    deleteGroup,
    getGroupSettings,
    updateMemberRole,
    removeMember
  };
}