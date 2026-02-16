import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { NotificationService, Notification } from '../services/NotificationService';

export const useNotifications = () => {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Load notifications
  const loadNotifications = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const result = await NotificationService.getNotifications(page, pagination.limit);

      if (result.success) {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  // Load unread count only
  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await NotificationService.getUnreadCount();
      if (result.success) {
        setUnreadCount(result.unreadCount);
      }
    } catch (error) {
      console.error('Load unread count error:', error);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await NotificationService.markAsRead(notificationId);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Mark as read error:', error);
      return false;
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await NotificationService.markAllAsRead();
      
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        Alert.alert('Success', 'All notifications marked as read');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Mark all as read error:', error);
      return false;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const result = await NotificationService.deleteNotification(notificationId);
      
      if (result.success) {
        // Remove from list
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update unread count if it was unread
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete notification error:', error);
      return false;
    }
  }, [notifications]);

  // Confirm delete
  const confirmDelete = useCallback((notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(notificationId)
        }
      ]
    );
  }, [deleteNotification]);

  // Refresh data
  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      loadNotifications(1),
      loadUnreadCount()
    ]);
  }, [loadNotifications, loadUnreadCount]);

  // Load initial data
  useEffect(() => {
    refreshNotifications();
  }, []);

  return {
    // State
    loading,
    notifications,
    unreadCount,
    pagination,

    // Functions
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification: confirmDelete,
    refreshNotifications
  };
};