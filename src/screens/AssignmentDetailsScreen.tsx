// src/screens/AssignmentDetailsScreen.tsx - UPDATED WITH COMPLETE BUTTON
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssignmentService } from '../AssignmentServices/AssignmentService';
import { API_BASE_URL } from '../config/api';

const { width } = Dimensions.get('window');

export default function AssignmentDetailsScreen({ navigation, route }: any) {
  const { assignmentId, isAdmin, onVerified } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [isMyAssignment, setIsMyAssignment] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await AssignmentService.getAssignmentDetails(assignmentId);

      if (result.success) {
        setAssignment(result.assignment);
        setVerificationStatus(
          result.assignment.verified ? 'verified' : 
          result.assignment.verified === false ? 'rejected' : 'pending'
        );
        setAdminNotes(result.assignment.adminNotes || '');
        
        // Check if this is the current user's assignment
        // You might need to get current user ID from somewhere (context, async storage, etc.)
        // For now, we'll assume we have a way to check
        // const currentUserId = await getCurrentUserId();
        // setIsMyAssignment(result.assignment.userId === currentUserId);
        
        // Temporary: We'll check if assignment is not completed
        setIsMyAssignment(!result.assignment.completed);
      } else {
        setError(result.message || 'Failed to load assignment details');
      }
    } catch (err: any) {
      console.error('Error fetching assignment:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAssignment = () => {
    if (!assignment) return;
    
    navigation.navigate('CompleteAssignment', {
      assignmentId: assignment.id,
      taskTitle: assignment.task?.title || 'Unknown Task',
      dueDate: assignment.dueDate,
      onCompleted: () => {
        // Refresh assignment details after completion
        fetchAssignmentDetails();
        if (onVerified) onVerified();
      }
    });
  };

  const handleVerify = async (verified: boolean) => {
    if (!assignment) return;

    setVerifying(true);
    
    try {
      const result = await AssignmentService.verifyAssignment(assignmentId, {
        verified,
        adminNotes: adminNotes.trim() || undefined
      });
 
      if (result.success) {
        Alert.alert(
          'Success',
          verified ? 'Assignment verified successfully!' : 'Assignment rejected.',
          [{ text: 'OK', onPress: () => {
            setVerificationStatus(verified ? 'verified' : 'rejected');
            setVerifying(false);
            fetchAssignmentDetails(); // Refresh data
            if (onVerified) onVerified();
          }}]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to verify assignment');
        setVerifying(false);
      }
    } catch (error: any) {
      console.error('Error verifying assignment:', error);
      Alert.alert('Error', error.message || 'Network error');
      setVerifying(false);
    }
  };

  const handleViewPhoto = () => {
    if (assignment?.photoUrl) {
      Linking.openURL(assignment.photoUrl).catch(err => {
        Alert.alert('Error', 'Could not open image');
      });
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'verified': return '#2b8a3e';
      case 'rejected': return '#fa5252';
      default: return '#e67700';
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified': return 'check-circle';
      case 'rejected': return 'close-circle';
      default: return assignment?.completed ? 'clock-check' : 'clock-outline';
    }
  };

  const getStatusText = () => {
    if (!assignment?.completed) return 'Not Completed';
    
    switch (verificationStatus) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      default: return 'Pending Verification';
    }
  };

  const getTimeDifference = (dueDate: string, completedAt: string) => {
    const due = new Date(dueDate);
    const completed = new Date(completedAt);
    const diffMs = completed.getTime() - due.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return `${Math.abs(diffHours)} hours early`;
    } else if (diffHours === 0) {
      return "on time";
    } else {
      return `${diffHours} hours late`;
    }
  };

  const renderCompleteButton = () => {
    // Only show complete button if assignment is not completed
    if (!assignment?.completed) {
      return (
        <View style={styles.completeSection}>
          <Text style={styles.sectionTitle}>Complete This Assignment</Text>
          <Text style={styles.completeDescription}>
            Submit your completion with photo and notes
          </Text>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteAssignment}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="white" />
            <Text style={styles.completeButtonText}>Complete Assignment</Text>
          </TouchableOpacity>
          
          {/* Show admin note if user is admin */}
          {isAdmin && (
            <View style={styles.adminNote}>
              <MaterialCommunityIcons name="shield-account" size={16} color="#007AFF" />
              <Text style={styles.adminNoteText}>
                You're an admin completing your own assignment
              </Text>
            </View>
          )}
        </View>
      );
    }
    return null;
  };

  const renderVerificationControls = () => {
    if (!isAdmin || !assignment?.completed || assignment.verified !== null) return null;

    return (
      <View style={styles.verificationSection}>
        <Text style={styles.sectionTitle}>Admin Verification</Text>
        
        <TextInput
          style={styles.notesInput}
          value={adminNotes}
          onChangeText={setAdminNotes}
          placeholder="Add notes for the user (optional)..."
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text style={styles.charCount}>
          {adminNotes.length}/500 characters
        </Text>

        <View style={styles.verificationButtons}>
          <TouchableOpacity
            style={[styles.verifyButton, styles.rejectButton]}
            onPress={() => handleVerify(false)}
            disabled={verifying}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color="white" />
            <Text style={styles.verifyButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.verifyButton, styles.approveButton]}
            onPress={() => handleVerify(true)}
            disabled={verifying}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="white" />
            <Text style={styles.verifyButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          <View style={styles.photoOverlay}>
            <MaterialCommunityIcons name="magnify" size={32} color="white" />
            <Text style={styles.viewPhotoText}>Tap to view full image</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading assignment...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAssignmentDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          {/* Header with status */}
          <View style={styles.headerRow}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {assignment.task?.title || 'Unknown Task'}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }
            ]}>
              <MaterialCommunityIcons 
                name={getStatusIcon()} 
                size={16} 
                color={getStatusColor()} 
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              {assignment.user?.avatarUrl ? (
                <Image source={{ uri: assignment.user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {assignment.user?.fullName?.charAt(0) || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{assignment.user?.fullName || 'Unknown User'}</Text>
              {assignment.completed && assignment.completedAt && (
                <Text style={styles.completionDate}>
                  Completed {new Date(assignment.completedAt).toLocaleDateString()} • {getTimeDifference(assignment.dueDate, assignment.completedAt)}
                </Text>
              )}
            </View>
          </View>

          {/* Complete Assignment Button (if not completed) */}
          {renderCompleteButton()}

          {/* Points and Due Date */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Points</Text>
              <View style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star" size={16} color="#e67700" />
                <Text style={styles.pointsValue}>{assignment.points || 0}</Text>
              </View>
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
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{assignment.notes}</Text>
              </View>
            </View>
          )}

          {/* Admin Notes */}
          {assignment.adminNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Admin Feedback</Text>
              <View style={[
                styles.adminNotesCard,
                assignment.verified === false ? styles.rejectedNotes : styles.verifiedNotes
              ]}>
                <Text style={styles.adminNotesText}>{assignment.adminNotes}</Text>
              </View>
            </View>
          )}

          {/* Verification Controls (Admin only, for other users' assignments) */}
          {renderVerificationControls()}

          {/* Assignment Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-week" size={16} color="#6c757d" />
              <Text style={styles.infoText}>
                Rotation Week: {assignment.rotationWeek || 1}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-range" size={16} color="#6c757d" />
              <Text style={styles.infoText}>
                Week: {new Date(assignment.weekStart).toLocaleDateString()} - {new Date(assignment.weekEnd).toLocaleDateString()}
              </Text>
            </View>
            {assignment.task?.group && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={16} color="#6c757d" />
                <Text style={styles.infoText}>
                  Group: {assignment.task.group.name}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            Assignment Details
          </Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center'
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginRight: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4
  },
  completionDate: {
    fontSize: 14,
    color: '#6c757d'
  },
  // Complete Assignment Section
  completeSection: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  completeDescription: {
    fontSize: 14,
    color: '#1864ab',
    marginBottom: 16,
    lineHeight: 20
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2b8a3e',
    padding: 16,
    borderRadius: 8
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#d0ebff',
    borderRadius: 6
  },
  adminNoteText: {
    fontSize: 14,
    color: '#1864ab',
    fontWeight: '500'
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24
  },
  detailItem: {
    width: '48%'
  },
  detailLabel: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 4
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529'
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 6
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden'
  },
  photo: {
    width: '100%',
    height: 250,
    backgroundColor: '#f8f9fa'
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    alignItems: 'center'
  },
  viewPhotoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4
  },
  notesCard: {
    backgroundColor: '#e7f5ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  notesText: {
    fontSize: 15,
    color: '#1864ab',
    lineHeight: 22
  },
  adminNotesCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1
  },
  rejectedNotes: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffc9c9'
  },
  verifiedNotes: {
    backgroundColor: '#d3f9d8',
    borderColor: '#8ce99a'
  },
  adminNotesText: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22
  },
  verificationSection: {
    marginBottom: 24
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8
  },
  charCount: {
    textAlign: 'right',
    color: '#868e96',
    fontSize: 12,
    marginBottom: 16
  },
  verificationButtons: {
    flexDirection: 'row',
    gap: 12
  },
  verifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8
  },
  rejectButton: {
    backgroundColor: '#fa5252'
  },
  approveButton: {
    backgroundColor: '#2b8a3e'
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d'
  }
});