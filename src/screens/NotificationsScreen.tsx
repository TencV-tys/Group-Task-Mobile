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
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data) {
      handleNavigation(notification.type, notification.data);
    }
  };

  const handleNavigation = (type: string, data: any) => {
    console.log('Navigating with type:', type, 'data:', data);
    
    switch (type) {
      // ============= FEEDBACK TYPES =============
      case 'FEEDBACK_SUBMITTED':
      case 'FEEDBACK_STATUS_UPDATE':
        if (data?.feedbackId) {
          navigation.navigate('FeedbackDetails', { feedbackId: data.feedbackId });
        } else {
          navigation.navigate('Feedback');
        }
        break;
      
      // ============= TASK RELATED TYPES =============
      case 'TASK_ASSIGNED':
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      case 'TASK_COMPLETED':
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      case 'TASK_OVERDUE':
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      case 'TASK_CREATED':
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      // ============= GROUP RELATED TYPES =============
      case 'GROUP_INVITE':
        if (data?.groupId) {
          navigation.navigate('GroupDetails', { 
            groupId: data.groupId,
            inviteCode: data.inviteCode 
          });
        }
        break;
      
      case 'GROUP_JOINED':
        if (data?.groupId) {
          navigation.navigate('GroupTasks', { 
            groupId: data.groupId, 
            groupName: data.groupName,
            userRole: data.userRole || 'MEMBER'
          });
        }
        break;
      
      case 'GROUP_CREATED':
        if (data?.groupId) {
          navigation.navigate('GroupTasks', { 
            groupId: data.groupId, 
            groupName: data.groupName,
            userRole: 'ADMIN'
          });
        }
        break;
      
      case 'NEW_MEMBER':
        if (data?.groupId) {
          navigation.navigate('GroupMembers', { 
            groupId: data.groupId,
            groupName: data.groupName 
          });
        }
        break;
      
      // ============= SWAP REQUEST TYPES =============
      case 'SWAP_REQUEST':
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
      
      case 'SWAP_ACCEPTED':
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { 
            requestId: data.swapRequestId 
          });
        } else if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      case 'SWAP_REJECTED':
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { 
            requestId: data.swapRequestId 
          });
        }
        break;
      
      case 'SWAP_CANCELLED':
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { 
            requestId: data.swapRequestId 
          });
        }
        break;
      
      case 'SWAP_COMPLETED':
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { 
            requestId: data.swapRequestId 
          });
        } else if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      case 'SWAP_ADMIN_NOTIFICATION':
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { 
            requestId: data.swapRequestId 
          });
        } else if (data?.taskId) {
          navigation.navigate('TaskDetails', { 
            taskId: data.taskId,
            groupId: data.groupId 
          });
        }
        break;
      
      case 'SWAP_EXPIRED':
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { 
            requestId: data.swapRequestId 
          });
        }
        break;
      
      // ============= SUBMISSION TYPES =============
      case 'SUBMISSION_PENDING':
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
      
      case 'SUBMISSION_VERIFIED':
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: false 
          });
        }
        break;
      
      case 'SUBMISSION_REJECTED':
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: false 
          });
        }
        break;
      
      case 'SUBMISSION_DECISION':
        if (data?.assignmentId) {
          navigation.navigate('AssignmentDetails', { 
            assignmentId: data.assignmentId,
            isAdmin: true 
          });
        }
        break;
      
      // ============= POINTS AND ACHIEVEMENTS =============
      case 'POINTS_EARNED':
        if (data?.groupId) {
          navigation.navigate('Leaderboard', { 
            groupId: data.groupId,
            groupName: data.groupName 
          });
        }
        break;
      
      // ============= MENTIONS AND REMINDERS =============
      case 'MENTION':
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
      
      case 'REMINDER':
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
        // If there's a taskId in data, try to navigate to task details
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { taskId: data.taskId });
        }
        // If there's a groupId, go to group tasks
        else if (data?.groupId) {
          navigation.navigate('GroupTasks', { 
            groupId: data.groupId,
            groupName: data.groupName || 'Group'
          });
        }
        // Otherwise just go back
        else {
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
      // Feedback
      'FEEDBACK_SUBMITTED': 'message',
      'FEEDBACK_STATUS_UPDATE': 'update',
      
      // Task
      'TASK_ASSIGNED': 'clipboard-check',
      'TASK_COMPLETED': 'check-circle',
      'TASK_OVERDUE': 'alert',
      'TASK_CREATED': 'plus-circle',
      
      // Group
      'GROUP_INVITE': 'account-plus',
      'GROUP_JOINED': 'account-group',
      'GROUP_CREATED': 'home',
      'NEW_MEMBER': 'account-plus',
      
      // Swap
      'SWAP_REQUEST': 'swap-horizontal',
      'SWAP_ACCEPTED': 'handshake',
      'SWAP_REJECTED': 'close-circle',
      'SWAP_CANCELLED': 'cancel',
      'SWAP_COMPLETED': 'check-circle',
      'SWAP_ADMIN_NOTIFICATION': 'shield-alert',
      'SWAP_EXPIRED': 'timer-off',
      
      // Submission
      'SUBMISSION_PENDING': 'clock-check',
      'SUBMISSION_VERIFIED': 'check-circle',
      'SUBMISSION_REJECTED': 'close-circle',
      'SUBMISSION_DECISION': 'message-check',
      
      // Points
      'POINTS_EARNED': 'trophy',
      
      // Other
      'MENTION': 'at',
      'REMINDER': 'bell',
    };
    return icons[type] || 'bell';
  };

  const getNotificationColor = (type: string): string => {
    const colors: Record<string, string> = {
      // Feedback
      'FEEDBACK_SUBMITTED': '#FF9500',
      'FEEDBACK_STATUS_UPDATE': '#5856D6',
      
      // Task
      'TASK_ASSIGNED': '#007AFF',
      'TASK_COMPLETED': '#34C759',
      'TASK_OVERDUE': '#FF3B30',
      'TASK_CREATED': '#5856D6',
      
      // Group
      'GROUP_INVITE': '#4CD964',
      'GROUP_JOINED': '#4CD964',
      'GROUP_CREATED': '#5856D6',
      'NEW_MEMBER': '#4CD964',
      
      // Swap
      'SWAP_REQUEST': '#4F46E5',
      'SWAP_ACCEPTED': '#10B981',
      'SWAP_REJECTED': '#EF4444',
      'SWAP_CANCELLED': '#6B7280',
      'SWAP_COMPLETED': '#10B981',
      'SWAP_ADMIN_NOTIFICATION': '#8B5CF6',
      'SWAP_EXPIRED': '#9CA3AF',
      
      // Submission
      'SUBMISSION_PENDING': '#FF9500',
      'SUBMISSION_VERIFIED': '#34C759',
      'SUBMISSION_REJECTED': '#FF3B30',
      'SUBMISSION_DECISION': '#5856D6',
      
      // Points
      'POINTS_EARNED': '#FFD700',
      
      // Other
      'MENTION': '#5856D6',
      'REMINDER': '#007AFF',
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