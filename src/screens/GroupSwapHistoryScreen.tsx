// src/screens/GroupSwapHistoryScreen.tsx - Dark Mode Added

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
import { TokenUtils } from '../utils/tokenUtils';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

type FilterStatus = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export const GroupSwapHistoryScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const limit = 20;
   
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

  // ===== GET USER ID AND ROLE ON MOUNT =====
  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user) {
          setCurrentUserId(user.id);
          setUserRole(user.role);
          console.log('✅ User role:', user.role);
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    };
    getUserData();
    
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
        swapEvents.swapExpired ||
        swapEvents.swapPendingApproval ||
        swapEvents.swapAdminAction) {
      console.log('🔄 Swap event detected, refreshing group swap history...');
      refreshRequests();
    }
  }, [
    swapEvents.swapCreated,
    swapEvents.swapResponded,
    swapEvents.swapAccepted,
    swapEvents.swapRejected,
    swapEvents.swapCancelled,
    swapEvents.swapExpired,
    swapEvents.swapPendingApproval,
    swapEvents.swapAdminAction
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
        'SWAP_ADMIN_NOTIFICATION',
        'SWAP_PENDING_APPROVAL',
        'SWAP_ADMIN_APPROVED',
        'SWAP_ADMIN_REJECTED'
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

  // ===== TOKEN CHECK =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

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
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  // Filter changed handler
  useEffect(() => {
    if (initialLoadDone.current) {
      console.log(`🎯 Filter changed to: ${activeFilter}, reloading...`);
      loadRequests(true);
    }
  }, [activeFilter]);

  // Load requests with current filter
  const loadRequests = useCallback(async (resetPage = true) => {
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
      const statusParam = activeFilter === 'ALL' ? undefined : activeFilter;
      
      console.log(`📥 Loading group swap history for group: ${groupId}, filter: ${statusParam || 'ALL'}, page: ${resetPage ? 0 : page}`);
      
      const result = await SwapRequestService.getGroupSwapRequests(groupId, {
        status: statusParam,
        limit,
        offset: resetPage ? 0 : page * limit
      });
      
      console.log('🔍 API Response:', JSON.stringify(result, null, 2));
      
      if (result.success && isMounted.current) {
        const newRequests = result.data?.requests || [];
        const totalCount = result.data?.total || newRequests.length;
        
        console.log(`✅ Received ${newRequests.length} requests (filtered by: ${statusParam || 'ALL'})`);
        console.log(`✅ Request statuses:`, newRequests.map((r: any) => r.status));
        
        if (resetPage) {
          setRequests(newRequests);
        } else {
          setRequests(prev => [...prev, ...newRequests]);
        }
        setTotal(totalCount);
        initialLoadDone.current = true;
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
  }, [groupId, activeFilter, checkToken, limit]);

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

  const handleGoToApprovals = () => {
    navigation.navigate('AdminSwapApprovals', { groupId, groupName });
  };

  const renderFilterButton = (filter: FilterStatus, label: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        activeFilter === filter && styles.filterButtonActive,
        { borderColor: theme.border }
      ]}
      onPress={() => {
        setActiveFilter(filter);
        setPage(0);
      }}
    >
      <LinearGradient
        colors={activeFilter === filter ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.filterButtonGradient}
      >
        <Text
          style={[
            styles.filterButtonText,
            activeFilter === filter && styles.filterButtonTextActive,
            { color: activeFilter === filter ? '#fff' : theme.textSecondary }
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
    
    const isPendingAdminApproval = item.requiresAdminApproval && item.adminApproved === null;
    
    return (
      <TouchableOpacity
        style={[styles.requestCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}
        onPress={() => navigation.navigate('SwapRequestDetails', { requestId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
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
          <Text style={[styles.dateText, { color: theme.textMuted }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={1}>
          {item.assignment?.task?.title || 'Task'}
        </Text>

        {isPendingAdminApproval && (
          <LinearGradient
            colors={[theme.primaryLight, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.adminPendingBadge, { borderColor: theme.primaryBorder }]}
          >
            <MaterialCommunityIcons name="clock-outline" size={12} color={theme.primary} />
            <Text style={[styles.adminPendingText, { color: theme.primary }]}>Awaiting Admin Approval</Text>
          </LinearGradient>
        )}

        <View style={[styles.peopleRow, { backgroundColor: theme.bgSecondary }]}>
          <View style={styles.person}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.avatarSmall}>
              <Text style={styles.avatarText}>
                {item.requester?.fullName?.charAt(0) || '?'}
              </Text>
            </LinearGradient>
            <Text style={[styles.personName, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.requester?.fullName || 'Unknown'}
            </Text>
            <Text style={[styles.personRole, { color: theme.textMuted }]}>→</Text>
          </View>

          <View style={styles.person}>
            <LinearGradient colors={['#4F46E5', '#3730a3']} style={styles.avatarSmall}>
              <Text style={styles.avatarText}>
                {item.targetUser?.fullName?.charAt(0) || 
                 (item.targetUserId ? '?' : '🌐')}
              </Text>
            </LinearGradient>
            <Text style={[styles.personName, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.targetUser?.fullName || 
               (item.targetUserId ? 'Unknown' : 'Anyone')}
            </Text>
          </View>
        </View>

        <View style={[styles.detailsRow, { backgroundColor: theme.bgSecondary }]}>
          <MaterialCommunityIcons name="calendar" size={14} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {item.scope === 'day' ? item.selectedDay : 'Full Week'}
          </Text>
          <View style={[styles.dot, { backgroundColor: theme.border }]} />
          <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.assignment?.points || 0} pts</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isAdmin = userRole === 'ADMIN';

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Swap History</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading swap history...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Swap History</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRequests(true)}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
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
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{groupName}</Text>
        <TouchableOpacity
          style={[styles.filterIconButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
          onPress={() => {
            setActiveFilter('ALL');
            setPage(0);
          }}
        >
          <MaterialCommunityIcons name="filter" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Admin Banner with button to approvals */}
      {isAdmin && (
        <TouchableOpacity onPress={handleGoToApprovals} activeOpacity={0.9}>
          <LinearGradient
            colors={[theme.primaryLight, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.adminBanner, { borderColor: theme.primaryBorder }]}
          >
            <View style={styles.adminBannerContent}>
              <MaterialCommunityIcons name="swap-horizontal" size={22} color={theme.primary} />
              <View style={styles.adminBannerTextContainer}>
                <Text style={[styles.adminBannerTitle, { color: theme.primary }]}>Pending Approvals</Text>
                <Text style={[styles.adminBannerSubtitle, { color: theme.textSecondary }]}>
                  Review and manage swap requests that need your approval
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.primary} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
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
            colors={[theme.primary]}
            tintColor={theme.primary}
            progressBackgroundColor={theme.bgSecondary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.emptyIconContainer, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={40} color={theme.primary} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Swap History</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
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
                    colors={[theme.primary, theme.primaryDark]}
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
            <ActivityIndicator style={styles.loader} color={theme.primary} />
          ) : null
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  filterIconButton: {
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
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  adminBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  adminBannerTextContainer: {
    flex: 1,
  },
  adminBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminBannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  adminPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 4,
    borderWidth: 1,
  },
  adminPendingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterButton: {
    borderRadius: 20,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  filterButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButtonActive: {
    borderWidth: 2,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterButtonTextActive: {},
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
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  personName: {
    fontSize: 12,
    flex: 1,
  },
  personRole: {
    fontSize: 14,
    marginHorizontal: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  detailText: {
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
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
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
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
    color: '#fff',
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
    marginBottom: 16,
  },
  clearFilterButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  clearFilterGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loader: {
    marginVertical: 20,
  },
});