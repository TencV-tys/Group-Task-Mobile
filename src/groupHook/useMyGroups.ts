// src/hooks/useMyGroups.ts - UPDATED with socket listener for group creation

import { useState, useCallback, useEffect } from 'react';
import { GroupService } from '../services/GroupService';
import { GroupMembersService } from '../services/GroupMemberService';
import { TokenUtils } from '../utils/tokenUtils';
import { useSocket } from '../context/SocketContext'; // ✅ Add this import
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useMyGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  // ✅ Get socket connection
  const { socket, isConnected, on, off } = useSocket();

  // Check token
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => {
        setAuthError(true);
        setError('Please log in again');
      }
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // Fetch groups from API
  const fetchGroups = useCallback(async (isRefreshing = false) => {
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
    
    try {
      console.log("📥 useMyGroups: Fetching groups...");
      const result = await GroupService.getUserGroups();
      
      console.log("📦 useMyGroups: Fetch result:", result);
      
      if (result.success) {
        let groupsArray: any[] = [];
        
        if (result.groups) {
          groupsArray = result.groups;
        } else if (result.group) {
          groupsArray = [result.group];
        } else if (Array.isArray(result)) {
          groupsArray = result;
        }
        
        const groupsWithAvatars = groupsArray.map(group => ({
          ...group,
          avatarUrl: group.avatarUrl || group.avatar || null
        }));
        
        setGroups(groupsWithAvatars);
        setAuthError(false);
        console.log(`✅ useMyGroups: Loaded ${groupsWithAvatars.length} groups`);
      } else {
        setError(result.message || 'Failed to load groups');
        setGroups([]);
        
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
      }
      
    } catch (err: any) {
      console.error("❌ useMyGroups: Error:", err);
      setError(err.message || 'Network error');
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkToken]);

  // Refresh groups
  const refreshGroups = () => {
    fetchGroups(true);
  };

  // Add a new group
  const addGroup = (newGroup: any) => {
    setGroups(prev => {
      const exists = prev.some(group => group.id === newGroup.id);
      if (exists) {
        return prev.map(group => 
          group.id === newGroup.id ? {
            ...newGroup,
            avatarUrl: newGroup.avatarUrl || newGroup.avatar || group.avatarUrl
          } : group
        );
      }
      return [{
        ...newGroup,
        avatarUrl: newGroup.avatarUrl || newGroup.avatar || null
      }, ...prev];
    });
  };

  // Remove a group
  const removeGroup = (groupId: string) => {
    setGroups(prev => prev.filter(group => group.id !== groupId));
  };

  // Update group avatar
  const updateGroupAvatar = useCallback(async (groupId: string, avatarUrl: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      setGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, avatarUrl } : group
      ));
      return { success: true };
    } catch (error: any) {
      console.error("❌ useMyGroups: Error updating group avatar:", error);
      return { 
        success: false, 
        message: error.message || 'Failed to update group avatar' 
      };
    }
  }, [checkToken]);

  // Update group information
  const updateGroup = useCallback(async (groupId: string, groupData: { 
    name?: string, 
    description?: string,
    avatarUrl?: string 
  }) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      setGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, ...groupData } : group
      ));
      return { success: true };
    } catch (error: any) {
      console.error("❌ useMyGroups: Error updating group:", error);
      return { 
        success: false, 
        message: error.message || 'Failed to update group' 
      };
    }
  }, [checkToken]);

  // Upload group avatar
  const uploadGroupAvatar = useCallback(async (groupId: string, base64Image: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.uploadGroupAvatar(groupId, base64Image);
      
      if (result.success && result.group) {
        setGroups(prev => prev.map(group => 
          group.id === groupId ? { 
            ...group, 
            avatarUrl: result.group.avatarUrl || result.group.avatar 
          } : group
        ));
      }
      
      return result;
    } catch (error: any) {
      console.error("❌ useMyGroups: Error uploading group avatar:", error);
      return { 
        success: false, 
        message: error.message || 'Failed to upload group avatar' 
      };
    }
  }, [checkToken]);

  // Delete group avatar
  const deleteGroupAvatar = useCallback(async (groupId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.deleteGroupAvatar(groupId);
      
      if (result.success) {
        setGroups(prev => prev.map(group => 
          group.id === groupId ? { ...group, avatarUrl: null } : group
        ));
      }
      
      return result;
    } catch (error: any) {
      console.error("❌ useMyGroups: Error deleting group avatar:", error);
      return { 
        success: false, 
        message: error.message || 'Failed to delete group avatar' 
      };
    }
  }, [checkToken]);

  // Get a specific group by ID
  const getGroupById = useCallback((groupId: string) => {
    return groups.find(group => group.id === groupId) || null;
  }, [groups]);

  // Filter groups by search query
  const searchGroups = useCallback((query: string) => {
    return groups.filter(group => 
      group.name?.toLowerCase().includes(query.toLowerCase()) ||
      group.description?.toLowerCase().includes(query.toLowerCase())
    );
  }, [groups]);

  // ✅ Listen for real-time group creation (from other users)
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('⚠️ Socket not connected, skipping group creation listener');
      return;
    }

    console.log('🎧 Setting up group creation listener...');

    const handleGroupCreated = (data: any) => {
      console.log('📢 Real-time: New group created!', data);
      
      // Create a group object that matches our UI structure
      const newGroup = {
        id: data.groupId,
        name: data.groupName,
        description: '',
        avatarUrl: null,
        inviteCode: '',
        userRole: data.userRole || 'MEMBER',
        memberCount: 1,
        taskCount: 0,
        createdAt: data.createdAt || new Date().toISOString(),
        createdById: data.userId,
        createdByName: data.userName
      };
      
      // Add to groups list (only if not already present)
      setGroups(prev => {
        const exists = prev.some(g => g.id === data.groupId);
        if (!exists) {
          console.log(`✅ Adding new group to list: ${data.groupName}`);
          return [newGroup, ...prev];
        }
        return prev;
      });
      
      // Show alert for real-time update (optional - can be removed)
      // Alert.alert(
      //   '📢 New Group Created',
      //   `${data.userName} created a new group: "${data.groupName}"`,
      //   [{ text: 'OK' }]
      // );
    };

    // Register listener for group:created event
    on('group:created', handleGroupCreated);

    return () => {
      console.log('🔌 Cleaning up group creation listener');
      off('group:created', handleGroupCreated);
    };
  }, [socket, isConnected, on, off]);

  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);


  return {
    groups,
    loading,
    refreshing,
    error,
    authError,
    fetchGroups,
    refreshGroups,
    addGroup,
    removeGroup,
    updateGroupAvatar,
    updateGroup,
    uploadGroupAvatar,
    deleteGroupAvatar,
    getGroupById,
    searchGroups
  };
}