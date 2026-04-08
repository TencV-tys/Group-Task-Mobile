// screens/AdminSwapApprovalsScreen.tsx - WITH INFINITE SCROLL

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService, SwapRequest } from '../services/SwapRequestService';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { TokenUtils } from '../utils/tokenUtils';
import { useTheme } from '../context/ThemeContext';

type FilterType = 'pending' | 'accepted' | 'rejected';

const PAGE_SIZE = 20;

export const AdminSwapApprovalsScreen = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  const { groupId, groupName } = route.params;

  const {
    pendingForAdmin,
    loading,
    totalPendingForAdmin,
    loadPendingForAdmin,
    adminApproveSwapRequest,
    adminRejectSwapRequest,
  } = useSwapRequests();

  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending');
  const [acceptedRequests, setAcceptedRequests] = useState<SwapRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<SwapRequest[]>([]);
  const [loadingProcessed, setLoadingProcessed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [acceptedPage, setAcceptedPage] = useState(0);
  const [rejectedPage, setRejectedPage] = useState(0);
  const [hasMoreAccepted, setHasMoreAccepted] = useState(true);
  const [hasMoreRejected, setHasMoreRejected] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const user = await TokenUtils.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (groupId) {
        loadAllData();
      }
    }, [groupId])
  );

  const loadAllData = async () => {
    await Promise.all([
      loadPendingForAdmin(groupId),
      loadProcessedRequests(true)
    ]);
  };

  const loadProcessedRequests = async (reset = true) => {
    if (reset) {
      setLoadingProcessed(true);
      setAcceptedPage(0);
      setRejectedPage(0);
      setHasMoreAccepted(true);
      setHasMoreRejected(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const currentPage = reset ? 0 : (activeFilter === 'accepted' ? acceptedPage : rejectedPage);
      const offset = currentPage * PAGE_SIZE;
      
      const response = await SwapRequestService.getGroupSwapRequests(groupId, {
        limit: PAGE_SIZE,
        offset: offset
      });
      
      if (response.success && response.data?.requests) {
        const allRequests = response.data.requests;
        const accepted = allRequests.filter((req: SwapRequest) => req.adminApproved === true);
        const rejected = allRequests.filter((req: SwapRequest) => req.adminApproved === false);
        
        if (reset) {
          setAcceptedRequests(accepted);
          setRejectedRequests(rejected);
          setAcceptedPage(1);
          setRejectedPage(1);
          setHasMoreAccepted(accepted.length === PAGE_SIZE);
          setHasMoreRejected(rejected.length === PAGE_SIZE);
        } else {
          if (activeFilter === 'accepted') {
            setAcceptedRequests(prev => [...prev, ...accepted]);
            setAcceptedPage(prev => prev + 1);
            setHasMoreAccepted(accepted.length === PAGE_SIZE);
          } else if (activeFilter === 'rejected') {
            setRejectedRequests(prev => [...prev, ...rejected]);
            setRejectedPage(prev => prev + 1);
            setHasMoreRejected(rejected.length === PAGE_SIZE);
          }
        }
      }
    } catch (error) {
      console.error('Error loading processed requests:', error);
    } finally {
      setLoadingProcessed(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (activeFilter === 'accepted' && hasMoreAccepted && !loadingProcessed && !loadingMore) {
      loadProcessedRequests(false);
    } else if (activeFilter === 'rejected' && hasMoreRejected && !loadingProcessed && !loadingMore) {
      loadProcessedRequests(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleApprove = async (requestId: string) => {
    Alert.alert(
      'Approve Swap Request',
      'Approve this swap request? The requester will be notified and can then share it with members.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await adminApproveSwapRequest(requestId);
            setProcessingId(null);

            if (result.success) {
              Alert.alert('Success', 'Swap request approved. It is now available for members to accept.');
              await loadAllData();
            } else {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  };

  const openRejectModal = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!selectedRequestId || !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedRequestId);
    const result = await adminRejectSwapRequest(selectedRequestId, rejectionReason);
    setProcessingId(null);
    setRejectModalVisible(false);
    setRejectionReason('');
    setSelectedRequestId(null);

    if (result.success) {
      Alert.alert('Success', 'Swap request rejected');
      await loadAllData();
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleViewSwapHistory = () => {
    navigation.navigate('GroupSwapHistory', { groupId, groupName });
  };

  const getFilteredRequests = () => {
    if (activeFilter === 'pending') {
      return pendingForAdmin;
    } else if (activeFilter === 'accepted') {
      return acceptedRequests;
    } else {
      return rejectedRequests;
    }
  };

  const getFilterCount = (filter: FilterType) => {
    if (filter === 'pending') return totalPendingForAdmin;
    if (filter === 'accepted') return acceptedRequests.length;
    return rejectedRequests.length;
  };

  const renderFilterButton = (filter: FilterType, label: string, color: string) => {
    const count = getFilterCount(filter);
    const isActive = activeFilter === filter;
    
    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterButton,
          isActive && styles.filterButtonActive,
          { borderColor: theme.border }
        ]}
        onPress={() => setActiveFilter(filter)}
      >
        <LinearGradient
          colors={isActive ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.filterButtonGradient}
        >
          <MaterialCommunityIcons 
            name={filter === 'pending' ? 'clock-outline' : filter === 'accepted' ? 'check-circle' : 'close-circle'} 
            size={14} 
            color={isActive ? '#fff' : color} 
          />
          <Text
            style={[
              styles.filterButtonText,
              isActive && styles.filterButtonTextActive,
              { color: isActive ? '#fff' : color }
            ]}
          >
            {label} ({count})
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderSwapRequest = ({ item }: { item: SwapRequest }) => {
    const isProcessing = processingId === item.id;
    const requesterName = item.requester?.fullName || 'Unknown';
    const taskTitle = item.assignment?.task?.title || 'Task';
    const points = item.assignment?.task?.points || 0;
    const targetName = item.targetUser?.fullName || (item.targetUserId ? 'Specific user' : 'Anyone');
    const currentAssignee = item.assignment?.user?.fullName || 'Unknown';
    
    const isAccepted = item.adminApproved === true;
    const isRejected = item.adminApproved === false;
    const statusColor = isAccepted ? '#10B981' : isRejected ? '#EF4444' : '#F59E0B';
    const statusIcon = isAccepted ? 'check-circle' : isRejected ? 'close-circle' : 'clock-outline';
    const statusLabel = isAccepted ? 'Approved' : isRejected ? 'Rejected' : 'Pending Approval';
    
    const memberAccepted = item.status === 'ACCEPTED';
    const waitingForMember = isAccepted && !memberAccepted;

    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.requestCard, { borderColor: theme.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.requesterInfo}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {requesterName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View>
              <Text style={[styles.requesterName, { color: theme.text }]}>{requesterName}</Text>
              <Text style={[styles.requestTime, { color: theme.textMuted }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date'}
              </Text>
            </View>
          </View>
          <LinearGradient
            colors={[`${statusColor}20`, `${statusColor}10`]}
            style={[styles.statusBadge, { borderColor: statusColor }]}
          >
            <MaterialCommunityIcons name={statusIcon as any} size={12} color={statusColor} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </LinearGradient>
        </View>

        <Text style={[styles.taskTitle, { color: theme.text }]}>{taskTitle}</Text>

        <View style={styles.detailsContainer}>
          <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={theme.primary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.scope === 'day' ? `Swap for ${item.selectedDay}` : 'Swap entire week'}
            </Text>
          </View>

          <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="account" size={14} color={theme.textMuted} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              Current: {currentAssignee}
            </Text>
          </View>

          <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="account-switch" size={14} color="#4F46E5" />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              Requested to: {targetName}
            </Text>
          </View>

          {waitingForMember && (
            <View style={[styles.detailRow, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="clock" size={14} color={theme.primary} />
              <Text style={[styles.detailText, { color: theme.primary }]}>
                Waiting for member to accept
              </Text>
            </View>
          )}

          {memberAccepted && isAccepted && (
            <View style={[styles.detailRow, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                Member accepted this swap
              </Text>
            </View>
          )}

          <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="star" size={14} color="#e67700" />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>{points} pts</Text>
          </View>
        </View>

        {item.reason && (
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            style={styles.reasonContainer}
          >
            <Text style={[styles.reasonLabel, { color: theme.textMuted }]}>Reason:</Text>
            <Text style={[styles.reasonText, { color: theme.text }]}>{item.reason}</Text>
          </LinearGradient>
        )}

        {item.adminRejectionReason && isRejected && (
          <LinearGradient
            colors={[theme.errorBg, theme.errorBg]}
            style={[styles.rejectionContainer, { borderColor: theme.errorBorder }]}
          >
            <MaterialCommunityIcons name="alert-circle" size={14} color={theme.error} />
            <View style={styles.rejectionContent}>
              <Text style={[styles.rejectionLabel, { color: theme.error }]}>Rejection Reason:</Text>
              <Text style={[styles.rejectionText, { color: theme.textSecondary }]}>{item.adminRejectionReason}</Text>
            </View>
          </LinearGradient>
        )}

        {item.adminNotes && isAccepted && (
          <LinearGradient
            colors={[theme.primaryLight, theme.primaryLight]}
            style={[styles.adminNotesContainer, { borderColor: theme.primaryBorder }]}
          >
            <MaterialCommunityIcons name="note-text" size={14} color={theme.primary} />
            <Text style={[styles.adminNotesText, { color: theme.primary }]}>{item.adminNotes}</Text>
          </LinearGradient>
        )}

        {activeFilter === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton, { borderColor: theme.primaryBorder }]}
              onPress={() => handleApprove(item.id)}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton, { borderColor: theme.errorBorder ?? '#ffc9c9' }]}
              onPress={() => openRejectModal(item.id)}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={['#fa5252', '#e03131']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="close" size={18} color="white" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        
        {(isAccepted || isRejected) && (
          <TouchableOpacity
            style={[styles.viewDetailsButton, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('SwapRequestDetails', { requestId: item.id })}
          >
            <Text style={[styles.viewDetailsText, { color: theme.primary }]}>View Details</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  };

  const renderFooter = () => {
    if (activeFilter === 'pending') return null;
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.footerLoaderText, { color: theme.textMuted }]}>Loading more...</Text>
      </View>
    );
  };

  const isLoading = () => {
    if (activeFilter === 'pending') {
      return loading && !refreshing && pendingForAdmin.length === 0;
    } else {
      return loadingProcessed && !refreshing && getFilteredRequests().length === 0;
    }
  };

  if (isLoading()) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Swap Approvals</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const filteredRequests = getFilteredRequests();
  const showEmptyMessage = filteredRequests.length === 0 && !refreshing;

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{groupName || 'Swap Approvals'}</Text>
        
        <TouchableOpacity
          onPress={handleViewSwapHistory}
          style={[styles.historyButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="history" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {renderFilterButton('pending', 'Pending', theme.primary)}
        {renderFilterButton('accepted', 'Approved', '#10B981')}
        {renderFilterButton('rejected', 'Rejected', '#EF4444')}
      </ScrollView>

      {activeFilter === 'pending' && totalPendingForAdmin > 0 && (
        <View style={[styles.infoBanner, { backgroundColor: theme.primaryLight }]}>
          <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.primary }]}>
            {totalPendingForAdmin} swap request{totalPendingForAdmin !== 1 ? 's' : ''} waiting for your approval
          </Text>
        </View>
      )}

      <FlatList
        data={filteredRequests}
        renderItem={renderSwapRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          showEmptyMessage ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                style={[styles.emptyIconContainer, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons 
                  name={activeFilter === 'pending' ? 'clock-outline' : activeFilter === 'accepted' ? 'check-circle' : 'close-circle'} 
                  size={48} 
                  color={activeFilter === 'pending' ? theme.primary : activeFilter === 'accepted' ? '#10B981' : '#EF4444'} 
                />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No {activeFilter} requests
              </Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {activeFilter === 'pending' 
                  ? 'All swap requests have been processed.'
                  : activeFilter === 'accepted'
                    ? 'No swap requests have been approved by admin yet.'
                    : 'No swap requests have been rejected by admin yet.'}
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            style={[styles.modalContent, { borderColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reject Swap Request</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Please provide a reason for rejection
            </Text>
            <TextInput
              style={[styles.reasonInput, {
                backgroundColor: theme.bgSecondary,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={theme.textPlaceholder ?? theme.textMuted}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleReject}
              >
                <LinearGradient
                  colors={['#fa5252', '#e03131']}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>Reject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  filterContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  filterButtonActive: {
    borderWidth: 2,
  },
  filterButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterButtonTextActive: {},
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 20,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  requesterName: {
    fontSize: 14,
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
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  detailText: {
    fontSize: 12,
  },
  reasonContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  rejectionContent: {
    flex: 1,
  },
  rejectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 12,
    lineHeight: 16,
  },
  adminNotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
  },
  adminNotesText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  approveButton: {
    borderWidth: 1,
  },
  rejectButton: {
    borderWidth: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  reasonInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminSwapApprovalsScreen;