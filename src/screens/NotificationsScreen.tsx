// src/screens/NotificationsScreen.tsx - Dark Mode Added
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotifications } from '../notificationHook/useNotifications';
import { NotificationTypes } from '../services/NotificationService';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function NotificationsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  
  const {
    loading,
    notifications,
    unreadCount,
    pagination,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    loadNotifications
  } = useNotifications();

  const { events, clearNewNotification } = useRealtimeNotifications({
    onNewNotification: (notification) => {
      console.log('📢 NotificationsScreen: New notification received', notification);
      refreshNotifications();
    },
    showAlerts: false
  });

  useEffect(() => {
    if (events.newNotification) {
      clearNewNotification();
    }
  }, [events.newNotification]);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.pages && !loading) {
      loadNotifications(pagination.page + 1);
    }
  };

  // ✅ Comprehensive validation for notification content
  const isNotificationValid = (type: string, data: any): { valid: boolean; message?: string; type?: string } => {
    // ===== CHECK FOR DELETED TASKS =====
    if (data?.taskDeleted === true || data?.isTaskDeleted === true) {
      return { valid: false, message: 'The associated task has been deleted.', type: 'deleted' };
    }
    
    // ===== CHECK FOR DELETED ASSIGNMENTS =====
    if (data?.assignmentDeleted === true) {
      return { valid: false, message: 'The associated assignment has been deleted.', type: 'deleted' };
    }
    
    // ===== CHECK FOR DELETED SWAP REQUESTS =====
    if (type === NotificationTypes.SWAP_ADMIN_NOTIFICATION ||
        type === NotificationTypes.SWAP_REQUEST ||
        type === NotificationTypes.SWAP_ACCEPTED ||
        type === NotificationTypes.SWAP_REJECTED ||
        type === NotificationTypes.SWAP_CANCELLED ||
        type === NotificationTypes.SWAP_COMPLETED) {
      
      if (data?.swapRequestId && data?.isDeleted === true) {
        return { valid: false, message: 'This swap request has been deleted.', type: 'deleted' };
      }
    }
    
    // ===== CHECK FOR EXPIRED SWAP REQUESTS =====
    if (type === NotificationTypes.SWAP_EXPIRED) {
      return { valid: false, message: 'This swap request has expired.', type: 'expired' };
    }
    
    // ===== CHECK FOR ALREADY PROCESSED SWAPS =====
    if (type === NotificationTypes.SWAP_REQUEST) {
      if (data?.status === 'ACCEPTED') {
        return { valid: false, message: 'This swap request has already been accepted.', type: 'accepted' };
      }
      if (data?.status === 'REJECTED') {
        return { valid: false, message: 'This swap request has been rejected.', type: 'rejected' };
      }
      if (data?.status === 'CANCELLED') {
        return { valid: false, message: 'This swap request has been cancelled.', type: 'cancelled' };
      }
      if (data?.expired === true) {
        return { valid: false, message: 'This swap request has expired.', type: 'expired' };
      }
    }
    
    // ===== CHECK FOR DELETED TASKS IN SUBMISSIONS =====
    if (type === NotificationTypes.SUBMISSION_PENDING || 
        type === NotificationTypes.SUBMISSION_VERIFIED ||
        type === NotificationTypes.SUBMISSION_REJECTED) {
      
      if (data?.taskDeleted === true || data?.isTaskDeleted === true) {
        return { valid: false, message: 'The task for this submission has been deleted.', type: 'deleted' };
      }
      
      if (data?.taskId && data?.taskId === 'null') {
        return { valid: false, message: 'The associated task has been removed.', type: 'deleted' };
      }
    }
    
    // ===== CHECK FOR EXPIRED TASKS =====
    if (type === NotificationTypes.TASK_OVERDUE || type === NotificationTypes.TASK_REMINDER) {
      if (data?.expired === true) {
        return { valid: false, message: 'This task has expired.', type: 'expired' };
      }
    }
    
    return { valid: true };
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    const validation = isNotificationValid(notification.type, notification.data);
    
    if (!validation.valid) {
      Alert.alert(
        validation.type === 'deleted' ? '🗑️ Content Deleted' : '⏰ Content Unavailable',
        validation.message || 'This content is no longer available.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (notification.data) {
      handleNavigation(notification.type, notification.data);
    }
  };

  const handleNavigation = (type: string, data: any) => {
    console.log('Navigating with type:', type, 'data:', data);
    
    // ===== SWAP REQUEST NOTIFICATIONS =====
    if (type === NotificationTypes.SWAP_ADMIN_NOTIFICATION ||
        type === NotificationTypes.SWAP_REQUEST ||
        type === NotificationTypes.SWAP_ACCEPTED ||
        type === NotificationTypes.SWAP_REJECTED ||
        type === NotificationTypes.SWAP_CANCELLED ||
        type === NotificationTypes.SWAP_COMPLETED) {
      
      if (data?.swapRequestId) {
        navigation.navigate('SwapRequestDetails', { 
          requestId: data.swapRequestId,
          mayBeDeleted: true
        });
      } else if (data?.assignmentId && !data?.taskDeleted) {
        navigation.navigate('AssignmentDetails', { 
          assignmentId: data.assignmentId,
          isAdmin: type === NotificationTypes.SWAP_ADMIN_NOTIFICATION
        });
      } else if (data?.groupId) {
        navigation.navigate('MySwapRequests', { 
          groupId: data.groupId,
          groupName: data.groupName
        });
      } else {
        Alert.alert('Content Unavailable', 'This swap request is no longer available.');
      }
      return;
    }
    
    // ===== SUBMISSION PENDING (Admin Review) =====
    if (type === NotificationTypes.SUBMISSION_PENDING) {
      if (data?.assignmentId && !data?.taskDeleted) {
        navigation.navigate('AssignmentDetails', { 
          assignmentId: data.assignmentId,
          isAdmin: true 
        });
      } else if (data?.groupId) {
        navigation.navigate('PendingVerifications', { 
          groupId: data.groupId,
          groupName: data.groupName,
          userRole: 'ADMIN'
        });
      } else {
        Alert.alert('Submission Unavailable', 'This submission is no longer available for review.');
      }
      return;
    }
    
    // ===== SUBMISSION VERIFIED/REJECTED =====
    if (type === NotificationTypes.SUBMISSION_VERIFIED || type === NotificationTypes.SUBMISSION_REJECTED) {
      if (data?.assignmentId && !data?.taskDeleted) {
        navigation.navigate('AssignmentDetails', { 
          assignmentId: data.assignmentId,
          isAdmin: false 
        });
      } else if (data?.taskId && !data?.taskDeleted) {
        navigation.navigate('TaskDetails', { 
          taskId: data.taskId,
          groupId: data.groupId 
        });
      } else {
        Alert.alert('Submission Unavailable', 'This submission details are no longer available.');
      }
      return;
    }
    
    // ===== TASK REMINDERS =====
    if (type === NotificationTypes.TASK_REMINDER || type === NotificationTypes.TASK_ACTIVE) {
      if (data?.assignmentId && !data?.taskDeleted) {
        navigation.navigate('AssignmentDetails', { 
          assignmentId: data.assignmentId,
          isAdmin: false 
        });
      } else if (data?.taskId && !data?.taskDeleted) {
        navigation.navigate('TaskDetails', { 
          taskId: data.taskId,
          groupId: data.groupId 
        });
      } else if (data?.groupId) {
        navigation.navigate('TodayAssignments', { 
          groupId: data.groupId,
          groupName: data.groupName 
        });
      } else {
        Alert.alert('Task Unavailable', 'This task reminder is no longer available.');
      }
      return;
    }
    
    // ===== ROTATION NOTIFICATIONS =====
    if (type === 'ROTATION_COMPLETED') {
      if (data?.groupId) {
        navigation.navigate('RotationSchedule', { 
          groupId: data.groupId,
          groupName: data.groupName || 'Group',
          userRole: data.userRole || 'MEMBER'
        });
      } else {
        navigation.navigate('MyGroups');
      }
      return;
    }
    
    // ===== POINT DEDUCTION & NEGLECT =====
    if (type === NotificationTypes.POINT_DEDUCTION || type === NotificationTypes.LATE_SUBMISSION) {
      if (data?.assignmentId && !data?.taskDeleted) {
        navigation.navigate('AssignmentDetails', { 
          assignmentId: data.assignmentId,
          isAdmin: false 
        });
      } else if (data?.taskId && !data?.taskDeleted) {
        navigation.navigate('TaskDetails', { 
          taskId: data.taskId,
          groupId: data.groupId 
        });
      } else if (data?.groupId) {
        navigation.navigate('NeglectedTasks', { 
          groupId: data.groupId,
          groupName: data.groupName,
          userRole: 'MEMBER'
        });
      } else {
        Alert.alert('Content Unavailable', 'This notification is no longer available.');
      }
      return;
    }
    
    if (type === NotificationTypes.NEGLECT_DETECTED) {
      if (data?.assignmentId && !data?.taskDeleted) {
        navigation.navigate('AssignmentDetails', { 
          assignmentId: data.assignmentId,
          isAdmin: true 
        });
      } else if (data?.taskId && !data?.taskDeleted) {
        navigation.navigate('TaskDetails', { 
          taskId: data.taskId,
          groupId: data.groupId 
        });
      } else if (data?.groupId) {
        navigation.navigate('NeglectedTasks', { 
          groupId: data.groupId,
          groupName: data.groupName,
          userRole: 'ADMIN'
        });
      } else {
        Alert.alert('Content Unavailable', 'This neglect notification is no longer available.');
      }
      return;
    }
    
    // ===== TASK NOTIFICATIONS =====
    if (type === NotificationTypes.TASK_ASSIGNED ||
        type === NotificationTypes.TASK_COMPLETED ||
        type === NotificationTypes.TASK_OVERDUE ||
        type === NotificationTypes.TASK_CREATED) {
      if (data?.taskId && !data?.taskDeleted) {
        navigation.navigate('TaskDetails', { 
          taskId: data.taskId,
          groupId: data.groupId 
        });
      } else if (data?.groupId) {
        navigation.navigate('GroupTasks', { 
          groupId: data.groupId,
          groupName: data.groupName || 'Group',
          userRole: data.userRole || 'MEMBER'
        });
      } else {
        Alert.alert('Task Unavailable', 'This task notification is no longer available.');
      }
      return;
    }
    
    // ===== POINTS EARNED =====
    if (type === NotificationTypes.POINTS_EARNED) {
      if (data?.groupId) {
        navigation.navigate('FullLeaderboard', { 
          groupId: data.groupId,
          groupName: data.groupName 
        });
      } else {
        Alert.alert('Content Unavailable', 'Leaderboard data is not available.');
      }
      return;
    }
    
    // ===== DEFAULT FALLBACK =====
    console.log('Unhandled notification type:', type);
    if (data?.taskId && !data?.taskDeleted) {
      navigation.navigate('TaskDetails', { 
        taskId: data.taskId,
        groupId: data.groupId 
      });
    } else if (data?.groupId) {
      navigation.navigate('GroupTasks', { 
        groupId: data.groupId,
        groupName: data.groupName || 'Group',
        userRole: data.userRole || 'MEMBER'
      });
    } else {
      Alert.alert('Content Unavailable', 'This notification content is no longer available.');
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) {
      Alert.alert('Info', 'No unread notifications');
      return;
    }

    Alert.alert(
      'Mark All as Read',
      `Mark all ${unreadCount} notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All', onPress: markAllAsRead }
      ]
    );
  };

  const handleDelete = (notificationId: string) => {
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
  };

  const getNotificationIcon = (type: string, isValid: boolean): string => {
    if (!isValid) return 'alert-circle';
    
    const icons: Record<string, string> = {
      'ROTATION_COMPLETED': 'calendar-sync',
      [NotificationTypes.POINT_DEDUCTION]: 'star-remove',
      [NotificationTypes.LATE_SUBMISSION]: 'timer-alert',
      [NotificationTypes.NEGLECT_DETECTED]: 'alert-circle',
      [NotificationTypes.TASK_REMINDER]: 'clock-alert',
      [NotificationTypes.TASK_ACTIVE]: 'clock-check',
      [NotificationTypes.TASK_ASSIGNED]: 'clipboard-check',
      [NotificationTypes.TASK_COMPLETED]: 'check-circle',
      [NotificationTypes.TASK_OVERDUE]: 'alert',
      [NotificationTypes.TASK_CREATED]: 'plus-circle',
      [NotificationTypes.SUBMISSION_PENDING]: 'clock-check',
      [NotificationTypes.SUBMISSION_VERIFIED]: 'check-circle',
      [NotificationTypes.SUBMISSION_REJECTED]: 'close-circle',
      [NotificationTypes.SUBMISSION_DECISION]: 'message-check',
      [NotificationTypes.FEEDBACK_SUBMITTED]: 'message',
      [NotificationTypes.FEEDBACK_STATUS_UPDATE]: 'update',
      [NotificationTypes.GROUP_INVITE]: 'account-plus',
      [NotificationTypes.GROUP_JOINED]: 'account-group',
      [NotificationTypes.GROUP_CREATED]: 'home',
      [NotificationTypes.NEW_MEMBER]: 'account-plus',
      [NotificationTypes.SWAP_REQUEST]: 'swap-horizontal',
      [NotificationTypes.SWAP_ACCEPTED]: 'handshake',
      [NotificationTypes.SWAP_REJECTED]: 'close-circle',
      [NotificationTypes.SWAP_CANCELLED]: 'cancel',
      [NotificationTypes.SWAP_COMPLETED]: 'check-circle',
      [NotificationTypes.SWAP_ADMIN_NOTIFICATION]: 'shield-alert',
      [NotificationTypes.SWAP_EXPIRED]: 'timer-off',
      [NotificationTypes.POINTS_EARNED]: 'trophy',
      [NotificationTypes.MENTION]: 'at',
      [NotificationTypes.REMINDER]: 'bell',
    };
    return icons[type] || 'bell';
  };

  const getNotificationColor = (type: string, isValid: boolean): string => {
    if (!isValid) return theme.textMuted;
    
    const colors: Record<string, string> = {
      'ROTATION_COMPLETED': theme.primary,
      [NotificationTypes.POINT_DEDUCTION]: theme.error,
      [NotificationTypes.LATE_SUBMISSION]: theme.primary,
      [NotificationTypes.NEGLECT_DETECTED]: theme.error,
      [NotificationTypes.TASK_REMINDER]: theme.primary,
      [NotificationTypes.TASK_ACTIVE]: theme.primary,
      [NotificationTypes.TASK_ASSIGNED]: theme.primary,
      [NotificationTypes.TASK_COMPLETED]: theme.primary,
      [NotificationTypes.TASK_OVERDUE]: theme.error,
      [NotificationTypes.TASK_CREATED]: theme.textSecondary,
      [NotificationTypes.SUBMISSION_PENDING]: theme.primary,
      [NotificationTypes.SUBMISSION_VERIFIED]: theme.primary,
      [NotificationTypes.SUBMISSION_REJECTED]: theme.error,
      [NotificationTypes.SUBMISSION_DECISION]: theme.textSecondary,
      [NotificationTypes.FEEDBACK_SUBMITTED]: theme.primary,
      [NotificationTypes.FEEDBACK_STATUS_UPDATE]: theme.textSecondary,
      [NotificationTypes.GROUP_INVITE]: theme.primary,
      [NotificationTypes.GROUP_JOINED]: theme.primary,
      [NotificationTypes.GROUP_CREATED]: theme.textSecondary,
      [NotificationTypes.NEW_MEMBER]: theme.primary,
      [NotificationTypes.SWAP_REQUEST]: '#4F46E5',
      [NotificationTypes.SWAP_ACCEPTED]: theme.primary,
      [NotificationTypes.SWAP_REJECTED]: theme.error,
      [NotificationTypes.SWAP_CANCELLED]: theme.textMuted,
      [NotificationTypes.SWAP_COMPLETED]: theme.primary,
      [NotificationTypes.SWAP_ADMIN_NOTIFICATION]: theme.textSecondary,
      [NotificationTypes.SWAP_EXPIRED]: theme.textMuted,
      [NotificationTypes.POINTS_EARNED]: theme.primary,
      [NotificationTypes.MENTION]: theme.textSecondary,
      [NotificationTypes.REMINDER]: theme.primary,
    };
    return colors[type] || theme.textMuted;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ✅ Render notification with expired/deleted indicators
  const renderNotification = ({ item }: { item: any }) => {
    const validation = isNotificationValid(item.type, item.data);
    const isValid = validation.valid;
    const iconName = getNotificationIcon(item.type, isValid);
    const iconColor = getNotificationColor(item.type, isValid);
    const isExpiredOrDeleted = !isValid;
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.read && styles.unreadCard,
          isExpiredOrDeleted && styles.expiredCard,
          { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isExpiredOrDeleted ? [theme.textMuted, theme.textMuted] : [iconColor, iconColor + 'dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <MaterialCommunityIcons 
            name={iconName as any} 
            size={18} 
            color="#fff" 
          />
        </LinearGradient>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Text style={[styles.title, !item.read && styles.unreadTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
              {isExpiredOrDeleted && ' (Unavailable)'}
            </Text>
            <Text style={[styles.timeText, { color: theme.textMuted }]}>{formatTime(item.createdAt)}</Text>
          </View>
          
          <Text style={[styles.message, isExpiredOrDeleted && styles.expiredMessage, { color: theme.textMuted }]} numberOfLines={2}>
            {item.message}
            {isExpiredOrDeleted && ` ⚠️ ${validation.message || 'Content no longer available'}`}
          </Text>
          
          {/* Show badge for expired/deleted content */}
          {isExpiredOrDeleted && (
            <View style={[
              styles.statusBadge,
              validation.type === 'deleted' ? styles.deletedBadge : styles.expiredBadge
            ]}>
              <MaterialCommunityIcons 
                name={validation.type === 'deleted' ? "delete" : "timer-off"} 
                size={10} 
                color={validation.type === 'deleted' ? theme.error : theme.primary} 
              />
              <Text style={[
                styles.statusBadgeText,
                validation.type === 'deleted' ? styles.deletedBadgeText : styles.expiredBadgeText,
                { color: validation.type === 'deleted' ? theme.error : theme.primary }
              ]}>
                {validation.type === 'deleted' ? 'Deleted' : 'Expired'}
              </Text>
            </View>
          )}
          
          {/* Preview Info - only if not expired/deleted */}
          {!isExpiredOrDeleted && (
            <>
              {item.type === 'ROTATION_COMPLETED' && item.data?.newWeek && (
                <View style={styles.previewInfo}>
                  <MaterialCommunityIcons name="calendar-sync" size={12} color={theme.primary} />
                  <Text style={[styles.previewText, { color: theme.textSecondary }]}>
                    Week {item.data.newWeek} • {item.data.taskCount || 0} new tasks
                  </Text>
                </View>
              )}
              
              {item.type === NotificationTypes.POINT_DEDUCTION && item.data?.points && (
                <View style={styles.previewInfo}>
                  <MaterialCommunityIcons name="star-remove" size={12} color={theme.error} />
                  <Text style={[styles.previewText, { color: theme.textSecondary }]}>Lost {Math.abs(item.data.points)} points</Text>
                </View>
              )}
              
              {item.type === NotificationTypes.LATE_SUBMISSION && item.data?.finalPoints && (
                <View style={styles.previewInfo}>
                  <MaterialCommunityIcons name="timer-alert" size={12} color={theme.primary} />
                  <Text style={[styles.previewText, { color: theme.textSecondary }]}>Points: {item.data.finalPoints}</Text>
                </View>
              )}
              
              {item.type === NotificationTypes.TASK_ASSIGNED && item.data?.taskTitle && (
                <View style={styles.previewInfo}>
                  <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
                  <Text style={[styles.previewText, { color: theme.textSecondary }]}>{item.data.taskPoints || 0} pts</Text>
                </View>
              )}
              
              {item.type === NotificationTypes.SWAP_REQUEST && item.data?.taskTitle && (
                <View style={styles.previewInfo}>
                  <MaterialCommunityIcons name="swap-horizontal" size={12} color="#4F46E5" />
                  <Text style={[styles.previewText, { color: theme.textSecondary }]}>Swap: {item.data.taskTitle}</Text>
                </View>
              )}
              
              {item.type === NotificationTypes.SUBMISSION_PENDING && item.data?.taskTitle && (
                <View style={styles.previewInfo}>
                  <MaterialCommunityIcons name="clock-check" size={12} color={theme.primary} />
                  <Text style={[styles.previewText, { color: theme.textSecondary }]}>Needs Review: {item.data.taskTitle}</Text>
                </View>
              )}
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={14} color={theme.textMuted} />
        </TouchableOpacity>

        {!item.read && !isExpiredOrDeleted && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
        {isExpiredOrDeleted && <View style={[styles.expiredDot, { backgroundColor: theme.error }]} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[theme.bgSecondary, theme.bgTertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.emptyIconContainer, { borderColor: theme.border }]}
      >
        <MaterialCommunityIcons name="bell-off-outline" size={40} color={theme.primary} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>No notifications</Text>
      <Text style={[styles.emptyText, { color: theme.textPlaceholder }]}>
        When you get notifications about rotations, tasks, swaps, or points, they'll appear here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </LinearGradient>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={handleMarkAllAsRead}
          style={[styles.markAllButton, unreadCount === 0 && styles.disabledButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
          disabled={unreadCount === 0}
        >
          <MaterialCommunityIcons 
            name="check-all" 
            size={20} 
            color={unreadCount > 0 ? theme.primary : theme.textPlaceholder} 
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

// ✅ COMPLETE STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  markAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    borderWidth: 1,
  },
  unreadCard: {
    borderWidth: 2,
  },
  expiredCard: {
    borderWidth: 1,
    opacity: 0.8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
    marginLeft: 8,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  expiredMessage: {},
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  previewText: {
    fontSize: 11,
    fontWeight: '500',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expiredDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  deletedBadge: {
    backgroundColor: '#fff5f5',
  },
  expiredBadge: {
    backgroundColor: '#fff3bf',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  deletedBadgeText: {},
  expiredBadgeText: {},
  deleteButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  footerLoader: { 
    paddingVertical: 20,
    alignItems: 'center',
  },
});