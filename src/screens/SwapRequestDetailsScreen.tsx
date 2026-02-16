import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';

type SwapRequestDetailsRouteParams = {
  requestId: string;
};

export const SwapRequestDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: SwapRequestDetailsRouteParams }, 'params'>>();
  const { requestId } = route.params;
  
  const {
    acceptSwapRequest,
    rejectSwapRequest,
    cancelSwapRequest,
  } = useSwapRequests();
  
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    setLoading(true);
    try {
      const response = await SwapRequestService.getSwapRequestDetails(requestId);
      if (response.success) {
        setRequest(response.data);
      } else {
        setError(response.message || 'Failed to load request details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    const swapDescription = request?.scope === 'day' 
      ? `this swap for ${request.selectedDay}${request.selectedTimeSlot ? ` at ${request.selectedTimeSlot.startTime}` : ''}`
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
            setProcessing(true);
            const result = await acceptSwapRequest(requestId);
            setProcessing(false);
            if (result.success) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Swap Request',
      'Are you sure you want to reject this swap request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            const result = await rejectSwapRequest(requestId);
            setProcessing(false);
            if (result.success) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Swap Request',
      'Are you sure you want to cancel this swap request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            const result = await cancelSwapRequest(requestId);
            setProcessing(false);
            if (result.success) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (error || !request) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Request not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = SwapRequestService.getStatusColor(request.status);
  const statusLabel = SwapRequestService.getStatusLabel(request.status);
  const statusIcon = SwapRequestService.getStatusIcon(request.status);
  const isPending = request.status === 'PENDING';
  const isRequester = request.requestedBy === request.requester?.id;
  const canAccept = isPending && !isRequester && (!request.targetUserId || request.targetUserId === request.requester?.id);
  const canReject = isPending && (request.targetUserId === request.requester?.id || isRequester);
  const canCancel = isPending && isRequester;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Swap Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: `${statusColor}10` }]}>
          <View style={[styles.statusIconLarge, { backgroundColor: `${statusColor}20` }]}>
            <Ionicons name={statusIcon as any} size={32} color={statusColor} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: statusColor }]}>
              {statusLabel}
            </Text>
            <Text style={styles.statusDate}>
              Requested on {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* ✅ NEW: Swap Scope Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Swap Details</Text>
          <View style={styles.scopeCard}>
            <View style={styles.scopeHeader}>
              <View style={[styles.scopeIcon, { backgroundColor: request.scope === 'day' ? '#EEF2FF' : '#F3F4F6' }]}>
                <Ionicons 
                  name={request.scope === 'day' ? 'today' : 'calendar'} 
                  size={22} 
                  color={request.scope === 'day' ? '#4F46E5' : '#6B7280'} 
                />
              </View>
              <View style={styles.scopeTitleContainer}>
                <Text style={styles.scopeTitle}>
                  {request.scope === 'day' ? 'Specific Day Swap' : 'Full Week Swap'}
                </Text>
                <Text style={styles.scopeBadge}>
                  {request.scope === 'day' ? '📅 One day only' : '📆 Entire week'}
                </Text>
              </View>
            </View>
            
            {request.scope === 'day' && request.selectedDay && (
              <View style={styles.scopeDetails}>
                <View style={styles.scopeDetailRow}>
                  <Ionicons name="calendar" size={16} color="#4F46E5" />
                  <Text style={styles.scopeDetailLabel}>Day:</Text>
                  <Text style={styles.scopeDetailValue}>{request.selectedDay}</Text>
                </View>
                
                {request.selectedTimeSlot && (
                  <View style={styles.scopeDetailRow}>
                    <Ionicons name="time" size={16} color="#4F46E5" />
                    <Text style={styles.scopeDetailLabel}>Time Slot:</Text>
                    <Text style={styles.scopeDetailValue}>
                      {request.selectedTimeSlot.startTime} - {request.selectedTimeSlot.endTime}
                      {request.selectedTimeSlot.label ? ` (${request.selectedTimeSlot.label})` : ''}
                    </Text>
                  </View>
                )}
                
                <View style={styles.scopeNote}>
                  <Ionicons name="information-circle" size={16} color="#10B981" />
                  <Text style={styles.scopeNoteText}>
                    After {request.selectedDay}, assignments will automatically return to the original assignee.
                  </Text>
                </View>
              </View>
            )}
            
            {request.scope === 'week' && (
              <View style={styles.scopeDetails}>
                <Text style={styles.scopeDescription}>
                  This swap will transfer ALL assignments for the entire week to the acceptor.
                </Text>
                <View style={styles.scopeNote}>
                  <Ionicons name="information-circle" size={16} color="#F59E0B" />
                  <Text style={styles.scopeNoteText}>
                    Next week, the normal rotation will resume automatically.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Requester Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requested By</Text>
          <View style={styles.userCard}>
            <View style={styles.avatarLarge}>
              {request.requester?.avatarUrl ? (
                <Image source={{ uri: request.requester.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {request.requester?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{request.requester?.fullName || 'Unknown User'}</Text>
              <Text style={styles.userRole}>Requester</Text>
            </View>
          </View>
        </View>

        {/* Target User */}
        {request.targetUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requested To</Text>
            <View style={styles.userCard}>
              <View style={styles.avatarLarge}>
                {request.targetUser.avatarUrl ? (
                  <Image source={{ uri: request.targetUser.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {request.targetUser.fullName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{request.targetUser.fullName}</Text>
                <Text style={styles.userRole}>Target User</Text>
              </View>
            </View>
          </View>
        )}

        {/* Assignment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignment Details</Text>
          <View style={styles.assignmentCard}>
            <Text style={styles.taskTitle}>{request.assignment?.task?.title}</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={18} color="#6B7280" />
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(request.assignment?.dueDate).toLocaleDateString()}
              </Text>
            </View>

            {request.assignment?.timeSlot && (
              <View style={styles.detailRow}>
                <Ionicons name="time" size={18} color="#6B7280" />
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>
                  {request.assignment.timeSlot.startTime} - {request.assignment.timeSlot.endTime}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.detailLabel}>Points:</Text>
              <Text style={[styles.detailValue, styles.pointsValue]}>
                {request.assignment?.points || 0}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="person" size={18} color="#6B7280" />
              <Text style={styles.detailLabel}>Current Assignee:</Text>
              <Text style={styles.detailValue}>
                {request.assignment?.user?.fullName || 'Unknown'}
              </Text>
            </View>

            {/* ✅ Show task frequency */}
            {request.assignment?.task?.executionFrequency && (
              <View style={styles.detailRow}>
                <Ionicons name="repeat" size={18} color="#6B7280" />
                <Text style={styles.detailLabel}>Frequency:</Text>
                <Text style={styles.detailValue}>
                  {request.assignment.task.executionFrequency}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Reason */}
        {request.reason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Swap</Text>
            <View style={styles.reasonCard}>
              <Text style={styles.reasonText}>{request.reason}</Text>
            </View>
          </View>
        )}

        {/* Expiry */}
        {request.expiresAt && request.status === 'PENDING' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expiry</Text>
            <View style={styles.expiryCard}>
              <Ionicons name="hourglass" size={20} color="#F59E0B" />
              <Text style={styles.expiryText}>
                This request will expire on {new Date(request.expiresAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {isPending && (
        <View style={styles.footer}>
          {canAccept && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Accept Swap</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canReject && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="ban" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Cancel Request</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
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
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  scrollContent: {
    padding: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  // ✅ NEW: Scope Card Styles
  scopeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scopeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scopeTitleContainer: {
    flex: 1,
  },
  scopeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  scopeBadge: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  scopeDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    gap: 12,
  },
  scopeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scopeDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 70,
  },
  scopeDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  scopeDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  scopeNote: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  scopeNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  pointsValue: {
    color: '#F59E0B',
  },
  reasonCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  expiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  expiryText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});