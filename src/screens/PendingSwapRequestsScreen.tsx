// src/screens/PendingSwapRequestsScreen.tsx - Dark Mode Added
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export const PendingSwapRequestsScreen = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const {
    pendingForMe,
    loading,
    totalPendingForMe,
    loadPendingForMe,
    acceptSwapRequest,
    rejectSwapRequest,
  } = useSwapRequests();

  // ========== REAL-TIME HOOKS ==========
  const {
    events: swapEvents,
    clearSwapRequested,
    clearSwapResponded,
    clearSwapAccepted,
    clearSwapRejected,
    clearSwapCancelled,
    clearSwapExpired
  } = useRealtimeSwapRequests('', currentUserId || '');

  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ===== LOAD USER ID AND ROLE =====
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user) {
          setCurrentUserId(user.id);
          setUserRole(user.role);
          console.log(`✅ Loaded user: ${user.fullName}, role: ${user.role}`);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  const isAdmin = userRole === 'ADMIN';

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              (navigation as any).navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  // ========== HANDLE REAL-TIME EVENTS ==========
  useEffect(() => {
    if (swapEvents.swapRequested) {
      if (swapEvents.swapRequested.toUserId === currentUserId || !swapEvents.swapRequested.toUserId) {
        Alert.alert(
          '🔄 New Swap Request',
          `${swapEvents.swapRequested.fromUserName} wants to swap "${swapEvents.swapRequested.taskTitle}"`,
          [
            { text: 'View', onPress: () => handleRefresh() },
            { text: 'OK' }
          ]
        );
        handleRefresh();
      }
      clearSwapRequested();
    }
  }, [swapEvents.swapRequested]);

  useEffect(() => {
    if (swapEvents.swapResponded) {
      const isAccepted = swapEvents.swapResponded.status === 'ACCEPTED';
      if (swapEvents.swapResponded.fromUserId === currentUserId) {
        Alert.alert(
          isAccepted ? '✅ Swap Accepted' : '❌ Swap Rejected',
          `${swapEvents.swapResponded.toUserName} has ${isAccepted ? 'accepted' : 'rejected'} your swap request`,
          [{ text: 'OK' }]
        );
      }
      handleRefresh();
      clearSwapResponded();
    }
  }, [swapEvents.swapResponded]);

  useEffect(() => {
    if (swapEvents.swapAccepted) {
      if (swapEvents.swapAccepted.toUserId === currentUserId) {
        Alert.alert(
          '✅ Swap Accepted',
          `You have successfully accepted the swap request`,
          [{ text: 'OK' }]
        );
      }
      handleRefresh();
      clearSwapAccepted();
    }
  }, [swapEvents.swapAccepted]);

  useEffect(() => {
    if (swapEvents.swapCancelled) {
      if (swapEvents.swapCancelled.fromUserId === currentUserId) {
        Alert.alert(
          '✖️ Swap Cancelled',
          `Your swap request has been cancelled`,
          [{ text: 'OK' }]
        );
      }
      handleRefresh();
      clearSwapCancelled();
    }
  }, [swapEvents.swapCancelled]);

  useEffect(() => {
    if (swapEvents.swapExpired) {
      if (swapEvents.swapExpired.fromUserId === currentUserId) {
        Alert.alert(
          '⏰ Swap Expired',
          `Your swap request has expired`,
          [{ text: 'OK' }]
        );
      }
      handleRefresh();
      clearSwapExpired();
    }
  }, [swapEvents.swapExpired]);

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        loadPendingForMe();
      }
    }, [currentUserId])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPendingForMe();
    setRefreshing(false);
  };

  const handleAccept = (requestId: string, scope?: string, selectedDay?: string) => {
    const swapDescription = scope === 'day' 
      ? `this swap for ${selectedDay || 'specific day'}`
      : 'this entire week swap';
    
    Alert.alert(
      'Accept Swap Request',
      `Are you sure you want to accept ${swapDescription}? This assignment will be transferred to you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await acceptSwapRequest(requestId);
            setProcessingId(null);
          },
        },
      ]
    );
  };

  const handleReject = (requestId: string) => {
    Alert.alert(
      'Reject Swap Request',
      'Are you sure you want to reject this swap request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await rejectSwapRequest(requestId);
            setProcessingId(null);
          },
        },
      ]
    );
  };

  const handleViewDetails = (requestId: string) => {
    (navigation as any).navigate('SwapRequestDetails', { requestId });
  };

  const renderSwapRequest = ({ item }: { item: any }) => {
    const statusColor = SwapRequestService.getStatusColor(item.status);
    const statusLabel = SwapRequestService.getStatusLabel(item.status);
    const statusIcon = SwapRequestService.getStatusIcon(item.status);
    const isProcessing = processingId === item.id;
    
    const dueDate = item.assignment?.dueDate;
    const taskTitle = item.assignment?.task?.title || 'Task';
    const requesterName = item.requester?.fullName || 'A user';
    const requesterAvatar = item.requester?.avatarUrl;
    const timeSlot = item.assignment?.timeSlot?.startTime;
    const points = item.assignment?.points || 0;
    const scope = item.scope || 'week';
    const selectedDay = item.selectedDay;
    const selectedTimeSlot = item.selectedTimeSlot;
    
    // Check if this request is for the current user
    const isTargetUser = item.targetUserId === currentUserId;
    const isOpenToAnyone = !item.targetUserId;
    const canActOnRequest = !isAdmin && (isTargetUser || isOpenToAnyone);

    return (
      <TouchableOpacity
        style={[styles.requestCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}
        onPress={() => handleViewDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.requesterInfo}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatar, { borderColor: theme.border }]}
            >
              {requesterAvatar ? (
                <Image source={{ uri: requesterAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                  {requesterName.charAt(0).toUpperCase()}
                </Text>
              )}
            </LinearGradient>
            <View>
              <Text style={[styles.requesterName, { color: theme.text }]}>{requesterName}</Text>
              <Text style={[styles.requestTime, { color: theme.textMuted }]}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <LinearGradient
            colors={[statusColor + '20', statusColor + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statusBadge, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name={statusIcon as any} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </LinearGradient>
        </View>

        <View style={[styles.taskContainer, { borderTopColor: theme.borderLight }]}>
          <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
            {taskTitle}
          </Text>
          
          <LinearGradient
            colors={scope === 'day' ? ['#EEF2FF', '#dbe4ff'] : [theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.scopeBadge,
              scope === 'day' && styles.dayScopeBadge,
              { borderColor: theme.border }
            ]}
          >
            <MaterialCommunityIcons 
              name={scope === 'day' ? 'calendar-today' : 'calendar-week'} 
              size={12} 
              color={scope === 'day' ? '#4F46E5' : theme.textSecondary} 
            />
            <Text style={[
              styles.scopeBadgeText,
              scope === 'day' && styles.dayScopeBadgeText,
              { color: scope === 'day' ? '#4F46E5' : theme.textSecondary }
            ]}>
              {scope === 'day' 
                ? `Swap for ${selectedDay || 'specific day'}`
                : 'Swap for entire week'}
            </Text>
          </LinearGradient>
          
          {scope === 'day' && selectedTimeSlot && (
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.timeSlotBadge, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="clock-outline" size={10} color={theme.textMuted} />
              <Text style={[styles.timeSlotText, { color: theme.textSecondary }]}>
                {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                {selectedTimeSlot.label ? ` (${selectedTimeSlot.label})` : ''}
              </Text>
            </LinearGradient>
          )}
          
          <View style={styles.detailsGrid}>
            <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            
            {timeSlot && scope !== 'day' && (
              <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]}>{timeSlot}</Text>
              </View>
            )}
            
            <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>{points} pts</Text>
            </View>
          </View>

          {item.reason && (
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.reasonContainer, { borderColor: theme.border }]}
            >
              <Text style={[styles.reasonLabel, { color: theme.textMuted }]}>Reason:</Text>
              <Text style={[styles.reasonText, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.reason}
              </Text>
            </LinearGradient>
          )}

          {item.expiresAt && (
            <View style={[styles.expiryContainer, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={theme.primary} />
              <Text style={[styles.expiryText, { color: theme.primary }]}>
                Expires: {new Date(item.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons - Only for non-admin users who are the target */}
        {item.status === 'PENDING' && canActOnRequest && (
          <View style={[styles.actionButtons, { borderTopColor: theme.borderLight }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton, { borderColor: theme.primaryBorder }]}
              onPress={() => handleAccept(item.id, item.scope, item.selectedDay)}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={16} color={theme.primary} />
                    <Text style={[styles.acceptButtonText, { color: theme.primary }]}>Accept</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton, { borderColor: theme.errorBorder }]}
              onPress={() => handleReject(item.id)}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[theme.errorBg, theme.errorBg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={theme.error} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close" size={16} color={theme.error} />
                    <Text style={[styles.rejectButtonText, { color: theme.error }]}>Reject</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Admin View Only Badge */}
        {item.status === 'PENDING' && isAdmin && (
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.adminViewBadge, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name="eye" size={14} color={theme.primary} />
            <Text style={[styles.adminViewText, { color: theme.primary }]}>Admin View Only</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoadingUser) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (loading && !refreshing && pendingForMe.length === 0) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading swap requests...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Swap Requests</Text>
          {totalPendingForMe > 0 && (
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>{totalPendingForMe}</Text>
            </LinearGradient>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.historyButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
          onPress={() => (navigation as any).navigate('MySwapRequests')}
        >
          <MaterialCommunityIcons name="history" size={22} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Admin Info Banner */}
      {isAdmin && (
        <LinearGradient
          colors={[theme.primaryLight, theme.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.adminInfoBanner, { borderColor: theme.primaryBorder }]}
        >
          <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
          <Text style={[styles.adminInfoText, { color: theme.primary }]}>
            Admin View - You can see all pending swap requests but cannot accept or reject them.
          </Text>
        </LinearGradient>
      )}

      <FlatList
        data={pendingForMe}
        renderItem={renderSwapRequest}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.emptyIconContainer, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={40} color={theme.textPlaceholder} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Pending Requests</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {isAdmin 
                ? 'No pending swap requests in this group'
                : 'You don\'t have any swap requests waiting for your response.'}
            </Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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
  headerTitleContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: -20,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyButton: {
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
  adminInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  adminInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '600',
  },
  requestTime: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
  },
  dayScopeBadge: {},
  scopeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayScopeBadgeText: {},
  timeSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 12,
    borderWidth: 1,
  },
  timeSlotText: {
    fontSize: 11,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 12,
  },
  reasonContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  acceptButton: {
    borderWidth: 1,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rejectButton: {
    borderWidth: 1,
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  adminViewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  adminViewText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
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
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});