// hooks/useRealtimeSwapRequests.ts - UPDATED with admin approval events

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { TokenUtils } from '../utils/tokenUtils';

interface RealtimeSwapState {
  swapRequested: any | null;
  swapCreated: any | null;
  swapResponded: any | null;
  swapAccepted: any | null;
  swapRejected: any | null;
  swapCancelled: any | null;
  swapExpired: any | null;
  // ✅ NEW: Admin approval events
  swapPendingApproval: any | null;
  swapAdminAction: any | null;
  swapReadyForAcceptance: any | null;
}

export function useRealtimeSwapRequests(groupId: string, userId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [events, setEvents] = useState<RealtimeSwapState>({
    swapRequested: null,
    swapCreated: null,
    swapResponded: null,
    swapAccepted: null,
    swapRejected: null,
    swapCancelled: null,
    swapExpired: null,
    swapPendingApproval: null,
    swapAdminAction: null,
    swapReadyForAcceptance: null
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
  const clearSwapRequested = useCallback(() => {
    setEvents(prev => ({ ...prev, swapRequested: null }));
  }, []);

  const clearSwapCreated = useCallback(() => {
    setEvents(prev => ({ ...prev, swapCreated: null }));
  }, []);

  const clearSwapResponded = useCallback(() => {
    setEvents(prev => ({ ...prev, swapResponded: null }));
  }, []);

  const clearSwapAccepted = useCallback(() => {
    setEvents(prev => ({ ...prev, swapAccepted: null }));
  }, []);

  const clearSwapRejected = useCallback(() => {
    setEvents(prev => ({ ...prev, swapRejected: null }));
  }, []);

  const clearSwapCancelled = useCallback(() => {
    setEvents(prev => ({ ...prev, swapCancelled: null }));
  }, []);

  const clearSwapExpired = useCallback(() => {
    setEvents(prev => ({ ...prev, swapExpired: null }));
  }, []);

  // ✅ NEW: Clear admin approval events
  const clearSwapPendingApproval = useCallback(() => {
    setEvents(prev => ({ ...prev, swapPendingApproval: null }));
  }, []);

  const clearSwapAdminAction = useCallback(() => {
    setEvents(prev => ({ ...prev, swapAdminAction: null }));
  }, []);

  const clearSwapReadyForAcceptance = useCallback(() => {
    setEvents(prev => ({ ...prev, swapReadyForAcceptance: null }));
  }, []);

  const clearAll = useCallback(() => {
    setEvents({
      swapRequested: null,
      swapCreated: null,
      swapResponded: null,
      swapAccepted: null,
      swapRejected: null,
      swapCancelled: null,
      swapExpired: null,
      swapPendingApproval: null,
      swapAdminAction: null,
      swapReadyForAcceptance: null
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
        console.log(`🎧 Setting up real-time swap request listeners for group: ${groupId}`);

        // Swap requested (target user)
        on('swap:requested', (data: any) => {
          if ((data.toUserId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap requested', data);
            setEvents(prev => ({ ...prev, swapRequested: data }));
          }
        });

        // Swap created (group notification)
        on('swap:created', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Swap created', data);
            setEvents(prev => ({ ...prev, swapCreated: data }));
          }
        });

        // Swap responded
        on('swap:responded', (data: any) => {
          if ((data.fromUserId === userId || data.toUserId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap responded', data);
            setEvents(prev => ({ ...prev, swapResponded: data }));
          }
        });

        // Swap accepted
        on('swap:accepted', (data: any) => {
          if ((data.fromUserId === userId || data.toUserId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap accepted', data);
            setEvents(prev => ({ ...prev, swapAccepted: data }));
          }
        });

        // Swap rejected
        on('swap:rejected', (data: any) => {
          if ((data.fromUserId === userId || data.toUserId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap rejected', data);
            setEvents(prev => ({ ...prev, swapRejected: data }));
          }
        });

        // Swap cancelled
        on('swap:cancelled', (data: any) => {
          if ((data.fromUserId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap cancelled', data);
            setEvents(prev => ({ ...prev, swapCancelled: data }));
          }
        });

        // Swap expired
        on('swap:expired', (data: any) => {
          if ((data.fromUserId === userId || data.toUserId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap expired', data);
            setEvents(prev => ({ ...prev, swapExpired: data }));
          }
        });

        // ✅ NEW: Swap pending approval (for admins)
        on('swap:pending:approval', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Swap pending approval', data);
            setEvents(prev => ({ ...prev, swapPendingApproval: data }));
          }
        });

        // ✅ NEW: Swap admin action (approve/reject)
        on('swap:admin:action', (data: any) => {
          if ((data.requesterId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap admin action', data);
            setEvents(prev => ({ ...prev, swapAdminAction: data }));
          }
        });

        // ✅ NEW: Swap ready for acceptance
        on('swap:ready:accept', (data: any) => {
          if ((data.requesterId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Swap ready for acceptance', data);
            setEvents(prev => ({ ...prev, swapReadyForAcceptance: data }));
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
      off('swap:requested');
      off('swap:created');
      off('swap:responded');
      off('swap:accepted');
      off('swap:rejected');
      off('swap:cancelled');
      off('swap:expired');
      off('swap:pending:approval');
      off('swap:admin:action');
      off('swap:ready:accept');
    };
  }, [groupId, userId, isConnected, checkToken, on, off]);

  return {
    // State
    loading,
    error,
    authError,
    isConnected,
    events,
    
    // Clear functions
    clearSwapRequested,
    clearSwapCreated,
    clearSwapResponded,
    clearSwapAccepted,
    clearSwapRejected,
    clearSwapCancelled,
    clearSwapExpired,
    clearSwapPendingApproval,
    clearSwapAdminAction,
    clearSwapReadyForAcceptance,
    clearAll
  };
}