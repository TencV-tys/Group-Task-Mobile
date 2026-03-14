// src/screens/GroupSwapHistoryScreen.tsx - UPDATED with proper token handling
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SwapRequestService } from '../services/SwapRequestService';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';

type FilterStatus = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export const GroupSwapHistoryScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const limit = 20;
  
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

  // ===== GET USER ID ON MOUNT =====
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    getUserId();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ===== REAL-TIME EVENT LISTENERS =====
  const { events: swapEvents } = useRealtimeSwapRequests(groupId, currentUserId || '');

  // Refresh when swap requests change
  useEffect(() => {
    if (swapEvents.swapCreated ||
        swapEvents.swapResponded ||
        swapEvents.swapAccepted ||
        swapEvents.swapRejected ||
        swapEvents.swapCancelled ||
        swapEvents.swapExpired) {
      console.log('🔄 Swap event detected, refreshing group swap history...');
      refreshRequests();
    }
  }, [
    swapEvents.swapCreated,
    swapEvents.swapResponded,
    swapEvents.swapAccepted,
    swapEvents.swapRejected,
    swapEvents.swapCancelled,
    swapEvents.swapExpired
  ]);

  // Listen for notifications
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if ([
        'SWAP_REQUEST',
        'SWAP_ACCEPTED',
        'SWAP_REJECTED',
        'SWAP_CANCELLED',
        'SWAP_EXPIRED',
        'SWAP_ADMIN_NOTIFICATION'
      ].includes(notification.type)) {
        console.log(`🔔 Swap notification ${notification.type} received, refreshing...`);
        refreshRequests();
      }
    },
    showAlerts: true
  });

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        loadRequests();
      }
    }, [activeFilter, groupId])
  );

  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 GroupSwapHistory: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      console.log('✅ GroupSwapHistory: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ GroupSwapHistory: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  const loadRequests = async (resetPage = true) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (resetPage) {
      setPage(0);
      if (!initialLoadDone.current) {
        setLoading(true);
      }
    }
    setError(null);

    try {
      console.log(`📥 Loading group swap history for group: ${groupId}, filter: ${activeFilter}, page: ${resetPage ? 0 : page}`);
      
      const result = await SwapRequestService.getGroupSwapRequests(groupId, {
        status: activeFilter === 'ALL' ? undefined : activeFilter,
        limit,
        offset: resetPage ? 0 : page * limit
      });
      
      if (result.success && isMounted.current) {
        const newRequests = result.data?.requests || [];
        const totalCount = result.data?.total || newRequests.length;
        
        if (resetPage) {
          setRequests(newRequests);
        } else {
          setRequests(prev => [...prev, ...newRequests]);
        }
        setTotal(totalCount);
        initialLoadDone.current = true;
        console.log(`✅ Loaded ${newRequests.length} swap requests`);
      } else if (isMounted.current) {
        setError(result.message || 'Failed to load swap history');
      }
    } catch (err: any) {
      console.error('❌ Error loading group swap history:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to load swap history');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const refreshRequests = useCallback(() => {
    setRefreshing(true);
    loadRequests(true);
  }, [activeFilter]);

  const handleRefresh = () => {
    refreshRequests();
  };

  const handleLoadMore = () => {
    if (!loading && !refreshing && requests.length < total) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadRequests(false);
    }
  };

  // Handle auth error
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
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError]);

  const renderFilterButton = (filter: FilterStatus, label: string) => (
    <TouchableOpacity
      key={filter}
      style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
      onPress={() => {
        setActiveFilter(filter);
        setPage(0);
      }}
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
    
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => navigation.navigate('SwapRequestDetails', { requestId: item.id })}
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
          {item.assignment?.task?.title || 'Task'}
        </Text>

        <View style={styles.peopleRow}>
          <View style={styles.person}>
            <LinearGradient colors={['#2b8a3e', '#1e6b2c']} style={styles.avatarSmall}>
              <Text style={styles.avatarText}>
                {item.requester?.fullName?.charAt(0) || '?'}
              </Text>
            </LinearGradient>
            <Text style={styles.personName} numberOfLines={1}>
              {item.requester?.fullName || 'Unknown'}
            </Text>
            <Text style={styles.personRole}>→</Text>
          </View>

          <View style={styles.person}>
            <LinearGradient colors={['#4F46E5', '#3730a3']} style={styles.avatarSmall}>
              <Text style={styles.avatarText}>
                {item.targetUser?.fullName?.charAt(0) || 
                 (item.targetUserId ? '?' : '🌐')}
              </Text>
            </LinearGradient>
            <Text style={styles.personName} numberOfLines={1}>
              {item.targetUser?.fullName || 
               (item.targetUserId ? 'Unknown' : 'Anyone')}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <MaterialCommunityIcons name="calendar" size={14} color="#868e96" />
          <Text style={styles.detailText}>
            {item.scope === 'day' ? item.selectedDay : 'Full Week'}
          </Text>
          <View style={styles.dot} />
          <MaterialCommunityIcons name="star" size={14} color="#e67700" />
          <Text style={styles.detailText}>{item.assignment?.points || 0} pts</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swap History</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading swap history...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swap History</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRequests(true)}>
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{groupName}</Text>
        <TouchableOpacity
          style={styles.filterIconButton}
          onPress={() => {
            setActiveFilter('ALL');
            setPage(0);
          }}
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
        data={requests}
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
          !loading ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconContainer}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={40} color="#2b8a3e" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Swap History</Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'ALL' 
                  ? 'No swap requests found for this group'
                  : `No ${activeFilter.toLowerCase()} swap requests found`}
              </Text>
              {activeFilter !== 'ALL' && (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => {
                    setActiveFilter('ALL');
                    setPage(0);
                  }}
                >
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.clearFilterGradient}
                  >
                    <Text style={styles.clearFilterText}>Clear Filter</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          loading && requests.length > 0 ? (
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
    flex: 1,
    textAlign: 'center',
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
    marginBottom: 12,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  personName: {
    fontSize: 12,
    color: '#495057',
    flex: 1,
  },
  personRole: {
    fontSize: 14,
    color: '#868e96',
    marginHorizontal: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  detailText: {
    fontSize: 12,
    color: '#495057',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ced4da',
    marginHorizontal: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fa5252',
    textAlign: 'center',
    marginBottom: 20,
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
    lineHeight: 20,
    marginBottom: 16,
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