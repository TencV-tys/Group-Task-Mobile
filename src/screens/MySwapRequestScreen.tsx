// src/screens/MySwapRequestsScreen.tsx - FIXED with green clear filter
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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import * as SecureStore from 'expo-secure-store';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { ScreenWrapper } from '../components/ScreenWrapper';

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
  const {
    events: swapEvents,
    clearSwapResponded,
    clearSwapAccepted,
    clearSwapRejected,
    clearSwapCancelled,
    clearSwapExpired
  } = useRealtimeSwapRequests('', userId || '');
  // Load user ID on mount from SecureStore
  useEffect(() => {
    const loadUserId = async () => {
      try {
        setUserLoading(true);
        // Try to get userData from SecureStore
        let userStr = await SecureStore.getItemAsync('userData');
        if (!userStr) {
          userStr = await SecureStore.getItemAsync('user');
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

  useEffect(() => {
    if (swapEvents.swapResponded) {
      const isAccepted = swapEvents.swapResponded.status === 'ACCEPTED';
      Alert.alert(
        isAccepted ? '✅ Swap Accepted' : '❌ Swap Rejected',
        `Your swap request was ${isAccepted ? 'accepted' : 'rejected'}`,
        [{ text: 'OK' }]
      );
      loadRequests();
      clearSwapResponded();
    }
  }, [swapEvents.swapResponded]);

  useEffect(() => {
    if (swapEvents.swapCancelled) {
      Alert.alert('✖️ Swap Cancelled', 'Your swap request was cancelled', [{ text: 'OK' }]);
      loadRequests();
      clearSwapCancelled();
    }
  }, [swapEvents.swapCancelled]);

  useEffect(() => {
    if (swapEvents.swapExpired) {
      Alert.alert('⏰ Swap Expired', 'Your swap request has expired', [{ text: 'OK' }]);
      loadRequests();
      clearSwapExpired();
    }
  }, [swapEvents.swapExpired]);

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
      key={filter}
      style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
      onPress={() => setActiveFilter(filter)}
    >
      <LinearGradient
        colors={activeFilter === filter ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.filterButtonGradient}
      >
        <Text
          style={[
            styles.filterButtonText,
            activeFilter === filter && styles.filterButtonTextActive,
          ]}
        >
          {label}
        </Text>
      </LinearGradient>
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
          <LinearGradient
            colors={[statusColor + '20', statusColor + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusBadge}
          >
            <MaterialCommunityIcons name={statusIcon as any} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </LinearGradient>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.taskTitle} numberOfLines={1}>
          {taskTitle}
        </Text>
        
        <View style={styles.groupContainer}>
          <MaterialCommunityIcons name="account-group" size={14} color="#2b8a3e" />
          <Text style={styles.groupName}>{groupName}</Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color="#868e96" />
            <Text style={styles.detailText}>
              {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>

          {timeSlot && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#868e96" />
              <Text style={styles.detailText}>{timeSlot}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="star" size={14} color="#2b8a3e" />
            <Text style={styles.detailText}>{points} pts</Text>
          </View>

          {targetUser ? (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={14} color="#4F46E5" />
              <Text style={styles.detailText}>
                To: {targetUser.fullName}
              </Text>
            </View>
          ) : (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="earth" size={14} color="#2b8a3e" />
              <Text style={styles.detailText}>Anyone can accept</Text>
            </View>
          )}

          {item.reason && (
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reasonContainer}
            >
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText} numberOfLines={2}>
                {item.reason}
              </Text>
            </LinearGradient>
          )}

          {item.expiresAt && item.status === 'PENDING' && (
            <View style={styles.expiryContainer}>
              <MaterialCommunityIcons name="clock-outline" size={12} color="#e67700" />
              <Text style={styles.expiryText}>
                Expires: {new Date(item.expiresAt).toLocaleDateString()}
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
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cancelButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fa5252" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle" size={16} color="#fa5252" />
                    <Text style={styles.cancelButtonText}>Cancel Request</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Show loading state while checking user
  if (userLoading) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Swap Requests</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Show message if no user
  if (!userId) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Swap Requests</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>User not authenticated</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Show loading state for requests
  if (loading && !refreshing && myRequests.length === 0) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Swap Requests</Text>
          <View style={{ width: 36 }} />
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
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading swap requests...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Swap Requests</Text>
        <TouchableOpacity
          style={styles.filterIconButton}
          onPress={() => setActiveFilter('ALL')}
        >
          <MaterialCommunityIcons name="filter" size={20} color="#2b8a3e" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
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
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={40} color="#2b8a3e" />
            </LinearGradient>
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
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}  // GREEN gradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.clearFilterGradient}
                >
                  <Text style={styles.clearFilterText}>Clear Filter</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          loading && myRequests.length > 0 ? (
            <ActivityIndicator style={styles.loader} color="#2b8a3e" />
          ) : null
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
  errorText: {
    fontSize: 16,
    color: '#fa5252',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  filterIconButton: {
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
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterButton: {
    borderRadius: 20,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButtonActive: {
    borderColor: '#2b8a3e',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#868e96',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  groupName: {
    fontSize: 13,
    color: '#868e96',
  },
  detailsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  detailText: {
    fontSize: 12,
    color: '#495057',
  },
  reasonContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#868e96',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#212529',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  expiryText: {
    fontSize: 11,
    color: '#e67700',
    fontWeight: '500',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  cancelButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  cancelButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fa5252',
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
    borderColor: '#e9ecef',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
    lineHeight: 20,
  },
  clearFilterButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b8a3e',
  },
  clearFilterGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  loader: {
    marginVertical: 20,
  },
});