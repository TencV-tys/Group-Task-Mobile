// src/hooks/useGroupMembers.ts
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

  return {
    loading,
    refreshing,
    error,
    members,
    groupInfo,
    fetchGroupMembers,
    updateGroupAvatar,
    removeGroupAvatar,
    setMembers,
    setGroupInfo,
    setError
  };
}