// hooks/useRealtimeTasks.ts - UPDATED with TokenUtils
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

interface RealtimeTaskState {
  taskCreated: any | null;
  taskUpdated: any | null;
  taskDeleted: { taskId: string; taskTitle: string } | null;
  taskAssigned: any | null;
  rotationCompleted: {
    groupId: string;
    newWeek: number;
    rotatedTasks: any[];
    weekStart: Date;
    weekEnd: Date;
  } | null;
}

export function useRealtimeTasks(groupId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [events, setEvents] = useState<RealtimeTaskState>({
    taskCreated: null,
    taskUpdated: null,
    taskDeleted: null,
    taskAssigned: null,
    rotationCompleted: null
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

  // Clear events
  const clearTaskCreated = useCallback(() => {
    setEvents(prev => ({ ...prev, taskCreated: null }));
  }, []);

  const clearTaskUpdated = useCallback(() => {
    setEvents(prev => ({ ...prev, taskUpdated: null }));
  }, []);

  const clearTaskDeleted = useCallback(() => {
    setEvents(prev => ({ ...prev, taskDeleted: null }));
  }, []);

  const clearTaskAssigned = useCallback(() => {
    setEvents(prev => ({ ...prev, taskAssigned: null }));
  }, []);

  const clearRotationCompleted = useCallback(() => {
    setEvents(prev => ({ ...prev, rotationCompleted: null }));
  }, []);

  const clearAll = useCallback(() => {
    setEvents({
      taskCreated: null,
      taskUpdated: null,
      taskDeleted: null,
      taskAssigned: null,
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
        console.log(`🎧 Setting up real-time task listeners for group: ${groupId}`);

        // Task created
        on('task:created', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Task created', data);
            setEvents(prev => ({ ...prev, taskCreated: data.task }));
          }
        });

        // Task updated
        on('task:updated', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Task updated', data);
            setEvents(prev => ({ ...prev, taskUpdated: data.task }));
          }
        });

        // Task deleted
        on('task:deleted', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Task deleted', data);
            setEvents(prev => ({ 
              ...prev, 
              taskDeleted: { taskId: data.taskId, taskTitle: data.taskTitle }
            }));
          }
        });

        // Task assigned
        on('task:assigned', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('📢 Real-time: Task assigned', data);
            setEvents(prev => ({ ...prev, taskAssigned: data }));
          }
        });

        // Rotation completed
        on('rotation:completed', (data: any) => {
          if (data.groupId === groupId && mounted) {
            console.log('🔄 Real-time: Rotation completed', data);
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
      off('task:created');
      off('task:updated');
      off('task:deleted');
      off('task:assigned');
      off('rotation:completed');
    };
  }, [groupId, isConnected, checkToken, on, off]);

  return {
    // State
    loading,
    error,
    authError,
    isConnected,
    events,
    
    // Clear functions
    clearTaskCreated,
    clearTaskUpdated,
    clearTaskDeleted,
    clearTaskAssigned,
    clearRotationCompleted,
    clearAll
  };
}