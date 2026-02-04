// src/hooks/useGroupMembers.ts
import { useState, useCallback } from 'react';
import { GroupMembersService } from '../groupMemberServices/GroupMemberService';

export function useGroupMembers() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);

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
          role: member.groupRole || member.role || 'MEMBER'
        }));
        setMembers(formattedMembers);
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
      console.error('Error fetching group members:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  return {
    loading,
    refreshing,
    error,
    members,
    groupInfo,
    fetchGroupMembers,
    setMembers,
    setGroupInfo, // Add this setter
    setError
  };
}