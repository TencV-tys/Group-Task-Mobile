import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import * as SecureStore from 'expo-secure-store';

interface RealtimeTaskState {
  taskCreated: any | null;
  taskUpdated: any | null;
  taskDeleted: { taskId: string; taskTitle: string } | null;
  taskAssigned: any | null;
  // ===== ADD THIS =====
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
    // ===== ADD THIS =====
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

  // ===== ADD THIS =====
  const clearRotationCompleted = useCallback(() => {
    setEvents(prev => ({ ...prev, rotationCompleted: null }));
  }, []);

  const clearAll = useCallback(() => {
    setEvents({
      taskCreated: null,
      taskUpdated: null,
      taskDeleted: null,
      taskAssigned: null,
      rotationCompleted: null // ← ADD THIS
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

        // ===== ADD THIS =====
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
      // Clean up listeners
      off('task:created');
      off('task:updated');
      off('task:deleted');
      off('task:assigned');
      off('rotation:completed'); // ← ADD THIS
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
    clearTaskCreated,
    clearTaskUpdated,
    clearTaskDeleted,
    clearTaskAssigned,
    clearRotationCompleted, // ← ADD THIS
    clearAll
  };
} 