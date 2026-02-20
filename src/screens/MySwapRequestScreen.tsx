// src/screens/MySwapRequestsScreen.tsx - COMPLETE FIXED VERSION
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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FilterStatus = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export const MySwapRequestsScreen = () => {
  const navigation = useNavigation();
  const {
    myRequests,
    loading,
    totalMyRequests,
    loadMyRequests,
    cancelSwapRequest,
  } = useSwapRequests();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [userLoading, setUserLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const limit = 20;

  // Load user ID on mount
  useEffect(() => {
    const loadUserId = async () => {
      try {
        setUserLoading(true);
        // Try to get userData first
        let userStr = await AsyncStorage.getItem('userData');
        if (!userStr) {
          userStr = await AsyncStorage.getItem('user');
        }
        
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id || user._id);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    loadUserId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadRequests();
      }
    }, [activeFilter, userId])
  );

  const loadRequests = async (resetPage = true) => {
    if (resetPage) setPage(0);
    
    await loadMyRequests({
      status: activeFilter === 'ALL' ? undefined : activeFilter,
      limit,
      offset: resetPage ? 0 : page * limit,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && myRequests.length < totalMyRequests) {
      setPage(prev => prev + 1);
      loadRequests(false);
    }
  };

  const handleCancel = (requestId: string) => {
    Alert.alert(
      'Cancel Swap Request',
      'Are you sure you want to cancel this swap request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await cancelSwapRequest(requestId);
            setProcessingId(null);
            
            if (result.success) {
              Alert.alert('Success', 'Swap request cancelled successfully');
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (requestId: string) => {
    // @ts-ignore - navigation to SwapRequestDetails
    navigation.navigate('SwapRequestDetails', { requestId });
  };

  const renderFilterButton = (filter: FilterStatus, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          activeFilter === filter && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSwapRequest = ({ item }: { item: any }) => {
    const statusColor = SwapRequestService.getStatusColor(item.status);
    const statusLabel = SwapRequestService.getStatusLabel(item.status);
    const statusIcon = SwapRequestService.getStatusIcon(item.status);
    const isPending = item.status === 'PENDING';
    const canCancel = isPending;
    const isProcessing = processingId === item.id;
    
    const dueDate = item.assignment?.dueDate;
    const taskTitle = item.assignment?.task?.title || 'Task';
    const groupName = item.assignment?.task?.group?.name || 'Group';
    const timeSlot = item.assignment?.timeSlot?.startTime;
    const points = item.assignment?.points || 0;
    const targetUser = item.targetUser;

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => handleViewDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={statusIcon as any} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.taskTitle} numberOfLines={1}>
          {taskTitle}
        </Text>
        
        <Text style={styles.groupName}>
          <Ionicons name="people" size={14} color="#6B7280" /> {groupName}
        </Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              Due: {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>

          {timeSlot && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{timeSlot}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="star-outline" size={16} color="#F59E0B" />
            <Text style={styles.detailText}>{points} pts</Text>
          </View>

          {targetUser ? (
            <View style={styles.detailRow}>
              <Ionicons name="person" size={16} color="#4F46E5" />
              <Text style={styles.detailText}>
                To: {targetUser.fullName}
              </Text>
            </View>
          ) : (
            <View style={styles.detailRow}>
              <Ionicons name="people" size={16} color="#10B981" />
              <Text style={styles.detailText}>Anyone can accept</Text>
            </View>
          )}

          {item.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText} numberOfLines={2}>
                {item.reason}
              </Text>
            </View>
          )}

          {item.expiresAt && item.status === 'PENDING' && (
            <View style={styles.expiryContainer}>
              <Ionicons name="hourglass-outline" size={14} color="#F59E0B" />
              <Text style={styles.expiryText}>
                Expires: {new Date(item.expiresAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {canCancel && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCancel(item.id);
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Cancel Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Show loading state while checking user
  if (userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Swap Requests</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show message if no user
  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Swap Requests</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>User not authenticated</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state for requests
  if (loading && !refreshing && myRequests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Swap Requests</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderFilterButton('ALL', 'All')}
            {renderFilterButton('PENDING', 'Pending')}
            {renderFilterButton('ACCEPTED', 'Accepted')}
            {renderFilterButton('REJECTED', 'Rejected')}
            {renderFilterButton('CANCELLED', 'Cancelled')}
            {renderFilterButton('EXPIRED', 'Expired')}
          </ScrollView>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading swap requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Swap Requests</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setActiveFilter('ALL')}
        >
          <Ionicons name="funnel" size={22} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('ALL', 'All')}
          {renderFilterButton('PENDING', 'Pending')}
          {renderFilterButton('ACCEPTED', 'Accepted')}
          {renderFilterButton('REJECTED', 'Rejected')}
          {renderFilterButton('CANCELLED', 'Cancelled')}
          {renderFilterButton('EXPIRED', 'Expired')}
        </ScrollView>
      </View>

      <FlatList
        data={myRequests}
        renderItem={renderSwapRequest}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="swap-horizontal" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Swap Requests</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'ALL'
                ? "You haven't made any swap requests yet"
                : `No ${activeFilter.toLowerCase()} swap requests`}
            </Text>
            {activeFilter !== 'ALL' && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => setActiveFilter('ALL')}
              >
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          loading && myRequests.length > 0 ? (
            <ActivityIndicator style={styles.loader} color="#4F46E5" />
          ) : null
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
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyButton: {
    padding: 8,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
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
    marginBottom: 12,
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
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  reasonContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
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
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  cancelButtonText: {
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
    marginBottom: 16,
  },
  clearFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  loader: {
    marginVertical: 20,
  },
});