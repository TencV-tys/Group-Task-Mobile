// src/screens/AssignmentDetailsScreen.tsx - CLEAN with separated concerns
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
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAssignmentDetails } from '../hooks/useAssignmentDetails';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { assignmentDetailsStyles as styles } from '../styles/assignmentDetails.styles';

export default function AssignmentDetailsScreen({ navigation, route }: any) {
  const { assignmentId, isAdmin, onVerified } = route.params || {};
  
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
    formatTimeLeft,
    
    // Setters
    setAdminNotes,
    
    // Data
    hasPendingRequest,
    pendingRequest,
    
    // Helper functions
    getStatusColor,
    getStatusIcon,
    getStatusText,
    getTimeDifference,
    getSubmissionStatusInfo,
    
    // Actions
    fetchAssignmentDetails,
    handleCompleteAssignment,
    handleRequestSwap,
    handleVerify,
    handleViewPhoto,
    clearAuthError
  } = useAssignmentDetails(assignmentId, isAdmin, onVerified);

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
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Assignment Details
        </Text>
      </View>
      
      <View style={styles.headerSpacer} />
    </View>
  );

  // ===== RENDER COMPLETE BUTTON =====
  const renderCompleteButton = () => {
    if (!assignment?.completed) {
      const submissionStatusInfo = getSubmissionStatusInfo();
      
      return (
        <View style={styles.completeSection}>
          <Text style={styles.sectionTitle}>Complete This Assignment</Text>
          
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
              <View style={styles.timeWindowInfo}>
                <Text style={styles.timeWindowText}>
                  Submit within time window for full points
                </Text>
              </View>
            )}
            
            {isLate && penaltyInfo && (
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.penaltyInfo}
              >
                <MaterialCommunityIcons name="alert" size={16} color="#e67700" />
                <Text style={styles.penaltyText}>
                  Points: {penaltyInfo.finalPoints} / {penaltyInfo.originalPoints} 
                  (Penalty: -{penaltyInfo.penaltyAmount})
                </Text>
              </LinearGradient>
            )}
            
            {submissionStatus === 'available' && timeLeft !== null && (
              <View style={styles.timerContainer}>
                <LinearGradient
                  colors={timeLeft < 300 ? ['#ffc9c9', '#ffb3b3'] : isLate ? ['#fff3bf', '#ffec99'] : ['#d3f9d8', '#b2f2bb']}
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
                    color={timeLeft < 300 ? "#fa5252" : isLate ? "#e67700" : "#2b8a3e"} 
                  />
                  <Text style={[styles.timerText, { color: timeLeft < 300 ? "#fa5252" : isLate ? "#e67700" : "#2b8a3e" }]}>
                    {formatTimeLeft(timeLeft)} remaining
                  </Text>
                </LinearGradient>
                {timeLeft < 300 && (
                  <Text style={styles.urgentMessage}>Hurry! Grace period ending soon.</Text>
                )}
              </View>
            )}
            
            {submissionStatus === 'waiting' && timeLeft !== null && timeLeft > 0 && (
              <View style={styles.waitingContainer}>
                <LinearGradient
                  colors={['#fff3bf', '#ffec99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.waitingBadge}
                >
                  <MaterialCommunityIcons name="clock-start" size={16} color="#e67700" />
                  <Text style={styles.waitingText}>
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
                colors={isLate ? ['#e67700', '#cc5f00'] : ['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.completeButtonGradient}
              >
                <View style={styles.completeButtonContent}>
                  <MaterialCommunityIcons 
                    name={isLate ? "timer-alert" : "check-circle"} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.completeButtonText}>{submissionStatusInfo.buttonText}</Text>
                </View>
                {timeLeft && timeLeft < 600 && (
                  <View style={styles.completeButtonFooter}>
                    <MaterialCommunityIcons name="alert" size={14} color="white" />
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
                style={styles.disabledButton}
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
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.disabledButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name={submissionStatusInfo.icon as any} 
                    size={20} 
                    color="#868e96" 
                  />
                  <Text style={styles.disabledButtonText}>
                    {submissionStatusInfo.buttonText}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.disabledButtonHint}>
                ⓘ {submissionStatusInfo.description}
              </Text>
            </View>
          )}
        </View>
      );
    }
    return null;
  };

  // ===== RENDER SWAP BUTTON =====
  const renderSwapButton = () => {
    if (!assignment?.completed && assignment) {
      return (
        <View style={styles.swapSection}>
          <Text style={styles.sectionTitle}>Need to Swap?</Text>
          
          {!hasPendingRequest ? (
            <TouchableOpacity
              style={styles.swapButton}
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
                <Text style={styles.swapButtonSubtext}>
                  Find someone to take over this assignment
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.pendingSwapButton}
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
                  <Text style={styles.pendingSwapText}>Swap Request Pending</Text>
                </View>
                <Text style={styles.pendingSwapSubtext}>
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

  // ===== RENDER VERIFICATION CONTROLS =====
  const renderVerificationControls = () => {
    if (!isAdmin || !assignment?.completed || assignment.verified !== null) return null;

    return (
      <View style={styles.verificationSection}>
        <Text style={styles.sectionTitle}>Admin Verification</Text>
        
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.notesInputGradient}
        >
          <TextInput
            style={styles.notesInput}
            value={adminNotes}
            onChangeText={setAdminNotes}
            placeholder="Add notes for the user (optional)..."
            placeholderTextColor="#adb5bd"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </LinearGradient>
        <Text style={styles.charCount}>
          {adminNotes.length}/500 characters
        </Text>

        <View style={styles.verificationButtons}>
          <TouchableOpacity
            style={[styles.verifyButton, styles.rejectButton]}
            onPress={() => handleVerify(false)}
            disabled={verifying}
          >
            <LinearGradient
              colors={['#fa5252', '#e03131']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifyButtonGradient}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle" size={20} color="white" />
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
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifyButtonGradient}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                  <Text style={styles.verifyButtonText}>Approve</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ===== RENDER PHOTO SECTION =====
  const renderPhotoSection = () => {
    if (!assignment?.photoUrl) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proof Photo</Text>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={handleViewPhoto}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: assignment.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.photoOverlay}
          >
            <MaterialCommunityIcons name="magnify" size={28} color="white" />
            <Text style={styles.viewPhotoText}>Tap to view full image</Text>
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
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading assignment...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAssignmentDetails}
          >
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
      );
    }

    if (!assignment) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-question" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>Assignment not found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Header with status */}
          <View style={styles.headerRow}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {assignment.task?.title || 'Unknown Task'}
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
          <View style={styles.userInfo}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              {assignment.user?.avatarUrl ? (
                <Image source={{ uri: assignment.user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {assignment.user?.fullName?.charAt(0) || 'U'}
                </Text>
              )}
            </LinearGradient>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{assignment.user?.fullName || 'Unknown User'}</Text>
              {assignment.completed && assignment.completedAt && (
                <Text style={styles.completionDate}>
                  Completed {new Date(assignment.completedAt).toLocaleDateString()} • {getTimeDifference(assignment.dueDate, assignment.completedAt)}
                </Text>
              )}
            </View>
          </View>

          {/* Complete Assignment Button */}
          {renderCompleteButton()}

          {/* Swap Request Button */}
          {renderSwapButton()}

          {/* Points and Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Points</Text>
              <LinearGradient
                colors={['#fff3bf', '#ffec99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pointsBadge}
              >
                <MaterialCommunityIcons name="star" size={14} color="#e67700" />
                <Text style={styles.pointsValue}>{assignment.points || 0}</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>
                {new Date(assignment.dueDate).toLocaleDateString()}
              </Text>
            </View>

            {assignment.timeSlot && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time Slot</Text>
                <Text style={styles.detailValue}>
                  {assignment.timeSlot.startTime} - {assignment.timeSlot.endTime}
                </Text>
              </View>
            )}

            {assignment.assignmentDay && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Day</Text>
                <Text style={styles.detailValue}>{assignment.assignmentDay}</Text>
              </View>
            )}
          </View>

          {/* Photo Section */}
          {renderPhotoSection()}

          {/* User Notes */}
          {assignment.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Notes</Text>
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.notesCard}
              >
                <Text style={styles.notesText}>{assignment.notes}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Admin Notes */}
          {assignment.adminNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Admin Feedback</Text>
              <LinearGradient
                colors={assignment.verified === false ? ['#fff5f5', '#ffe3e3'] : ['#d3f9d8', '#b2f2bb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.adminNotesCard,
                  assignment.verified === false ? styles.rejectedNotes : styles.verifiedNotes
                ]}
              >
                <Text style={styles.adminNotesText}>{assignment.adminNotes}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Verification Controls */}
          {renderVerificationControls()}

          {/* Assignment Info */}
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoSection}
          >
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-week" size={14} color="#868e96" />
              <Text style={styles.infoText}>
                Rotation Week: {assignment.rotationWeek || 1}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-range" size={14} color="#868e96" />
              <Text style={styles.infoText}>
                Week: {new Date(assignment.weekStart).toLocaleDateString()} - {new Date(assignment.weekEnd).toLocaleDateString()}
              </Text>
            </View>
            {assignment.task?.group && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={14} color="#868e96" />
                <Text style={styles.infoText}>
                  Group: {assignment.task.group.name}
                </Text>
              </View>
            )}
          </LinearGradient>
        </LinearGradient>
      </ScrollView>
    );
  };

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {renderContent()}
    </ScreenWrapper>
  );
}