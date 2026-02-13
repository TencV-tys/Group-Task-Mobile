import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../SwapRequestServices.ts/SwapRequestService';

export const PendingSwapRequestsScreen = () => {
  const navigation = useNavigation();
  const {
    pendingForMe,
    loading,
    error,
    totalPendingForMe,
    loadPendingForMe,
    acceptSwapRequest,
    rejectSwapRequest,
  } = useSwapRequests();

  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPendingForMe();
    }, [])
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
    // @ts-ignore
    navigation.navigate('SwapRequestDetails', { requestId });
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

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => handleViewDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.requesterInfo}>
            <View style={styles.avatar}>
              {requesterAvatar ? (
                <Image source={{ uri: requesterAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {requesterName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.requesterName}>{requesterName}</Text>
              <Text style={styles.requestTime}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={statusIcon as any} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.taskContainer}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {taskTitle}
          </Text>
          
          {/* ✅ NEW: Scope Badge */}
          <View style={[
            styles.scopeBadge,
            scope === 'day' ? styles.dayScopeBadge : styles.weekScopeBadge
          ]}>
            <Ionicons 
              name={scope === 'day' ? 'today' : 'calendar'} 
              size={14} 
              color={scope === 'day' ? '#4F46E5' : '#6B7280'} 
            />
            <Text style={[
              styles.scopeBadgeText,
              scope === 'day' && styles.dayScopeBadgeText
            ]}>
              {scope === 'day' 
                ? `Swap for ${selectedDay || 'specific day'}`
                : 'Swap for entire week'}
            </Text>
          </View>
          
          {/* ✅ NEW: Time Slot Info for Day Swaps */}
          {scope === 'day' && selectedTimeSlot && (
            <View style={styles.timeSlotBadge}>
              <Ionicons name="time" size={12} color="#6B7280" />
              <Text style={styles.timeSlotText}>
                {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                {selectedTimeSlot.label ? ` (${selectedTimeSlot.label})` : ''}
              </Text>
            </View>
          )}
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>
                {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            
            {timeSlot && scope !== 'day' && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{timeSlot}</Text>
              </View>
            )}
            
            <View style={styles.detailItem}>
              <Ionicons name="star-outline" size={16} color="#F59E0B" />
              <Text style={styles.detailText}>{points} pts</Text>
            </View>
          </View>

          {item.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText} numberOfLines={2}>
                {item.reason}
              </Text>
            </View>
          )}

          {item.expiresAt && (
            <View style={styles.expiryContainer}>
              <Ionicons name="hourglass-outline" size={14} color="#F59E0B" />
              <Text style={styles.expiryText}>
                Expires: {new Date(item.expiresAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {item.status === 'PENDING' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(item.id, item.scope, item.selectedDay)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#10B981" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close" size={18} color="#EF4444" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && pendingForMe.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading swap requests...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Swap Requests</Text>
          {totalPendingForMe > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalPendingForMe}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('MySwapRequests' as never)}
        >
          <Ionicons name="time" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={pendingForMe}
        renderItem={renderSwapRequest}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="swap-horizontal" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>
              You don't have any swap requests waiting for your response.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -16,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  historyButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  requestTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  // ✅ NEW: Scope Badge Styles
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  dayScopeBadge: {
    backgroundColor: '#EEF2FF',
  },
  weekScopeBadge: {
    backgroundColor: '#F3F4F6',
  },
  scopeBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  dayScopeBadgeText: {
    color: '#4F46E5',
  },
  // ✅ NEW: Time Slot Badge
  timeSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeSlotText: {
    fontSize: 12,
    color: '#4B5563',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  reasonContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  expiryText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#ECFDF5',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#FEF2F2',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});