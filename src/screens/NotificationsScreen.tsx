// src/screens/NotificationsScreen.tsx - COMPLETE UPDATED VERSION
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotifications } from '../notificationHook/useNotifications';
import { NotificationTypes } from '../services/NotificationService';

export default function NotificationsScreen({ navigation }: any) {
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

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.data) {
      handleNavigation(notification.type, notification.data);
    }
  };

  const handleNavigation = (type: string, data: any) => {
    console.log('Navigating with type:', type, 'data:', data);
    
    switch (type) {
      // ============= PENALTY & NEGLECT TYPES =============
      case NotificationTypes.POINT_DEDUCTION:
      case NotificationTypes.LATE_SUBMISSION:
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: false 
          });
        } else if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      case NotificationTypes.NEGLECT_DETECTED:
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: true 
          });
        } else if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      // ============= REMINDER TYPES =============
      case NotificationTypes.TASK_REMINDER:
      case NotificationTypes.TASK_ACTIVE:
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: false 
          });
        } else if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      // ============= SUBMISSION TYPES =============
      case NotificationTypes.SUBMISSION_PENDING:
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: true 
          });
        } else if (data?.taskId) {
          navigation.navigate('PendingVerifications', { 
            groupId: data.groupId,
            groupName: data.groupName,
            userRole: 'ADMIN'
          });
        }
        break;
      
      case NotificationTypes.SUBMISSION_VERIFIED:
      case NotificationTypes.SUBMISSION_REJECTED:
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: false 
          });
        }
        break;
      
      case NotificationTypes.SUBMISSION_DECISION:
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: true 
          });
        }
        break;
      
      // ============= FEEDBACK TYPES =============
      case NotificationTypes.FEEDBACK_SUBMITTED:
      case NotificationTypes.FEEDBACK_STATUS_UPDATE:
        if (data?.feedbackId) {
          navigation.navigate('FeedbackDetails', { feedbackId: data.feedbackId });
        } else {
          navigation.navigate('Feedback');
        }
        break;
      
      // ============= TASK RELATED TYPES =============
      case NotificationTypes.TASK_ASSIGNED:
      case NotificationTypes.TASK_COMPLETED:
      case NotificationTypes.TASK_OVERDUE:
      case NotificationTypes.TASK_CREATED:
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      // ============= GROUP RELATED TYPES =============
      case NotificationTypes.GROUP_INVITE:
        if (data?.groupId) {
          navigation.navigate('GroupDetails', { 
            groupId: data.groupId,
            inviteCode: data.inviteCode 
          });
        }
        break;
      
      case NotificationTypes.GROUP_JOINED:
      case NotificationTypes.GROUP_CREATED:
        if (data?.groupId) {
          navigation.navigate('GroupTasks', { 
            groupId: data.groupId, 
            groupName: data.groupName,
            userRole: data.userRole || 'MEMBER'
          });
        }
        break;
      
      case NotificationTypes.NEW_MEMBER:
        if (data?.groupId) {
          navigation.navigate('GroupMembers', { 
            groupId: data.groupId,
            groupName: data.groupName 
          });
        }
        break;
      
      // ============= SWAP REQUEST TYPES =============
      case NotificationTypes.SWAP_REQUEST:
      case NotificationTypes.SWAP_ACCEPTED:
      case NotificationTypes.SWAP_REJECTED:
      case NotificationTypes.SWAP_CANCELLED:
      case NotificationTypes.SWAP_COMPLETED:
      case NotificationTypes.SWAP_ADMIN_NOTIFICATION:
      case NotificationTypes.SWAP_EXPIRED:
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { 
            requestId: data.swapRequestId 
          });
        } else if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId 
          });
        }
        break;
      
      // ============= POINTS AND ACHIEVEMENTS =============
      case NotificationTypes.POINTS_EARNED:
        if (data?.groupId) {
          navigation.navigate('Leaderboard', { 
            groupId: data.groupId,
            groupName: data.groupName 
          });
        }
        break;
      
      // ============= MENTIONS AND REMINDERS =============
      case NotificationTypes.MENTION:
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        } else if (data?.commentId) {
          navigation.navigate('CommentDetails', { 
            commentId: data.commentId 
          });
        }
        break;
      
      case NotificationTypes.REMINDER:
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      // ============= DEFAULT =============
      default:
        console.log('Unhandled notification type:', type);
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { taskId: data.taskId });
        } else if (data?.groupId) {
          navigation.navigate('GroupTasks', { 
            groupId: data.groupId,
            groupName: data.groupName || 'Group'
          });
        } else {
          navigation.goBack();
        }
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
    deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      // Penalty types
      [NotificationTypes.POINT_DEDUCTION]: 'star-remove',
      [NotificationTypes.LATE_SUBMISSION]: 'timer-alert',
      [NotificationTypes.NEGLECT_DETECTED]: 'alert-circle',
      
      // Reminder types
      [NotificationTypes.TASK_REMINDER]: 'clock-alert',
      [NotificationTypes.TASK_ACTIVE]: 'clock-check',
      
      // Submission
      [NotificationTypes.SUBMISSION_PENDING]: 'clock-check',
      [NotificationTypes.SUBMISSION_VERIFIED]: 'check-circle',
      [NotificationTypes.SUBMISSION_REJECTED]: 'close-circle',
      [NotificationTypes.SUBMISSION_DECISION]: 'message-check',
      
      // Feedback
      [NotificationTypes.FEEDBACK_SUBMITTED]: 'message',
      [NotificationTypes.FEEDBACK_STATUS_UPDATE]: 'update',
      
      // Task
      [NotificationTypes.TASK_ASSIGNED]: 'clipboard-check',
      [NotificationTypes.TASK_COMPLETED]: 'check-circle',
      [NotificationTypes.TASK_OVERDUE]: 'alert',
      [NotificationTypes.TASK_CREATED]: 'plus-circle',
      
      // Group
      [NotificationTypes.GROUP_INVITE]: 'account-plus',
      [NotificationTypes.GROUP_JOINED]: 'account-group',
      [NotificationTypes.GROUP_CREATED]: 'home',
      [NotificationTypes.NEW_MEMBER]: 'account-plus',
      
      // Swap
      [NotificationTypes.SWAP_REQUEST]: 'swap-horizontal',
      [NotificationTypes.SWAP_ACCEPTED]: 'handshake',
      [NotificationTypes.SWAP_REJECTED]: 'close-circle',
      [NotificationTypes.SWAP_CANCELLED]: 'cancel',
      [NotificationTypes.SWAP_COMPLETED]: 'check-circle',
      [NotificationTypes.SWAP_ADMIN_NOTIFICATION]: 'shield-alert',
      [NotificationTypes.SWAP_EXPIRED]: 'timer-off',
      
      // Points
      [NotificationTypes.POINTS_EARNED]: 'trophy',
      
      // Other
      [NotificationTypes.MENTION]: 'at',
      [NotificationTypes.REMINDER]: 'bell',
    };
    return icons[type] || 'bell';
  };

  const getNotificationColor = (type: string): string => {
    const colors: Record<string, string> = {
      // Penalty types - Red/Orange
      [NotificationTypes.POINT_DEDUCTION]: '#FF3B30',
      [NotificationTypes.LATE_SUBMISSION]: '#FF9500',
      [NotificationTypes.NEGLECT_DETECTED]: '#FF3B30',
      
      // Reminder types - Orange/Green
      [NotificationTypes.TASK_REMINDER]: '#FF9500',
      [NotificationTypes.TASK_ACTIVE]: '#34C759',
      
      // Submission
      [NotificationTypes.SUBMISSION_PENDING]: '#FF9500',
      [NotificationTypes.SUBMISSION_VERIFIED]: '#34C759',
      [NotificationTypes.SUBMISSION_REJECTED]: '#FF3B30',
      [NotificationTypes.SUBMISSION_DECISION]: '#5856D6',
      
      // Feedback
      [NotificationTypes.FEEDBACK_SUBMITTED]: '#FF9500',
      [NotificationTypes.FEEDBACK_STATUS_UPDATE]: '#5856D6',
      
      // Task
      [NotificationTypes.TASK_ASSIGNED]: '#007AFF',
      [NotificationTypes.TASK_COMPLETED]: '#34C759',
      [NotificationTypes.TASK_OVERDUE]: '#FF3B30',
      [NotificationTypes.TASK_CREATED]: '#5856D6',
      
      // Group
      [NotificationTypes.GROUP_INVITE]: '#4CD964',
      [NotificationTypes.GROUP_JOINED]: '#4CD964',
      [NotificationTypes.GROUP_CREATED]: '#5856D6',
      [NotificationTypes.NEW_MEMBER]: '#4CD964',
      
      // Swap
      [NotificationTypes.SWAP_REQUEST]: '#4F46E5',
      [NotificationTypes.SWAP_ACCEPTED]: '#10B981',
      [NotificationTypes.SWAP_REJECTED]: '#EF4444',
      [NotificationTypes.SWAP_CANCELLED]: '#6B7280',
      [NotificationTypes.SWAP_COMPLETED]: '#10B981',
      [NotificationTypes.SWAP_ADMIN_NOTIFICATION]: '#8B5CF6',
      [NotificationTypes.SWAP_EXPIRED]: '#9CA3AF',
      
      // Points
      [NotificationTypes.POINTS_EARNED]: '#FFD700',
      
      // Other
      [NotificationTypes.MENTION]: '#5856D6',
      [NotificationTypes.REMINDER]: '#007AFF',
    };
    return colors[type] || '#8E8E93';
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

  const renderNotification = ({ item }: { item: any }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);
    
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
          <MaterialCommunityIcons name={iconName as any} size={20} color="white" />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
          </View>
          
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          
          {/* Show penalty info in preview if available */}
          {item.type === NotificationTypes.POINT_DEDUCTION && item.data?.deductedPoints && (
            <View style={styles.previewInfo}>
              <MaterialCommunityIcons name="star-remove" size={12} color="#FF3B30" />
              <Text style={styles.previewText}>Lost {Math.abs(item.data.deductedPoints)} points</Text>
            </View>
          )}
          
          {item.type === NotificationTypes.LATE_SUBMISSION && item.data?.finalPoints && (
            <View style={styles.previewInfo}>
              <MaterialCommunityIcons name="timer-alert" size={12} color="#FF9500" />
              <Text style={styles.previewText}>Points: {item.data.finalPoints}</Text>
            </View>
          )}
          
          {!item.read && <View style={styles.unreadDot} />}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={16} color="#adb5bd" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bell-off-outline" size={64} color="#dee2e6" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyText}>
        When you get notifications, they'll appear here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={handleMarkAllAsRead}
          style={[styles.markAllButton, unreadCount === 0 && styles.disabledButton]}
          disabled={unreadCount === 0}
        >
          <MaterialCommunityIcons 
            name="check-all" 
            size={24} 
            color={unreadCount > 0 ? "#007AFF" : "#adb5bd"} 
          />
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529', 
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#cce5ff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    color: '#212529',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#adb5bd',
    marginLeft: 8,
  },
  message: {
    fontSize: 13, 
    color: '#6c757d',
    lineHeight: 18,
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  previewText: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});