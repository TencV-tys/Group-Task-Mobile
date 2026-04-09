// src/screens/AssignmentDetailsScreen.tsx - WITH DEBUG LOGS

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,   
  ActivityIndicator, 
  Alert,
  StatusBar,
  Modal,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { MaterialCommunityIcons } from '@expo/vector-icons'; 

import { useAssignmentDetails } from '../hooks/useAssignmentDetails';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { makeAssignmentDetailsStyles } from '../styles/assignmentDetails.styles';
import { getFullImageUrl } from '../utils/imageUrl';
import { formatUTCDate, formatUTCDayAndDate, getUTCRelativeTime } from '../utils/timeUtils';

const { width, height } = Dimensions.get('window');

export default function AssignmentDetailsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const styles = makeAssignmentDetailsStyles(theme);
  const { assignmentId, isAdmin: isAdminProp = false, onVerified } = route.params || {};
  
  // ===== HOOKS - ALL LOGIC IS HERE =====
  const {
    // State
    loading,
    verifying,
    assignment,
    error,
    adminNotes,
    verificationStatus,
    timeLeft,
    isSubmittable, 
    submissionStatus, 
    isLate,
    penaltyInfo,
    authError,
    isTaskDeleted,
    deletedTaskTitle,
    
    // Admin/Owner flags
    isAdmin,
    isOwner,
    
    // Setters
    setAdminNotes,
    
    // Data
    hasPendingRequest,
    pendingRequest,
    
    // Photo modal
    photoModalVisible,
    selectedPhotoUrl,
    closePhotoModal,
    
    // Helper functions
    getStatusColor,
    getStatusIcon,
    getStatusText,
    getTimeDifference,
    getSubmissionStatusInfo,
    formatTimeLeft,
    
    // Actions
    fetchAssignmentDetails,
    handleCompleteAssignment,
    handleRequestSwap,
    handleVerify,
    handleViewPhoto,
    clearAuthError
  } = useAssignmentDetails(assignmentId, isAdminProp, onVerified);

  // ===== DEBUG LOGS =====
  useEffect(() => {
    if (assignment) {
      console.log('\n🔍🔍🔍 [AssignmentDetailsScreen] DEBUG 🔍🔍🔍');
      console.log('📋 Assignment ID:', assignment.id);
      console.log('📅 Raw dueDate from API:', assignment.dueDate);
      console.log('📅 formattedUTCDate result:', formatUTCDate(assignment.dueDate));
      console.log('📅 formatUTCDayAndDate result:', formatUTCDayAndDate(assignment.dueDate));
      console.log('📅 getUTCRelativeTime result:', getUTCRelativeTime(assignment.dueDate));
      console.log('📅 New Date object:', new Date(assignment.dueDate));
      console.log('📅 UTC string:', new Date(assignment.dueDate).toUTCString());
      console.log('📅 Local string:', new Date(assignment.dueDate).toLocaleString());
      console.log('📅 Assignment Day:', assignment.assignmentDay);
      console.log('👤 Owner:', assignment.user?.fullName);
      console.log('🔍🔍🔍 END DEBUG 🔍🔍🔍\n');
    }
  }, [assignment]);

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
              clearAuthError();
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation, clearAuthError]);

  // ===== RENDER HEADER =====
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
      </TouchableOpacity>
      
      <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
        Assignment Details
      </Text>
      
      {isAdmin && (
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.adminBadge}
        >
          <MaterialCommunityIcons name="shield-account" size={12} color="#fff" />
          <Text style={styles.adminBadgeText}>Admin View</Text>
        </LinearGradient>
      )}
    </View>
  );

  // ===== RENDER PHOTO MODAL =====
  const renderPhotoModal = () => (
    <Modal
      visible={photoModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closePhotoModal}
    >
      <TouchableOpacity
        style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
        activeOpacity={1}
        onPress={closePhotoModal}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={closePhotoModal}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {selectedPhotoUrl && (
            <Image
              source={{ uri: selectedPhotoUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ===== RENDER COMPLETE BUTTON (ONLY FOR OWNER) =====
  const renderCompleteButton = () => {
    if (!isOwner) return null;
    if (assignment?.completed) return null;
    
    const submissionStatusInfo = getSubmissionStatusInfo();
    
    return ( 
      <View style={styles.completeSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Complete This Assignment</Text>
        
        <LinearGradient
          colors={[submissionStatusInfo.bgColor, submissionStatusInfo.bgColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.submissionStatusCard, { borderColor: submissionStatusInfo.borderColor }]}
        >
          <View style={styles.submissionStatusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: submissionStatusInfo.color + '20' }]}>
              <MaterialCommunityIcons 
                name={submissionStatusInfo.icon as any} 
                size={22} 
                color={submissionStatusInfo.color} 
              />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={[styles.submissionStatusLabel, { color: submissionStatusInfo.color }]}>
                {submissionStatusInfo.label}
              </Text>
              <Text style={[styles.submissionStatusDescription, { color: submissionStatusInfo.color }]}>
                {submissionStatusInfo.description}
              </Text>
            </View>
          </View>
          
          {assignment?.timeSlot && submissionStatus === 'available' && (
            <View style={[styles.timeWindowInfo, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
              <Text style={[styles.timeWindowText, { color: theme.textMuted }]}>
                Submit within time window for full points
              </Text>
            </View>
          )}
          
          {isLate && penaltyInfo && (
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.penaltyInfo, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="alert" size={16} color={theme.primary} />
              <Text style={[styles.penaltyText, { color: theme.primary }]}>
                Points: {penaltyInfo.finalPoints} / {penaltyInfo.originalPoints} 
                (Penalty: -{penaltyInfo.penaltyAmount})
              </Text>
            </LinearGradient>
          )}
          
          {submissionStatus === 'available' && timeLeft !== null && (
            <View style={styles.timerContainer}>
              <LinearGradient
                colors={timeLeft < 300 ? [theme.errorBg, theme.errorBg] : isLate ? [theme.primaryLight, theme.primaryLight] : [theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.timerBadge, 
                  timeLeft < 300 && styles.urgentTimerBadge,
                  isLate && styles.lateTimerBadge
                ]}
              >
                <MaterialCommunityIcons 
                  name={timeLeft < 300 ? "timer-alert" : isLate ? "timer-alert" : "timer"} 
                  size={16} 
                  color={timeLeft < 300 ? theme.error : isLate ? theme.primary : theme.primary} 
                />
                <Text style={[styles.timerText, { color: timeLeft < 300 ? theme.error : isLate ? theme.primary : theme.primary }]}>
                  {formatTimeLeft(timeLeft)} remaining
                </Text>
              </LinearGradient>
              {timeLeft < 300 && (
                <Text style={[styles.urgentMessage, { color: theme.error }]}>Hurry! Grace period ending soon.</Text>
              )}
            </View>
          )}
          
          {submissionStatus === 'waiting' && timeLeft !== null && timeLeft > 0 && (
            <View style={styles.waitingContainer}>
              <LinearGradient
                colors={[theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.waitingBadge}
              >
                <MaterialCommunityIcons name="clock-start" size={16} color={theme.primary} />
                <Text style={[styles.waitingText, { color: theme.primary }]}>
                  Opens in {formatTimeLeft(timeLeft)}
                </Text>
              </LinearGradient>
            </View>
          )}
        </LinearGradient>
        
        {submissionStatusInfo.canSubmit ? (
          <TouchableOpacity
            style={[
              styles.completeButton,
              isLate && styles.lateButton
            ]}
            onPress={() => handleCompleteAssignment(navigation)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isLate ? [theme.primary, theme.primaryDark] : [theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.completeButtonGradient}
            >
              <View style={styles.completeButtonContent}>
                <MaterialCommunityIcons 
                  name={isLate ? "timer-alert" : "check-circle"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.completeButtonText}>{submissionStatusInfo.buttonText}</Text>
              </View>
              {timeLeft && timeLeft < 600 && (
                <View style={styles.completeButtonFooter}>
                  <MaterialCommunityIcons name="alert" size={14} color="#fff" />
                  <Text style={styles.completeButtonSubtext}>
                    {timeLeft < 300 ? 'Urgent! ' : ''}{formatTimeLeft(timeLeft)} left
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledButtonContainer}>
            <TouchableOpacity
              style={[styles.disabledButton, { borderColor: theme.border }]}
              disabled={true}
              onPress={() => {
                Alert.alert(
                  submissionStatusInfo.label,
                  submissionStatusInfo.description,
                  [{ text: 'OK' }]
                );
              }}
            >
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.disabledButtonGradient}
              >
                <MaterialCommunityIcons 
                  name={submissionStatusInfo.icon as any} 
                  size={20} 
                  color={theme.textMuted} 
                />
                <Text style={[styles.disabledButtonText, { color: theme.textMuted }]}>
                  {submissionStatusInfo.buttonText}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.disabledButtonHint, { color: theme.textMuted }]}>
              ⓘ {submissionStatusInfo.description}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ===== RENDER SWAP BUTTON (ONLY FOR OWNER) =====
  const renderSwapButton = () => {
    if (!isOwner) return null;
    
    if (!assignment?.completed && assignment) {
      return (
        <View style={styles.swapSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Need to Swap?</Text>
          
          {!hasPendingRequest ? (
            <TouchableOpacity
              style={[styles.swapButton, { borderColor: '#dbe4ff' }]}
              onPress={handleRequestSwap(navigation)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EEF2FF', '#dbe4ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.swapButtonGradient}
              >
                <View style={styles.swapButtonContent}>
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#4F46E5" />
                  <Text style={styles.swapButtonText}>Request Swap</Text>
                </View>
                <Text style={[styles.swapButtonSubtext, { color: '#6B7280' }]}>
                  Find someone to take over this assignment
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.pendingSwapButton, { borderColor: '#F59E0B' }]}
              onPress={() => {
                if (pendingRequest) {
                  navigation.navigate('SwapRequestDetails', { requestId: pendingRequest.id });
                }
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FEF3C7', '#FFE5B4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pendingSwapGradient}
              >
                <View style={styles.swapButtonContent}>
                  <MaterialCommunityIcons name="clock" size={20} color="#F59E0B" />
                  <Text style={[styles.pendingSwapText, { color: '#F59E0B' }]}>Swap Request Pending</Text>
                </View>
                <Text style={[styles.pendingSwapSubtext, { color: '#92400E' }]}>
                  Tap to view request details
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return null;
  };

  // ===== RENDER SWAP ORIGIN CARD (for tasks acquired via swap) =====
  const renderSwapOriginCard = () => {
    // Only show for non-admin users who acquired this via swap
    if (isAdmin) return null;
    if (!assignment?.acquiredViaSwap) return null;
    
    return (
      <LinearGradient
        colors={[theme.primaryLight, theme.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.swapOriginCard, { borderColor: theme.primaryBorder }]}
      >
        <MaterialCommunityIcons name="swap-horizontal" size={20} color={theme.primary} />
        <View style={styles.swapOriginContent}>
          <Text style={[styles.swapOriginTitle, { color: theme.primary }]}>
            {assignment.swapScope === 'week' ? '📅 Week Swap' : '🔄 Day Swap'} - Task Transferred
          </Text>
          <Text style={[styles.swapOriginText, { color: theme.textSecondary }]}>
            You received this task from <Text style={{ fontWeight: '600', color: theme.primary }}>{assignment.swappedFromName || 'another member'}</Text>
            {assignment.swapScope === 'week' 
              ? ' through a full week swap exchange.'
              : assignment.swapDay 
                ? ` through a swap on ${assignment.swapDay}.`
                : ' through a swap request.'}
          </Text>
          {assignment.swapRequestId && (
            <TouchableOpacity
              onPress={() => navigation.navigate('SwapRequestDetails', { requestId: assignment.swapRequestId })}
            >
              <Text style={[styles.viewSwapLink, { color: theme.primary }]}>View Swap Details →</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    );
  };

// In AssignmentDetailsScreen.tsx - UPDATE renderVerificationControls

// ===== RENDER VERIFICATION CONTROLS (ADMIN ONLY) =====
const renderVerificationControls = () => {
  if (!isAdmin) return null;
  
  // ✅ If already verified, don't show controls
  if (assignment?.verified === true) return null;
  
  // ✅ If fully completed, don't show controls
  if (assignment?.completed === true) return null;
  
  const hasSubmission = assignment?.photoUrl !== null && assignment?.photoUrl !== undefined;
  const notVerified = assignment?.verified === null;
  
  // For multi-slot tasks, also show if partially completed
  const isMultiSlot = assignment?.task?.timeSlots?.length > 1;
  const isPartial = !assignment?.completed && isMultiSlot && hasSubmission;
  
  if ((!hasSubmission || !notVerified) && !isPartial) return null;

  return (
    <View style={styles.verificationSection}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin Verification</Text>
      
      <LinearGradient
        colors={[theme.bgSecondary, theme.bgTertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.notesInputGradient, { borderColor: theme.border }]}
      >
        <TextInput
          style={[styles.notesInput, { color: theme.text }]}
          value={adminNotes}
          onChangeText={setAdminNotes}
          placeholder="Add notes for the user (optional)..."
          placeholderTextColor={theme.textPlaceholder}
          multiline
          numberOfLines={3}
          maxLength={500}
          selectionColor={theme.primary}
        />
      </LinearGradient>
      <Text style={[styles.charCount, { color: theme.textMuted }]}>
        {adminNotes.length}/500 characters
      </Text>

      <View style={styles.verificationButtons}>
        <TouchableOpacity
          style={[styles.verifyButton, styles.rejectButton]}
          onPress={() => handleVerify(false)}
          disabled={verifying}
        >
          <LinearGradient
            colors={[theme.error, theme.error]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.verifyButtonGradient}
          >
            {verifying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>Reject</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.verifyButton, styles.approveButton]}
          onPress={() => handleVerify(true)}
          disabled={verifying}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.verifyButtonGradient}
          >
            {verifying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>Approve</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

  

  // ===== RENDER ADMIN INFO BANNER =====
  const renderAdminInfoBanner = () => {
    if (!isAdmin) return null;
    
    return (
      <LinearGradient
        colors={[theme.primaryLight, theme.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.adminInfoBanner, { borderColor: theme.primaryBorder }]}
      >
        <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
        <Text style={[styles.adminInfoText, { color: theme.primary }]}>
          Admin View Only - You can see all assignment details and verify submissions, but cannot complete or request swaps.
        </Text>
      </LinearGradient>
    );
  };

  // ===== RENDER READ-ONLY FOOTER =====
  const renderReadOnlyFooter = () => {
    if (!isAdmin) return null;
    
    return (
      <View style={[styles.readOnlyFooterContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <LinearGradient
          colors={[theme.bgSecondary, theme.bgTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.readOnlyFooter, { borderColor: theme.border }]}
        >
          <MaterialCommunityIcons name="eye" size={20} color={theme.primary} />
          <Text style={[styles.readOnlyText, { color: theme.primary }]}>Admin View - Verification controls available below</Text>
        </LinearGradient>
      </View>
    );
  };

  // ===== RENDER PHOTO SECTION =====
  const renderPhotoSection = () => { 
    if (!assignment?.photoUrl) return null;

    const fullImageUrl = getFullImageUrl(assignment?.photoUrl);

    if (!fullImageUrl) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Proof Photo</Text>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={handleViewPhoto}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: fullImageUrl }}
            style={styles.photo}
            resizeMode="cover"
            onError={(e) => {
              console.error('Image preview error:', e.nativeEvent.error);
              console.log('Failed URL:', fullImageUrl);
            }}
            onLoad={() => {
              console.log('Image preview loaded:', fullImageUrl);
            }}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.photoOverlay}
          >
            <MaterialCommunityIcons name="magnify" size={28} color="#fff" />
            <Text style={[styles.viewPhotoText, { color: '#fff' }]}>Tap to view full image</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View> 
    );
  };
 
  // ===== RENDER CONTENT =====
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading assignment...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAssignmentDetails}
          >
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
      );
    }

    if (!assignment) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-question" size={64} color={theme.border} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Assignment not found</Text>
        </View>
      );
    }

    return (
      <>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { borderColor: theme.border }]}
          >
            {/* Admin Info Banner */}
            {renderAdminInfoBanner()}

            {/* Header with status */}
            <View style={styles.headerRow}>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                {isTaskDeleted ? deletedTaskTitle : (assignment.task?.title || 'Unknown Task')}
              </Text>
              <LinearGradient
                colors={[getStatusColor() + '20', getStatusColor() + '10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statusBadge, { borderColor: getStatusColor() }]}
              >
                <MaterialCommunityIcons 
                  name={getStatusIcon()} 
                  size={14} 
                  color={getStatusColor()} 
                />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </LinearGradient>
            </View>

            {/* User Info */}
            <View style={[styles.userInfo, { borderColor: theme.border }]}>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.avatar, { borderColor: theme.border }]}
              >
                {assignment.user?.avatarUrl ? (
                  <Image source={{ uri: assignment.user.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                    {assignment.user?.fullName?.charAt(0) || 'U'}
                  </Text>
                )}
              </LinearGradient>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: theme.text }]}>{assignment.user?.fullName || 'Unknown User'}</Text>
                {!isOwner && isAdmin && (
                  <Text style={[styles.assigneeBadge, { color: theme.primary, backgroundColor: theme.primaryLight }]}>Assignee</Text>
                )}
                {assignment.completed && assignment.completedAt && (
                  <Text style={[styles.completionDate, { color: theme.textMuted }]}>
                    Completed {formatUTCDate(assignment.completedAt)} • {getTimeDifference(assignment.dueDate, assignment.completedAt)}
                  </Text>
                )}
              </View>
            </View>

            {/* ✅ SWAP ORIGIN CARD - Show if task was acquired via swap */}
            {renderSwapOriginCard()}
 
            {/* Complete Assignment Button - Only for Owner */}
            {renderCompleteButton()}

            {/* Swap Request Button - Only for Owner */}
            {renderSwapButton()}

            {/* Points and Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Points</Text>
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pointsBadge}
                >
                  <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
                  <Text style={[styles.pointsValue, { color: theme.primary }]}>{assignment.points || 0}</Text>
                </LinearGradient>
              </View>
              
              {/* ✅ DUE DATE DISPLAY WITH DEBUG */}
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Due Date</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {formatUTCDate(assignment.dueDate)}
                </Text>
              </View>

              {assignment.timeSlot && (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Time Slot</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {assignment.timeSlot.startTime} - {assignment.timeSlot.endTime}
                  </Text>
                </View>
              )}

              {assignment.assignmentDay && (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Day</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{assignment.assignmentDay}</Text>
                </View>
              )}
            </View>

            {/* Photo Section */}
            {renderPhotoSection()}

            {/* User Notes */}
            {assignment.notes && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>User Notes</Text>
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.notesCard, { borderColor: theme.primaryBorder }]}
                >
                  <Text style={[styles.notesText, { color: theme.primary }]}>{assignment.notes}</Text>
                </LinearGradient>
              </View>
            )}

            {/* Admin Notes */}
            {assignment.adminNotes && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin Feedback</Text>
                <LinearGradient
                  colors={assignment.verified === false ? [theme.errorBg, theme.errorBg] : [theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.adminNotesCard,
                    assignment.verified === false ? styles.rejectedNotes : styles.verifiedNotes,
                    { borderColor: theme.border }
                  ]}
                >
                  <Text style={[styles.adminNotesText, { color: theme.textSecondary }]}>{assignment.adminNotes}</Text>
                </LinearGradient>
              </View>
            )}

            {/* Verification Controls - Only for Admin */}
            {renderVerificationControls()}
 
            {/* Assignment Info */} 
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.infoSection, { borderColor: theme.border }]}
            >
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-week" size={14} color={theme.textMuted} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Rotation Week: {assignment.rotationWeek || 1}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-range" size={14} color={theme.textMuted} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Week: {formatUTCDate(assignment.weekStart)} - {formatUTCDate(assignment.weekEnd)}
                </Text>
              </View>
              {assignment.task?.group && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account-group" size={14} color={theme.textMuted} />
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    Group: {assignment.task.group.name}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </LinearGradient>
        </ScrollView> 
        
        {/* Read-Only Footer for Admin */}
        {renderReadOnlyFooter()}
      </>
    ); 
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}
      {renderContent()} 
      {renderPhotoModal()} 
    </ScreenWrapper> 
  ); 
}