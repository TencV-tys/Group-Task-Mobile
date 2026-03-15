// hooks/useRealtimeNotifications.ts - UPDATED with TokenUtils
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Alert } from 'react-native';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

interface RealtimeNotificationState {
  newNotification: any | null;
}

interface UseRealtimeNotificationsProps {
  onNewNotification?: (data: any) => void;
  showAlerts?: boolean;
  alertTypes?: string[]; // Array of notification types to show alerts for
}

export function useRealtimeNotifications(props?: UseRealtimeNotificationsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [events, setEvents] = useState<RealtimeNotificationState>({
    newNotification: null
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

  // Clear notification
  const clearNewNotification = useCallback(() => {
    setEvents(prev => ({ ...prev, newNotification: null }));
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    const setupListeners = async () => {
      const hasToken = await checkToken();
      if (!hasToken || !isConnected) return;

      setLoading(true);
      setError(null);

      try {
        console.log('🎧 Setting up real-time notification listener');

        // New notification
        on('notification:new', (data: any) => {
          if (!mounted) return;
          
          console.log('📢 Real-time: New notification', data);
          
          // Get notification data
          const notification = data.notification || data;
          
          setEvents(prev => ({ ...prev, newNotification: notification }));
          
          // Call custom handler if provided
          if (props?.onNewNotification) {
            props.onNewNotification(notification);
          }
          
          // Show alert if enabled and not excluded
          if (props?.showAlerts !== false) {
            // Check if this notification type should show alert
            const shouldShowAlert = !props?.alertTypes || 
              props.alertTypes.includes(notification.type);
            
            if (shouldShowAlert) {
              Alert.alert(
                notification.title || 'New Notification',
                notification.message,
                [{ text: 'OK' }]
              );
            }
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
      off('notification:new');
    };
  }, [isConnected, props?.onNewNotification, props?.showAlerts, props?.alertTypes, checkToken, on, off]);

  return {
    // State
    loading,
    error,
    authError,
    isConnected,
    events,
    
    // Clear functions
    clearNewNotification
  };
}