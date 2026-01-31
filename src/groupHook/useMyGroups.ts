// src/hooks/useMyGroups.ts
import { useState, useCallback } from 'react';
import { GroupService } from '../groupServices/GroupService';

export function useMyGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups from API
  const fetchGroups = useCallback(async (isRefreshing = false) => {
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
        if (result.groups) {
          setGroups(result.groups);
        } else if (result.group) {
          // If single group returned, wrap in array
          setGroups([result.group]);
        } else {
          // If no groups property, use empty array
          setGroups([]);
        }
      } else {
        setError(result.message || 'Failed to load groups');
        setGroups([]);
      }
      
    } catch (err: any) {
      console.error("useMyGroups: Error:", err);
      setError(err.message || 'Network error');
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
          group.id === newGroup.id ? newGroup : group
        );
      }
      // Add new group at the beginning
      return [newGroup, ...prev];
    });
  };

  // Remove a group
  const removeGroup = (groupId: string) => {
    setGroups(prev => prev.filter(group => group.id !== groupId));
  };

  return {
    groups,
    loading,
    refreshing,
    error,
    fetchGroups,
    refreshGroups,
    addGroup,
    removeGroup
  };
}