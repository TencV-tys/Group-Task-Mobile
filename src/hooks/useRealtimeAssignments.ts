// hooks/useRealtimeAssignments.ts - UPDATED with TokenUtils
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

interface RealtimeAssignmentState {
  assignmentCreated: any | null;
  assignmentCompleted: any | null;
  assignmentPendingVerification: any | null;
  assignmentVerified: any | null;
  assignmentRejected: any | null;
}

export function useRealtimeAssignments(groupId: string, userId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [events, setEvents] = useState<RealtimeAssignmentState>({
    assignmentCreated: null,
    assignmentCompleted: null,
    assignmentPendingVerification: null,
    assignmentVerified: null,
    assignmentRejected: null
  });
  
  const { on, off, isConnected } = useSocket();
  const mountedRef = useRef(true);

  // ✅ UPDATED: Use TokenUtils.checkToken()
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // Clear functions
  const clearAssignmentCreated = useCallback(() => {
    setEvents(prev => ({ ...prev, assignmentCreated: null }));
  }, []);

  const clearAssignmentCompleted = useCallback(() => {
    setEvents(prev => ({ ...prev, assignmentCompleted: null }));
  }, []);

  const clearAssignmentPendingVerification = useCallback(() => {
    setEvents(prev => ({ ...prev, assignmentPendingVerification: null }));
  }, []);

  const clearAssignmentVerified = useCallback(() => {
    setEvents(prev => ({ ...prev, assignmentVerified: null }));
  }, []);

  const clearAssignmentRejected = useCallback(() => {
    setEvents(prev => ({ ...prev, assignmentRejected: null }));
  }, []);

  const clearAll = useCallback(() => {
    setEvents({
      assignmentCreated: null,
      assignmentCompleted: null,
      assignmentPendingVerification: null,
      assignmentVerified: null,
      assignmentRejected: null
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
        console.log(`🎧 Setting up real-time assignment listeners for group: ${groupId}`);

        // Assignment created
        on('assignment:created', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Assignment created', data);
            setEvents(prev => ({ ...prev, assignmentCreated: data }));
          }
        });

        // Assignment completed
        on('assignment:completed', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Assignment completed', data);
            setEvents(prev => ({ ...prev, assignmentCompleted: data }));
          }
        });

        // Assignment pending verification
        on('assignment:pending-verification', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Assignment pending verification', data);
            setEvents(prev => ({ ...prev, assignmentPendingVerification: data }));
          }
        });

        // Assignment verified (for user or group)
        on('assignment:verified', (data: any) => {
          if ((data.userId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Assignment verified', data);
            setEvents(prev => ({ ...prev, assignmentVerified: data }));
          }
        });

        // Assignment rejected
        on('assignment:rejected', (data: any) => {
          if ((data.userId === userId || data.groupId === groupId) && mounted) {
            console.log('📢 Real-time: Assignment rejected', data);
            setEvents(prev => ({ ...prev, assignmentRejected: data }));
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
      off('assignment:created');
      off('assignment:completed');
      off('assignment:pending-verification');
      off('assignment:verified');
      off('assignment:rejected');
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
    clearAssignmentCreated,
    clearAssignmentCompleted,
    clearAssignmentPendingVerification,
    clearAssignmentVerified,
    clearAssignmentRejected,
    clearAll
  };
}