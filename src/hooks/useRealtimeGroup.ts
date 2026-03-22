// hooks/useRealtimeGroup.ts - FIXED to allow empty groupId
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { TokenUtils } from '../utils/tokenUtils';

interface RealtimeGroupState {
  memberJoined: any | null;
  memberLeft: any | null;
  memberRoleChanged: any | null;
  groupUpdated: any | null;
  rotationCompleted: any | null;
  groupCreated: any | null;
}

export function useRealtimeGroup(groupId?: string) {  // 👈 Make groupId optional
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [events, setEvents] = useState<RealtimeGroupState>({
    memberJoined: null,
    memberLeft: null,
    memberRoleChanged: null,
    groupUpdated: null,
    rotationCompleted: null,
    groupCreated: null
  });
  
  const { on, off, isConnected } = useSocket();
  const mountedRef = useRef(true);

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
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

  const clearGroupCreated = useCallback(() => {
    setEvents(prev => ({ ...prev, groupCreated: null }));
  }, []);

  const clearAll = useCallback(() => {
    setEvents({
      memberJoined: null,
      memberLeft: null,
      memberRoleChanged: null,
      groupUpdated: null,
      rotationCompleted: null,
      groupCreated: null
    });
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    const setupListeners = async () => {
      const hasToken = await checkToken();
      // 👈 FIX: Don't block if groupId is empty (for global events)
      if (!hasToken || !isConnected) return;
      
      // Also need groupId for group-specific listeners
      const hasGroupId = groupId && groupId.trim() !== '';

      setLoading(true);
      setError(null);

      try {
        console.log(`🎧 Setting up real-time group listeners${hasGroupId ? ` for group: ${groupId}` : ' (global)'}`);

        // 👇 ALWAYS listen for group created (global event)
        on('group:created', (data: any) => {
          if (mounted) {
            console.log('📢 Real-time: Group created', data);
            setEvents(prev => ({ ...prev, groupCreated: data }));
          }
        });

        // Only listen for group-specific events if we have a groupId
        if (hasGroupId) {
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
    };
  }, [groupId, isConnected, checkToken, on, off]);

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
    clearAll
  };
}