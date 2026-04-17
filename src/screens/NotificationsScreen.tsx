// src/screens/NotificationsScreen.tsx - COMPLETE FIXED VERSION
import React, { useState } from 'react';
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
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function NotificationsScreen({ navigation }: any) {
  const { theme } = useTheme();
  
  const {
    loading,
    notifications,
    unreadCount,
    pagination,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,  // ✅ This already has its own alert
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

  // ✅ Just mark as read and show alert
  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    Alert.alert(
      notification.title,
      notification.message,
      [{ text: 'OK' }]
    );
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

  // ✅ REMOVED handleDeleteAll - using deleteAllNotifications directly from hook

  const getNotificationIcon = (type: string): string => {
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

  const getNotificationColor = (type: string): string => {
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
    return colors[type] || theme.primary;
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
        style={[
          styles.notificationCard,
          !item.read && styles.unreadCard,
          { backgroundColor: theme.card, borderColor: theme.border }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[iconColor, iconColor + 'dd']}
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
            <Text 
              style={[
                styles.title, 
                !item.read && styles.unreadTitle, 
                { color: theme.text }
              ]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            <Text style={[styles.timeText, { color: theme.textMuted }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          
          <Text 
            style={[styles.message, { color: theme.textMuted }]} 
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.message}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={(e) => {
            e.stopPropagation(); 
            deleteNotification(item.id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={16} color={theme.textMuted} />
        </TouchableOpacity>

        {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
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
        
        <View style={styles.headerButtons}>
          {/* Mark All as Read Button */}
          <TouchableOpacity 
            onPress={handleMarkAllAsRead}
            style={[styles.headerButton, unreadCount === 0 && styles.disabledButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
            disabled={unreadCount === 0}
          >
            <MaterialCommunityIcons 
              name="check-all" 
              size={20} 
              color={unreadCount > 0 ? theme.primary : theme.textPlaceholder} 
            />
          </TouchableOpacity>
          
          {/* Delete All Button - Direct call, no wrapper */}
          <TouchableOpacity 
            onPress={deleteAllNotifications}  // ✅ Direct call
            style={[styles.headerButton, notifications.length === 0 && styles.disabledButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
            disabled={notifications.length === 0}
          >
            <MaterialCommunityIcons 
              name="delete-sweep" 
              size={20} 
              color={notifications.length > 0 ? theme.error : theme.textPlaceholder} 
            />
          </TouchableOpacity>
        </View>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerButton: {
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
  badge: {
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  disabledButton: { opacity: 0.5 },
  listContent: { padding: 16, flexGrow: 1 },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    borderWidth: 1,
  },
  unreadCard: { borderWidth: 2 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentContainer: { flex: 1, marginRight: 28 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: '500', flex: 1, flexShrink: 1 },
  unreadTitle: { fontWeight: '700' },
  timeText: { fontSize: 10, flexShrink: 0 },
  message: { fontSize: 12, lineHeight: 16 },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteButton: {
    position: 'absolute',
    right: 8,
    top: 12,
    padding: 4,
    zIndex: 1,
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
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});