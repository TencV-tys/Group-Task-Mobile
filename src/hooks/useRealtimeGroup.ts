// hooks/useRealtimeGroup.ts - UPDATED with suspension/deletion events

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSocket } from '../context/SocketContext';
import { TokenUtils } from '../utils/tokenUtils';

interface RealtimeGroupState {
  memberJoined: any | null;
  memberLeft: any | null;
  memberRoleChanged: any | null;
  groupUpdated: any | null;
  rotationCompleted: any | null;
  groupCreated: any | null;
  // ✅ ADD THESE
  groupSuspended: any | null;
  groupRestored: any | null;
  groupDeleted: any | null;
}

export function useRealtimeGroup(groupId?: string, onGroupStatusChanged?: (status: string, data: any) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [events, setEvents] = useState<RealtimeGroupState>({
    memberJoined: null,
    memberLeft: null,
    memberRoleChanged: null,
    groupUpdated: null,
    rotationCompleted: null,
    groupCreated: null,
    groupSuspended: null,    // ✅ ADD
    groupRestored: null,     // ✅ ADD
    groupDeleted: null       // ✅ ADD
  });
  
  const { on, off, isConnected } = useSocket();
  const mountedRef = useRef(true);
  const navigation = useNavigation();

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // Clear functions for new events
  const clearMemberJoined = useCallback(() => {
    setEvents(prev => ({ ...prev, memberJoined: null }));
  }, []);

  const clearMemberLeft = useCallback(() => {
    setEvents(prev => ({ ...prev, memberLeft: null }));
  }, []);

  const clearMemberRoleChanged = useCallback(() => {
    setEvents(prev => ({ ...prev, memberRoleChanged: null }));
  }, []);

  const clearGroupUpdated = useCallback(() => {
    setEvents(prev => ({ ...prev, groupUpdated: null }));
  }, []);

  const clearRotationCompleted = useCallback(() => {
    setEvents(prev => ({ ...prev, rotationCompleted: null }));
  }, []);

  const clearGroupCreated = useCallback(() => {
    setEvents(prev => ({ ...prev, groupCreated: null }));
  }, []);

  // ✅ ADD clear functions for new events
  const clearGroupSuspended = useCallback(() => {
    setEvents(prev => ({ ...prev, groupSuspended: null }));
  }, []);

  const clearGroupRestored = useCallback(() => {
    setEvents(prev => ({ ...prev, groupRestored: null }));
  }, []);

  const clearGroupDeleted = useCallback(() => {
    setEvents(prev => ({ ...prev, groupDeleted: null }));
  }, []);

  const clearAll = useCallback(() => {
    setEvents({
      memberJoined: null,
      memberLeft: null,
      memberRoleChanged: null,
      groupUpdated: null,
      rotationCompleted: null,
      groupCreated: null,
      groupSuspended: null,
      groupRestored: null,
      groupDeleted: null
    });
  }, []);

  // ✅ Handle group status changes with alert
  const handleGroupSuspended = useCallback((data: any) => {
    console.log('🚨 [RealtimeGroup] Group suspended:', data);
    
    if (groupId && data.groupId === groupId) {
      Alert.alert(
        '⚠️ Group Suspended',
        data.message || `Group "${data.groupName}" has been suspended.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onGroupStatusChanged) {
                onGroupStatusChanged('SUSPENDED', data);
              }
              navigation.goBack();
            }
          }
        ]
      );
    }
  }, [groupId, navigation, onGroupStatusChanged]);

  const handleGroupRestored = useCallback((data: any) => {
    console.log('✅ [RealtimeGroup] Group restored:', data);
    
    if (groupId && data.groupId === groupId) {
      Alert.alert(
        data.wasSuspended ? '✅ Group Unsuspended' : '✅ Group Restored',
        data.message || `Group "${data.groupName}" is now active again.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onGroupStatusChanged) {
                onGroupStatusChanged('RESTORED', data);
              }
            }
          }
        ]
      );
    }
  }, [groupId, onGroupStatusChanged]);

 
  const handleGroupDeleted = useCallback((data: any) => {
  console.log('🗑️ [RealtimeGroup] Group deleted:', data);
  
  if (groupId && data.groupId === groupId) {
    Alert.alert(
      data.hardDelete ? '🗑️ Group Permanently Deleted' : '📋 Group Deleted',
      data.message || `Group "${data.groupName}" has been deleted.`,
      [
        {
          text: 'OK',
          onPress: () => {
            if (onGroupStatusChanged) {
              onGroupStatusChanged('DELETED', data);
            }
            // ✅ FIX: Use reset with proper typing
            navigation.reset({
              index: 0,
              routes: [{ name: 'MyGroups' } as never],
            });
          }
        }
      ]
    );
  }
}, [groupId, navigation, onGroupStatusChanged]);

  // Set up real-time listeners
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    const setupListeners = async () => {
      const hasToken = await checkToken();
      const hasGroupId = groupId && groupId.trim() !== '';
      
      if (!hasToken || !isConnected) return;

      setLoading(true);
      setError(null);

      try {
        console.log(`🎧 Setting up real-time group listeners${hasGroupId ? ` for group: ${groupId}` : ' (global)'}`);

        // Global events
        on('group:created', (data: any) => {
          if (mounted) {
            console.log('📢 Real-time: Group created', data);
            setEvents(prev => ({ ...prev, groupCreated: data }));
          }
        });

        // ✅ ADD group status event listeners (global - check groupId in handler)
        on('group_suspended', (data: any) => {
          if (mounted && (!groupId || data.groupId === groupId)) {
            setEvents(prev => ({ ...prev, groupSuspended: data }));
            handleGroupSuspended(data);
          }
        });

        on('group_restored', (data: any) => {
          if (mounted && (!groupId || data.groupId === groupId)) {
            setEvents(prev => ({ ...prev, groupRestored: data }));
            handleGroupRestored(data);
          }
        });

        on('group_deleted', (data: any) => {
          if (mounted && (!groupId || data.groupId === groupId)) {
            setEvents(prev => ({ ...prev, groupDeleted: data }));
            handleGroupDeleted(data);
          }
        });

        // Only listen for group-specific events if we have a groupId
        if (hasGroupId) {
          on('group:member-joined', (data: any) => {
            if (data.groupId === groupId && mounted) {
              console.log('📢 Real-time: Member joined', data);
              setEvents(prev => ({ ...prev, memberJoined: data }));
            }
          });

          on('group:member-left', (data: any) => {
            if (data.groupId === groupId && mounted) {
              console.log('📢 Real-time: Member left', data);
              setEvents(prev => ({ ...prev, memberLeft: data }));
            }
          });

          on('group:member-role-changed', (data: any) => {
            if (data.groupId === groupId && mounted) {
              console.log('📢 Real-time: Member role changed', data);
              setEvents(prev => ({ ...prev, memberRoleChanged: data }));
            }
          });

          on('group:updated', (data: any) => {
            if (data.groupId === groupId && mounted) {
              console.log('📢 Real-time: Group updated', data);
              setEvents(prev => ({ ...prev, groupUpdated: data }));
            }
          });

          on('rotation:completed', (data: any) => {
            if (data.groupId === groupId && mounted) {
              console.log('📢 Real-time: Rotation completed', data);
              setEvents(prev => ({ ...prev, rotationCompleted: data }));
            }
          });
        }

      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to setup real-time listeners');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    setupListeners();

    return () => {
      mounted = false;
      mountedRef.current = false;
      // Clean up all listeners
      off('group:created');
      off('group:member-joined');
      off('group:member-left');
      off('group:member-role-changed');
      off('group:updated');
      off('rotation:completed');
      off('group_suspended');   // ✅ ADD
      off('group_restored');    // ✅ ADD
      off('group_deleted');     // ✅ ADD
    };
  }, [groupId, isConnected, checkToken, on, off, handleGroupSuspended, handleGroupRestored, handleGroupDeleted]);

  return {
    loading,
    error,
    authError,
    isConnected,
    events,
    clearMemberJoined,
    clearMemberLeft,
    clearMemberRoleChanged,
    clearGroupUpdated,
    clearRotationCompleted,
    clearGroupCreated,
    clearGroupSuspended,    // ✅ ADD
    clearGroupRestored,     // ✅ ADD
    clearGroupDeleted,      // ✅ ADD
    clearAll
  };
}