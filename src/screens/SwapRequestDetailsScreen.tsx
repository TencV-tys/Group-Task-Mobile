// src/screens/SwapRequestDetailsScreen.tsx - COMPLETELY FIXED with LinearGradient and colors
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import * as SecureStore from 'expo-secure-store';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadRequestDetails();
  }, [requestId]);

  const loadCurrentUser = async () => {
    try {
      // Try to get user from SecureStore
      let userStr = await SecureStore.getItemAsync('user');
      if (!userStr) {
        userStr = await SecureStore.getItemAsync('userData');
      }
      
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id || user._id);
        console.log('✅ Current user ID:', user.id || user._id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadRequestDetails = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading swap request details:', requestId);
      
      // Check token first
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      const response = await SwapRequestService.getSwapRequestDetails(requestId);
      console.log('📦 Swap request response:', response);
      
      if (response.success) {
        setRequest(response.data);
      } else {
        setError(response.message || 'Failed to load request details');
      }
    } catch (err: any) {
      console.error('❌ Error loading request:', err);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swap Request</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swap Request</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <LinearGradient
            colors={['#fff5f5', '#ffe3e3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.errorIconContainer}
          >
            <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          </LinearGradient>
          <Text style={styles.errorText}>{error || 'Request not found'}</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goBackButtonGradient}
            >
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = SwapRequestService.getStatusColor(request.status);
  const statusLabel = SwapRequestService.getStatusLabel(request.status);
  const statusIcon = SwapRequestService.getStatusIcon(request.status);
  const isPending = request.status === 'PENDING';
  
  // ✅ CORRECT PERMISSION LOGIC
  const isRequester = request.requestedBy === currentUserId;
  const isTarget = request.targetUserId === currentUserId;
  const isOpenToAnyone = !request.targetUserId;
  
  // Who can do what:
  const canAccept = isPending && !isRequester && (isTarget || isOpenToAnyone);
  const canReject = isPending && !isRequester && (isTarget || isOpenToAnyone);
  const canCancel = isPending && isRequester;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Swap Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <LinearGradient
          colors={[`${statusColor}10`, `${statusColor}05`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusBanner}
        >
          <LinearGradient
            colors={[`${statusColor}20`, `${statusColor}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusIconLarge}
          >
            <MaterialCommunityIcons name={statusIcon as any} size={32} color={statusColor} />
          </LinearGradient>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: statusColor }]}>
              {statusLabel}
            </Text>
            <Text style={styles.statusDate}>
              Requested on {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </LinearGradient>

        {/* Swap Scope Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Swap Details</Text>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scopeCard}
          >
            <View style={styles.scopeHeader}>
              <LinearGradient
                colors={request.scope === 'day' ? ['#e8f5e9', '#c8e6c9'] : ['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scopeIcon}
              >
                <MaterialCommunityIcons 
                  name={request.scope === 'day' ? 'calendar-today' : 'calendar-week'} 
                  size={22} 
                  color={request.scope === 'day' ? '#2b8a3e' : '#495057'} 
                />
              </LinearGradient>
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
                  <MaterialCommunityIcons name="calendar" size={16} color="#2b8a3e" />
                  <Text style={styles.scopeDetailLabel}>Day:</Text>
                  <Text style={styles.scopeDetailValue}>{request.selectedDay}</Text>
                </View>
                
                {request.selectedTimeSlot && (
                  <View style={styles.scopeDetailRow}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#2b8a3e" />
                    <Text style={styles.scopeDetailLabel}>Time Slot:</Text>
                    <Text style={styles.scopeDetailValue}>
                      {request.selectedTimeSlot.startTime} - {request.selectedTimeSlot.endTime}
                      {request.selectedTimeSlot.label ? ` (${request.selectedTimeSlot.label})` : ''}
                    </Text>
                  </View>
                )}
                
                <LinearGradient
                  colors={['#e8f5e9', '#c8e6c9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scopeNote}
                >
                  <MaterialCommunityIcons name="information" size={16} color="#2b8a3e" />
                  <Text style={styles.scopeNoteText}>
                    After {request.selectedDay}, assignments will automatically return to the original assignee.
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            {request.scope === 'week' && (
              <View style={styles.scopeDetails}>
                <Text style={styles.scopeDescription}>
                  This swap will transfer ALL assignments for the entire week to the acceptor.
                </Text>
                <LinearGradient
                  colors={['#fff3bf', '#ffec99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scopeNote}
                >
                  <MaterialCommunityIcons name="information" size={16} color="#e67700" />
                  <Text style={[styles.scopeNoteText, { color: '#e67700' }]}>
                    Next week, the normal rotation will resume automatically.
                  </Text>
                </LinearGradient>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Requester Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requested By</Text>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userCard}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarLarge}
            >
              {request.requester?.avatarUrl ? (
                <Image source={{ uri: request.requester.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {request.requester?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </LinearGradient>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{request.requester?.fullName || 'Unknown User'}</Text>
              <Text style={styles.userRole}>Requester</Text>
              {isRequester && (
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.youBadge}
                >
                  <Text style={styles.youBadgeText}>You</Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Target User */}
        {request.targetUser ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requested To</Text>
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userCard}
            >
              <LinearGradient
                colors={['#4F46E5', '#3730a3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarLarge}
              >
                {request.targetUser.avatarUrl ? (
                  <Image source={{ uri: request.targetUser.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {request.targetUser.fullName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </LinearGradient>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{request.targetUser.fullName}</Text>
                <Text style={styles.userRole}>Target User</Text>
                {request.targetUserId === currentUserId && (
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.youBadge}
                  >
                    <Text style={styles.youBadgeText}>You</Text>
                  </LinearGradient>
                )}
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Open To</Text>
            <LinearGradient
              colors={['#e8f5e9', '#c8e6c9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.openToCard}
            >
              <MaterialCommunityIcons name="account-group" size={24} color="#2b8a3e" />
              <Text style={styles.openToText}>Anyone in the group can accept</Text>
            </LinearGradient>
          </View>
        )}

        {/* Assignment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignment Details</Text>
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assignmentCard}
          >
            <Text style={styles.taskTitle}>{request.assignment?.task?.title}</Text>
            
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={18} color="#868e96" />
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(request.assignment?.dueDate).toLocaleDateString()}
              </Text>
            </View>

            {request.assignment?.timeSlot && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#868e96" />
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>
                  {request.assignment.timeSlot.startTime} - {request.assignment.timeSlot.endTime}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="star" size={18} color="#e67700" />
              <Text style={styles.detailLabel}>Points:</Text>
              <Text style={[styles.detailValue, styles.pointsValue]}>
                {request.assignment?.points || 0}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={18} color="#868e96" />
              <Text style={styles.detailLabel}>Current Assignee:</Text>
              <Text style={styles.detailValue}>
                {request.assignment?.user?.fullName || 'Unknown'}
              </Text>
            </View>

            {request.assignment?.task?.executionFrequency && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="repeat" size={18} color="#868e96" />
                <Text style={styles.detailLabel}>Frequency:</Text>
                <Text style={styles.detailValue}> 
                  {request.assignment.task.executionFrequency}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Reason */}
        {request.reason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Swap</Text>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reasonCard}
            >
              <Text style={styles.reasonText}>{request.reason}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Expiry */}
        {request.expiresAt && request.status === 'PENDING' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expiry</Text>
            <LinearGradient
              colors={['#fff3bf', '#ffec99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.expiryCard}
            >
              <MaterialCommunityIcons name="clock-outline" size={20} color="#e67700" />
              <Text style={styles.expiryText}>
                This request will expire on {new Date(request.expiresAt).toLocaleString()}
              </Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons - Only show if user has permission */}
      {isPending && (
        <View style={styles.footer}>
          {canAccept && (
            <TouchableOpacity
              style={[styles.actionButton]}
              onPress={handleAccept}
              disabled={processing}
            >
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Accept Swap</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {canReject && (
            <TouchableOpacity
              style={[styles.actionButton]}
              onPress={handleReject}
              disabled={processing}
            >
              <LinearGradient
                colors={['#fa5252', '#e03131']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton]}
              onPress={handleCancel}
              disabled={processing}
            >
              <LinearGradient
                colors={['#868e96', '#495057']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Cancel Request</Text>
                  </>
                )}
              </LinearGradient>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fa5252',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  goBackButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 13,
    color: '#868e96',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scopeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scopeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scopeTitleContainer: {
    flex: 1,
  },
  scopeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  scopeBadge: {
    fontSize: 12,
    color: '#868e96',
  },
  scopeDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    gap: 8,
  },
  scopeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
  },
  scopeDetailLabel: {
    fontSize: 13,
    color: '#868e96',
    width: 70,
  },
  scopeDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#212529',
    flex: 1,
  },
  scopeDescription: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 18,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  scopeNote: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scopeNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#495057',
    fontStyle: 'italic',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: '#868e96',
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  youBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  openToCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: '#2b8a3e',
    borderStyle: 'dashed',
  },
  openToText: {
    fontSize: 14,
    color: '#2b8a3e',
    fontWeight: '600',
    flex: 1,
  },
  assignmentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#868e96',
    marginLeft: 6,
    marginRight: 4,
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
    flex: 1,
  },
  pointsValue: {
    color: '#e67700',
    fontWeight: '700',
  },
  reasonCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reasonText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  expiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ffec99',
  },
  expiryText: {
    flex: 1,
    fontSize: 13,
    color: '#e67700',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});