import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import * as SecureStore from 'expo-secure-store';

interface RealtimeGroupState {
  memberJoined: any | null;
  memberLeft: any | null;
  memberRoleChanged: any | null;
  groupUpdated: any | null;
  rotationCompleted: any | null;
}

export function useRealtimeGroup(groupId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [events, setEvents] = useState<RealtimeGroupState>({
    memberJoined: null,
    memberLeft: null,
    memberRoleChanged: null,
    groupUpdated: null,
    rotationCompleted: null
  });
  
  const { on, off, isConnected } = useSocket();
  const mountedRef = useRef(true);

  // Check token
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        setAuthError(true);
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      setAuthError(true);
      return false;
    }
  }, []);

  // Clear functions
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

  const clearAll = useCallback(() => {
    setEvents({
      memberJoined: null,
      memberLeft: null,
      memberRoleChanged: null,
      groupUpdated: null,
      rotationCompleted: null
    });
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    const setupListeners = async () => {
      const hasToken = await checkToken();
      if (!hasToken || !groupId || !isConnected) return;

      setLoading(true);
      setError(null);

      try {
        console.log(`🎧 Setting up real-time group listeners for group: ${groupId}`);

        // Member joined
        on('group:member-joined', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Member joined', data);
            setEvents(prev => ({ ...prev, memberJoined: data }));
          }
        });

        // Member left
        on('group:member-left', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Member left', data);
            setEvents(prev => ({ ...prev, memberLeft: data }));
          }
        });

        // Member role changed
        on('group:member-role-changed', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Member role changed', data);
            setEvents(prev => ({ ...prev, memberRoleChanged: data }));
          }
        });

        // Group updated
        on('group:updated', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Group updated', data);
            setEvents(prev => ({ ...prev, groupUpdated: data }));
          }
        });

        // Rotation completed
        on('rotation:completed', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Rotation completed', data);
            setEvents(prev => ({ ...prev, rotationCompleted: data }));
          }
        });

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
      off('group:member-joined');
      off('group:member-left');
      off('group:member-role-changed');
      off('group:updated');
      off('rotation:completed');
    };
  }, [groupId, isConnected]);

  return {
    // State
    loading,
    error,
    authError,
    isConnected,
    events,
    
    // Clear functions
    clearMemberJoined,
    clearMemberLeft,
    clearMemberRoleChanged,
    clearGroupUpdated,
    clearRotationCompleted,
    clearAll
  };
}