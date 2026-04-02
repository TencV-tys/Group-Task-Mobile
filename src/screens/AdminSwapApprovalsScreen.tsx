// screens/AdminSwapApprovalsScreen.tsx - COMPLETE FIXED VERSION

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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService, SwapRequest } from '../services/SwapRequestService'; // ✅ Import SwapRequest type
import { ScreenWrapper } from '../components/ScreenWrapper';
import { TokenUtils } from '../utils/tokenUtils';

// ✅ Remove local interface and use imported one
// interface SwapRequest { ... } - DELETE THIS

export const AdminSwapApprovalsScreen = ({ navigation, route }: any) => {
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

  // Load user ID
  useEffect(() => {
    const loadUser = async () => {
      const user = await TokenUtils.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  // Load pending approvals when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (groupId) {
        loadPendingForAdmin(groupId);
      }
    }, [groupId, loadPendingForAdmin])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPendingForAdmin(groupId);
    setRefreshing(false);
  };

  const handleApprove = async (requestId: string) => {
    Alert.alert(
      'Approve Swap Request',
      'Are you sure you want to approve this swap request? The requester will be notified and can then share it with members.',
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
              Alert.alert('Success', 'Swap request approved');
              await loadPendingForAdmin(groupId);
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
      await loadPendingForAdmin(groupId);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const renderSwapRequest = ({ item }: { item: SwapRequest }) => {
    const isProcessing = processingId === item.id;
    const requesterName = item.requester?.fullName || 'Unknown';
    const taskTitle = item.assignment?.task?.title || 'Task';
    const points = item.assignment?.task?.points || 0;
    // ✅ Use targetUserId instead of targetUser for checking
    const targetName = item.targetUser?.fullName || (item.targetUserId ? 'Specific user' : 'Anyone');
    const currentAssignee = item.assignment?.user?.fullName || 'Unknown';

    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.requestCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.requesterInfo}>
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {requesterName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View>
              <Text style={styles.requesterName}>{requesterName}</Text>
              <Text style={styles.requestTime}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date'}
              </Text>
            </View>
          </View>
          <LinearGradient
            colors={['#fff3bf', '#ffec99']}
            style={styles.pendingBadge}
          >
            <MaterialCommunityIcons name="clock-outline" size={12} color="#e67700" />
            <Text style={styles.pendingBadgeText}>Awaiting Approval</Text>
          </LinearGradient>
        </View>

        <Text style={styles.taskTitle}>{taskTitle}</Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="swap-horizontal" size={14} color="#2b8a3e" />
            <Text style={styles.detailText}>
              {item.scope === 'day' ? `Swap for ${item.selectedDay}` : 'Swap entire week'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account" size={14} color="#868e96" />
            <Text style={styles.detailText}>
              Current: {currentAssignee}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account-switch" size={14} color="#4F46E5" />
            <Text style={styles.detailText}>
              Requested to: {targetName}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="star" size={14} color="#e67700" />
            <Text style={styles.detailText}>{points} pts</Text>
          </View>
        </View>

        {item.reason && (
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            style={styles.reasonContainer}
          >
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </LinearGradient>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
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
            style={[styles.actionButton, styles.rejectButton]}
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
      </LinearGradient>
    );
  };

  if (loading && !refreshing && pendingForAdmin.length === 0) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Approvals</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading pending approvals...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupName || 'Swap Approvals'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {totalPendingForAdmin > 0 && (
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={16} color="#2b8a3e" />
          <Text style={styles.infoText}>
            {totalPendingForAdmin} swap request{totalPendingForAdmin !== 1 ? 's' : ''} waiting for your approval
          </Text>
        </View>
      )}

      <FlatList
        data={pendingForAdmin}
        renderItem={renderSwapRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="check-circle" size={48} color="#2b8a3e" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Pending Approvals</Text>
            <Text style={styles.emptyText}>
              All swap requests have been processed. New requests will appear here.
            </Text>
          </View>
        }
      />

      {/* Rejection Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['white', '#f8f9fa']}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Reject Swap Request</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejection
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#adb5bd"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
    borderRadius: 20,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
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
    color: '#2b8a3e',
  },
  listContent: {
    padding: 16,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
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
    color: '#212529',
  },
  requestTime: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
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
    lineHeight: 18,
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
    borderColor: '#b2f2bb',
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: '#ffc9c9',
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
    borderColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 16,
  },
  reasonInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212529',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    borderColor: '#e9ecef',
  },
  modalCancelText: {
    fontSize: 14,
    color: '#868e96',
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