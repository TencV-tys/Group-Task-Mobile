// src/screens/NotificationsScreen.tsx - UPDATED with consistent header
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
import { LinearGradient } from 'expo-linear-gradient';
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
    
    if (type === NotificationTypes.SWAP_EXPIRED) {
      Alert.alert(
        '⚠️ Request Expired',
        'This swap request has expired and is no longer available.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    switch (type) {
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
      
      case NotificationTypes.FEEDBACK_SUBMITTED:
      case NotificationTypes.FEEDBACK_STATUS_UPDATE:
        if (data?.feedbackId) {
          navigation.navigate('FeedbackDetails', { feedbackId: data.feedbackId });
        } else {
          navigation.navigate('Feedback');
        }
        break;
      
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
      
      case NotificationTypes.SWAP_REQUEST:
      case NotificationTypes.SWAP_ACCEPTED:
      case NotificationTypes.SWAP_REJECTED:
      case NotificationTypes.SWAP_CANCELLED:
      case NotificationTypes.SWAP_COMPLETED:
      case NotificationTypes.SWAP_ADMIN_NOTIFICATION:
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
      
      case NotificationTypes.POINTS_EARNED:
        if (data?.groupId) {
          navigation.navigate('Leaderboard', { 
            groupId: data.groupId,
            groupName: data.groupName 
          });
        }
        break;
      
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
      [NotificationTypes.POINT_DEDUCTION]: 'star-remove',
      [NotificationTypes.LATE_SUBMISSION]: 'timer-alert',
      [NotificationTypes.NEGLECT_DETECTED]: 'alert-circle',
      [NotificationTypes.TASK_REMINDER]: 'clock-alert',
      [NotificationTypes.TASK_ACTIVE]: 'clock-check',
      [NotificationTypes.SUBMISSION_PENDING]: 'clock-check',
      [NotificationTypes.SUBMISSION_VERIFIED]: 'check-circle',
      [NotificationTypes.SUBMISSION_REJECTED]: 'close-circle',
      [NotificationTypes.SUBMISSION_DECISION]: 'message-check',
      [NotificationTypes.FEEDBACK_SUBMITTED]: 'message',
      [NotificationTypes.FEEDBACK_STATUS_UPDATE]: 'update',
      [NotificationTypes.TASK_ASSIGNED]: 'clipboard-check',
      [NotificationTypes.TASK_COMPLETED]: 'check-circle',
      [NotificationTypes.TASK_OVERDUE]: 'alert',
      [NotificationTypes.TASK_CREATED]: 'plus-circle',
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

  const getNotificationColor = (type: string): string => {
    const colors: Record<string, string> = {
      [NotificationTypes.POINT_DEDUCTION]: '#fa5252',
      [NotificationTypes.LATE_SUBMISSION]: '#e67700',
      [NotificationTypes.NEGLECT_DETECTED]: '#fa5252',
      [NotificationTypes.TASK_REMINDER]: '#e67700',
      [NotificationTypes.TASK_ACTIVE]: '#2b8a3e',
      [NotificationTypes.SUBMISSION_PENDING]: '#e67700',
      [NotificationTypes.SUBMISSION_VERIFIED]: '#2b8a3e',
      [NotificationTypes.SUBMISSION_REJECTED]: '#fa5252',
      [NotificationTypes.SUBMISSION_DECISION]: '#495057',
      [NotificationTypes.FEEDBACK_SUBMITTED]: '#e67700',
      [NotificationTypes.FEEDBACK_STATUS_UPDATE]: '#495057',
      [NotificationTypes.TASK_ASSIGNED]: '#2b8a3e',
      [NotificationTypes.TASK_COMPLETED]: '#2b8a3e',
      [NotificationTypes.TASK_OVERDUE]: '#fa5252',
      [NotificationTypes.TASK_CREATED]: '#495057',
      [NotificationTypes.GROUP_INVITE]: '#2b8a3e',
      [NotificationTypes.GROUP_JOINED]: '#2b8a3e',
      [NotificationTypes.GROUP_CREATED]: '#495057',
      [NotificationTypes.NEW_MEMBER]: '#2b8a3e',
      [NotificationTypes.SWAP_REQUEST]: '#4F46E5',
      [NotificationTypes.SWAP_ACCEPTED]: '#2b8a3e',
      [NotificationTypes.SWAP_REJECTED]: '#fa5252',
      [NotificationTypes.SWAP_CANCELLED]: '#868e96',
      [NotificationTypes.SWAP_COMPLETED]: '#2b8a3e',
      [NotificationTypes.SWAP_ADMIN_NOTIFICATION]: '#495057',
      [NotificationTypes.SWAP_EXPIRED]: '#868e96',
      [NotificationTypes.POINTS_EARNED]: '#e67700',
      [NotificationTypes.MENTION]: '#495057',
      [NotificationTypes.REMINDER]: '#2b8a3e',
    };
    return colors[type] || '#868e96';
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
        <LinearGradient
          colors={[iconColor, iconColor + 'dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <MaterialCommunityIcons name={iconName as any} size={18} color="white" />
        </LinearGradient>
        
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
          
          {item.type === NotificationTypes.POINT_DEDUCTION && item.data?.deductedPoints && (
            <View style={styles.previewInfo}>
              <MaterialCommunityIcons name="star-remove" size={12} color="#fa5252" />
              <Text style={styles.previewText}>Lost {Math.abs(item.data.deductedPoints)} points</Text>
            </View>
          )}
          
          {item.type === NotificationTypes.LATE_SUBMISSION && item.data?.finalPoints && (
            <View style={styles.previewInfo}>
              <MaterialCommunityIcons name="timer-alert" size={12} color="#e67700" />
              <Text style={styles.previewText}>Points: {item.data.finalPoints}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={14} color="#adb5bd" />
        </TouchableOpacity>

        {!item.read && <View style={styles.unreadDot} />}
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
        <ActivityIndicator size="small" color="#2b8a3e" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Consistent with other screens */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
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
          style={[styles.markAllButton, unreadCount === 0 && styles.disabledButton]}
          disabled={unreadCount === 0}
        >
          <MaterialCommunityIcons 
            name="check-all" 
            size={20} 
            color={unreadCount > 0 ? "#2b8a3e" : "#adb5bd"} 
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
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
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
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    color: '#212529', 
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
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  markAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  unreadCard: {
    backgroundColor: '#f8f9fa',
    borderColor: '#2b8a3e',
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
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
    color: '#212529',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
    color: '#868e96',
    marginLeft: 8,
  },
  message: {
    fontSize: 12, 
    color: '#868e96',
    lineHeight: 16,
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  previewText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2b8a3e',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#868e96',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});