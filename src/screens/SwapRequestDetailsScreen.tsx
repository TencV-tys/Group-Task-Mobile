// src/screens/SwapRequestDetailsScreen.tsx - FULLY UPDATED with fixed header
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

type SwapRequestDetailsRouteParams = {
  requestId: string;
};

export const SwapRequestDetailsScreen = () => {
  const { theme, isDark } = useTheme();
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const {
    events: swapEvents,
    clearSwapResponded,
    clearSwapAccepted,
    clearSwapRejected,
    clearSwapCancelled,
    clearSwapExpired
  } = useRealtimeSwapRequests('', currentUserId || '');

  // ===== LOAD USER ID AND ROLE USING TOKENUTILS =====
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user) {
          setCurrentUserId(user.id);
          setUserRole(user.role);
          console.log('✅ Current user ID:', user.id, 'Role:', user.role);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadCurrentUser();
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
              navigation.goBack();
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if (notification.data?.swapRequestId === requestId) {
        loadRequestDetails();
      }
    },
    showAlerts: true
  });

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  // ========== HANDLE REAL-TIME EVENTS ==========
  useEffect(() => {
    if (swapEvents.swapResponded && swapEvents.swapResponded.swapRequestId === requestId) {
      loadRequestDetails();
      clearSwapResponded();
    }
  }, [swapEvents.swapResponded]);

  useEffect(() => {
    if (swapEvents.swapAccepted && swapEvents.swapAccepted.swapRequestId === requestId) {
      Alert.alert('✅ Swap Accepted', 'The swap request was accepted', [{ text: 'OK' }]);
      loadRequestDetails();
      clearSwapAccepted();
    }
  }, [swapEvents.swapAccepted]);

  useEffect(() => {
    if (swapEvents.swapRejected && swapEvents.swapRejected.swapRequestId === requestId) {
      Alert.alert('❌ Swap Rejected', 'The swap request was rejected', [{ text: 'OK' }]);
      loadRequestDetails();
      clearSwapRejected();
    }
  }, [swapEvents.swapRejected]);

  useEffect(() => {
    if (swapEvents.swapCancelled && swapEvents.swapCancelled.swapRequestId === requestId) {
      Alert.alert('✖️ Swap Cancelled', 'This swap request was cancelled', [{ text: 'OK' }]);
      loadRequestDetails();
      clearSwapCancelled();
    }
  }, [swapEvents.swapCancelled]);

  useEffect(() => {
    if (swapEvents.swapExpired && swapEvents.swapExpired.swapRequestId === requestId) {
      Alert.alert('⏰ Swap Expired', 'This swap request has expired', [{ text: 'OK' }]);
      loadRequestDetails();
      clearSwapExpired();
    }
  }, [swapEvents.swapExpired]);

 const loadRequestDetails = async () => {
  setLoading(true);
  try {
    console.log('📥 Loading swap request details:', requestId);
    
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) {
      setError('Authentication required. Please log in again.');
      setLoading(false);
      return;
    }
    
    const response = await SwapRequestService.getSwapRequestDetails(requestId);
    console.log('📦 Swap request response:', response);
    
    if (response.success) {
      setRequest(response.data);
    } else {
      if (response.message?.includes('404') || response.message?.includes('not found') || response.message?.includes('400')) {
        setError('This swap request is no longer available (may have been deleted or expired).');
      } else {
        setError(response.message || 'Failed to load request details');
      }
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
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Swap Request</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading request details...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !request) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Swap Request</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <LinearGradient
            colors={[theme.errorBg, theme.errorBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.errorIconContainer, { borderColor: theme.errorBorder }]}
          >
            <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          </LinearGradient>
          <Text style={[styles.errorText, { color: theme.error }]}>{error || 'Request not found'}</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goBackButtonGradient}
            >
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const statusColor = SwapRequestService.getStatusColor(request.status);
  const statusLabel = SwapRequestService.getStatusLabel(request.status);
  const statusIcon = SwapRequestService.getStatusIcon(request.status);
  const isPending = request.status === 'PENDING';
  
  // Permission logic
  const isRequester = request.requestedBy === currentUserId;
  const isTarget = request.targetUserId === currentUserId;
  const isOpenToAnyone = !request.targetUserId;
  
  // Admin can view but cannot act
  const canAccept = !isAdmin && isPending && !isRequester && (isTarget || isOpenToAnyone);
  const canReject = !isAdmin && isPending && !isRequester && (isTarget || isOpenToAnyone);
  const canCancel = !isAdmin && isPending && isRequester;

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header - Fixed layout with centered title */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Swap Request</Text>
        
        {isAdmin ? (
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.adminBadge}
          >
            <MaterialCommunityIcons name="shield-account" size={12} color="#fff" />
            <Text style={styles.adminBadgeText}>Admin View</Text>
          </LinearGradient>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              Admin View Only - You can see all swap request details but cannot accept, reject, or cancel.
            </Text>
          </LinearGradient>
        )}

        {/* Status Banner */}
        <LinearGradient
          colors={[statusColor + '10', statusColor + '05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statusBanner, { borderColor: theme.border }]}
        >
          <LinearGradient
            colors={[statusColor + '20', statusColor + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statusIconLarge, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name={statusIcon as any} size={32} color={statusColor} />
          </LinearGradient>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: statusColor }]}>
              {statusLabel}
            </Text>
            <Text style={[styles.statusDate, { color: theme.textMuted }]}>
              Requested on {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </LinearGradient>

        {/* Swap Scope Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Swap Details</Text>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.scopeCard, { borderColor: theme.border }]}
          >
            <View style={styles.scopeHeader}>
              <LinearGradient
                colors={request.scope === 'day' ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.scopeIcon, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons 
                  name={request.scope === 'day' ? 'calendar-today' : 'calendar-week'} 
                  size={22} 
                  color={request.scope === 'day' ? theme.primary : theme.textSecondary} 
                />
              </LinearGradient>
              <View style={styles.scopeTitleContainer}>
                <Text style={[styles.scopeTitle, { color: theme.text }]}>
                  {request.scope === 'day' ? 'Specific Day Swap' : 'Full Week Swap'}
                </Text>
                <Text style={[styles.scopeBadge, { color: theme.textMuted }]}>
                  {request.scope === 'day' ? '📅 One day only' : '📆 Entire week'}
                </Text>
              </View>
            </View>
            
            {request.scope === 'day' && request.selectedDay && (
              <View style={styles.scopeDetails}>
                <View style={[styles.scopeDetailRow, { backgroundColor: theme.bgSecondary }]}>
                  <MaterialCommunityIcons name="calendar" size={16} color={theme.primary} />
                  <Text style={[styles.scopeDetailLabel, { color: theme.textMuted }]}>Day:</Text>
                  <Text style={[styles.scopeDetailValue, { color: theme.text }]}>{request.selectedDay}</Text>
                </View>
                
                {request.selectedTimeSlot && (
                  <View style={[styles.scopeDetailRow, { backgroundColor: theme.bgSecondary }]}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={theme.primary} />
                    <Text style={[styles.scopeDetailLabel, { color: theme.textMuted }]}>Time Slot:</Text>
                    <Text style={[styles.scopeDetailValue, { color: theme.text }]}>
                      {request.selectedTimeSlot.startTime} - {request.selectedTimeSlot.endTime}
                      {request.selectedTimeSlot.label ? ` (${request.selectedTimeSlot.label})` : ''}
                    </Text>
                  </View>
                )}
                
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.scopeNote, { borderColor: theme.primaryBorder }]}
                >
                  <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
                  <Text style={[styles.scopeNoteText, { color: theme.primary }]}>
                    After {request.selectedDay}, assignments will automatically return to the original assignee.
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            {request.scope === 'week' && (
              <View style={styles.scopeDetails}>
                <Text style={[styles.scopeDescription, { backgroundColor: theme.bgSecondary, color: theme.textSecondary }]}>
                  This swap will transfer ALL assignments for the entire week to the acceptor.
                </Text>
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.scopeNote, { borderColor: theme.primaryBorder }]}
                >
                  <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
                  <Text style={[styles.scopeNoteText, { color: theme.primary }]}>
                    Next week, the normal rotation will resume automatically.
                  </Text>
                </LinearGradient>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Requester Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Requested By</Text>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.userCard, { borderColor: theme.border }]}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatarLarge, { borderColor: theme.card }]}
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
              <Text style={[styles.userName, { color: theme.text }]}>{request.requester?.fullName || 'Unknown User'}</Text>
              <Text style={[styles.userRole, { color: theme.textMuted }]}>Requester</Text>
              {isRequester && (
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Requested To</Text>
            <LinearGradient
              colors={[theme.card, theme.bgSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.userCard, { borderColor: theme.border }]}
            >
              <LinearGradient
                colors={['#4F46E5', '#3730a3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.avatarLarge, { borderColor: theme.card }]}
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
                <Text style={[styles.userName, { color: theme.text }]}>{request.targetUser.fullName}</Text>
                <Text style={[styles.userRole, { color: theme.textMuted }]}>Target User</Text>
                {request.targetUserId === currentUserId && (
                  <LinearGradient
                    colors={[theme.primary, theme.primaryDark]}
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Open To</Text>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.openToCard, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="account-group" size={24} color={theme.primary} />
              <Text style={[styles.openToText, { color: theme.primary }]}>Anyone in the group can accept</Text>
            </LinearGradient>
          </View>
        )}

        {/* Assignment Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Assignment Details</Text>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.assignmentCard, { borderColor: theme.border }]}
          >
            <Text style={[styles.taskTitle, { color: theme.text }]}>{request.assignment?.task?.title}</Text>
            
            <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="calendar" size={18} color={theme.textMuted} />
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Due Date:</Text>
              <Text style={[styles.detailValue, { color: theme.textSecondary }]}>
                {new Date(request.assignment?.dueDate).toLocaleDateString()}
              </Text>
            </View>

            {request.assignment?.timeSlot && (
              <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={theme.textMuted} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Time:</Text>
                <Text style={[styles.detailValue, { color: theme.textSecondary }]}>
                  {request.assignment.timeSlot.startTime} - {request.assignment.timeSlot.endTime}
                </Text>
              </View>
            )}

            <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="star" size={18} color={theme.primary} />
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Points:</Text>
              <Text style={[styles.detailValue, styles.pointsValue, { color: theme.primary }]}>
                {request.assignment?.points || 0}
              </Text>
            </View>

            <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="account" size={18} color={theme.textMuted} />
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Current Assignee:</Text>
              <Text style={[styles.detailValue, { color: theme.textSecondary }]}>
                {request.assignment?.user?.fullName || 'Unknown'}
              </Text>
            </View>

            {request.assignment?.task?.executionFrequency && (
              <View style={[styles.detailRow, { backgroundColor: theme.bgSecondary }]}>
                <MaterialCommunityIcons name="repeat" size={18} color={theme.textMuted} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Frequency:</Text>
                <Text style={[styles.detailValue, { color: theme.textSecondary }]}> 
                  {request.assignment.task.executionFrequency}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Reason */}
        {request.reason && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Reason for Swap</Text>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.reasonCard, { borderColor: theme.border }]}
            >
              <Text style={[styles.reasonText, { color: theme.textSecondary }]}>{request.reason}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Expiry */}
        {request.expiresAt && request.status === 'PENDING' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Expiry</Text>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.expiryCard, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="clock-outline" size={20} color={theme.primary} />
              <Text style={[styles.expiryText, { color: theme.primary }]}>
                This request will expire on {new Date(request.expiresAt).toLocaleString()}
              </Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons - Only show if user has permission and NOT admin */}
      {isPending && !isAdmin && (
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          {canAccept && (
            <TouchableOpacity
              style={[styles.actionButton]}
              onPress={handleAccept}
              disabled={processing}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
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
                colors={[theme.error, theme.error]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
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
                colors={[theme.textMuted, theme.textMuted]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancel Request</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Admin Read-Only Message */}
      {isPending && isAdmin && (
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.readOnlyFooter, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name="eye" size={20} color={theme.primary} />
            <Text style={[styles.readOnlyText, { color: theme.primary }]}>Admin View Only - Cannot modify swap requests</Text>
          </LinearGradient>
        </View>
      )}
    </ScreenWrapper>
  );
};

// Complete styles with fixed header
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
  headerSpacer: {
    width: 36,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  adminInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  adminInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  readOnlyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '500',
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
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
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
    color: '#fff',
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
  },
  statusIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scopeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
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
  },
  scopeTitleContainer: {
    flex: 1,
  },
  scopeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  scopeBadge: {
    fontSize: 12,
  },
  scopeDetails: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  scopeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
  },
  scopeDetailLabel: {
    fontSize: 13,
    width: 70,
  },
  scopeDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  scopeDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
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
  },
  scopeNoteText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  youBadgeText: {
    color: '#fff',
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
    borderStyle: 'dashed',
  },
  openToText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  assignmentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 13,
    marginLeft: 6,
    marginRight: 4,
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  pointsValue: {
    fontWeight: '700',
  },
  reasonCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
  },
  expiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  expiryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
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
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});