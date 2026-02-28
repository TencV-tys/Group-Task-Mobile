import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import * as SecureStore from 'expo-secure-store';

interface RealtimeSwapState {
  swapRequested: any | null;
  swapCreated: any | null;
  swapResponded: any | null;
  swapAccepted: any | null;
  swapRejected: any | null;
  swapCancelled: any | null;
  swapExpired: any | null;
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
    swapExpired: null
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

  const clearAll = useCallback(() => {
    setEvents({
      swapRequested: null,
      swapCreated: null,
      swapResponded: null,
      swapAccepted: null,
      swapRejected: null,
      swapCancelled: null,
      swapExpired: null
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
    };
  }, [groupId, userId, isConnected]);

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
    clearAll
  };
}