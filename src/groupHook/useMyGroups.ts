// src/hooks/useMyGroups.ts - UPDATED WITH TOKEN CHECK
import { useState, useCallback, useEffect } from 'react';
import { GroupService } from '../services/GroupService';
import { GroupMembersService } from '../services/GroupMemberService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useMyGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('useMyGroups: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('useMyGroups: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  // Fetch groups from API
  const fetchGroups = useCallback(async (isRefreshing = false) => {
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
    
    try {
      console.log("useMyGroups: Fetching groups...");
      const result = await GroupService.getUserGroups();
      
      console.log("useMyGroups: Fetch result:", result);
      
      if (result.success) {
        // Handle different response structures
        let groupsArray: any[] = [];
        
        if (result.groups) {
          groupsArray = result.groups;
        } else if (result.group) {
          // If single group returned, wrap in array
          groupsArray = [result.group];
        } else if (Array.isArray(result)) {
          // If result is directly an array
          groupsArray = result;
        }
        
        // Ensure each group has avatarUrl property
        const groupsWithAvatars = groupsArray.map(group => ({
          ...group,
          avatarUrl: group.avatarUrl || group.avatar || null
        }));
        
        setGroups(groupsWithAvatars);
        setAuthError(false);
      } else {
        setError(result.message || 'Failed to load groups');
        setGroups([]);
        
        // Check if error is auth-related
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
      }
      
    } catch (err: any) {
      console.error("useMyGroups: Error:", err);
      setError(err.message || 'Network error');
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkToken]);

  // Refresh groups (pull to refresh)
  const refreshGroups = () => {
    fetchGroups(true);
  };

  // Add a new group (after creation)
  const addGroup = (newGroup: any) => {
    setGroups(prev => {
      // Check if group already exists
      const exists = prev.some(group => group.id === newGroup.id);
      if (exists) {
        // Update existing group
        return prev.map(group => 
          group.id === newGroup.id ? {
            ...newGroup,
            avatarUrl: newGroup.avatarUrl || newGroup.avatar || group.avatarUrl
          } : group
        );
      }
      // Add new group at the beginning
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
      console.error("useMyGroups: Error updating group avatar:", error);
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
      console.error("useMyGroups: Error updating group:", error);
      return { 
        success: false, 
        message: error.message || 'Failed to update group' 
      };
    }
  }, [checkToken]);

  // Upload group avatar (with base64)
  const uploadGroupAvatar = useCallback(async (groupId: string, base64Image: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return { success: false, message: 'Authentication required' };

      const result = await GroupMembersService.uploadGroupAvatar(groupId, base64Image);
      
      if (result.success && result.group) {
        // Update the group in local state
        setGroups(prev => prev.map(group => 
          group.id === groupId ? { 
            ...group, 
            avatarUrl: result.group.avatarUrl || result.group.avatar 
          } : group
        ));
      }
      
      return result;
    } catch (error: any) {
      console.error("useMyGroups: Error uploading group avatar:", error);
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
        // Update the group in local state
        setGroups(prev => prev.map(group => 
          group.id === groupId ? { ...group, avatarUrl: null } : group
        ));
      }
      
      return result;
    } catch (error: any) {
      console.error("useMyGroups: Error deleting group avatar:", error);
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
    updateGroupAvatar,  // For direct URL updates
    updateGroup,        // For updating group info
    uploadGroupAvatar,  // For uploading base64 images
    deleteGroupAvatar,  // For removing avatar
    getGroupById,       // Get specific group
    searchGroups        // Search groups
  };
}