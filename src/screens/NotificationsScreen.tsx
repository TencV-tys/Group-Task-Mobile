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
    switch (type) {
      case 'FEEDBACK_SUBMITTED':
      case 'FEEDBACK_STATUS_UPDATE':
        if (data?.feedbackId) {
          navigation.navigate('FeedbackDetails', { feedbackId: data.feedbackId });
        } else {
          navigation.navigate('Feedback');
        }
        break;
      
      case 'TASK_ASSIGNED':
        if (data?.taskId) {
          navigation.navigate('TaskDetails', { taskId: data.taskId });
        }
        break;
      
      case 'GROUP_INVITE':
        if (data?.groupId) {
          navigation.navigate('GroupDetails', { groupId: data.groupId });
        }
        break;
      
      case 'SWAP_REQUEST':
        if (data?.swapRequestId) {
          navigation.navigate('SwapRequestDetails', { swapRequestId: data.swapRequestId });
        }
        break;
      
      default:
        // Just go back to home if no specific navigation
        navigation.goBack();
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

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'FEEDBACK_SUBMITTED': 'message',
      'FEEDBACK_STATUS_UPDATE': 'update',
      'TASK_ASSIGNED': 'clipboard-check',
      'TASK_COMPLETED': 'check-circle',
      'TASK_OVERDUE': 'alert',
      'GROUP_JOINED': 'account-group',
      'GROUP_CREATED': 'home',
      'SWAP_REQUEST': 'swap-horizontal',
      'SWAP_ACCEPTED': 'handshake',
      'SWAP_DECLINED': 'close-circle',
      'MENTION': 'at',
      'REMINDER': 'bell',
      'POINTS_EARNED': 'trophy',
      'NEW_MEMBER': 'account-plus',
      'TASK_CREATED': 'plus-circle'
    };
    return icons[type] || 'bell';
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      'FEEDBACK_SUBMITTED': '#FF9500',
      'FEEDBACK_STATUS_UPDATE': '#5856D6',
      'TASK_ASSIGNED': '#007AFF',
      'TASK_COMPLETED': '#34C759',
      'TASK_OVERDUE': '#FF3B30',
      'GROUP_JOINED': '#4CD964',
      'SWAP_REQUEST': '#4F46E5',
      'POINTS_EARNED': '#FFD700'
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

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
        <MaterialCommunityIcons name={getNotificationIcon(item.type) as any} size={20} color="white" />
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