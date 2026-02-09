// src/screens/TaskDetailsScreen.tsx - COMPLETELY UPDATED with assignment features
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Image,
  Linking
} from 'react-native';
import { TaskService } from '../taskServices/TaskService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TaskDetailsScreen({ navigation, route }: any) {
  const { taskId, groupId, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is admin
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching task details for:', taskId);
      const result = await TaskService.getTaskDetails(taskId);
      
      if (result.success) {
        setTask(result.task);
      } else {
        setError(result.message || 'Failed to load task details');
      }
    } catch (err: any) {
      console.error('Error fetching task details:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEdit = () => {
    if (task) {
      navigation.navigate('UpdateTask', {
        task,
        groupId: task.groupId || groupId,
        groupName: task.group?.name,
        onTaskUpdated: () => {
          fetchTaskDetails();
        }
      });
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await TaskService.deleteTask(task.id);
              
              if (result.success) {
                Alert.alert('Success', 'Task deleted successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', result.message || 'Failed to delete task');
              }
            } catch (err: any) {
              console.error('Error deleting task:', err);
              Alert.alert('Error', err.message || 'Failed to delete task');
            }
          }
        }
      ]
    );
  };

  const handleCompleteAssignment = () => {
    if (!task?.userAssignment) return;
    
    navigation.navigate('CompleteAssignment', {
      assignmentId: task.userAssignment.id,
      taskTitle: task.title,
      dueDate: task.userAssignment.dueDate,
      onCompleted: fetchTaskDetails
    });
  };

  const handleViewAssignmentDetails = (assignment?: any) => {
    const assignmentId = assignment?.id || task?.userAssignment?.id;
    if (!assignmentId) return;
    
    navigation.navigate('AssignmentDetails', {
      assignmentId,
      isAdmin: isAdmin,
      onVerified: fetchTaskDetails
    });
  };

  const handleViewPhoto = (photoUrl: string) => {
    if (photoUrl) {
      Linking.openURL(photoUrl).catch(err => {
        Alert.alert('Error', 'Could not open image');
      });
    }
  };

  const getVerificationStatus = (assignment: any) => {
    if (!assignment?.completed) return { 
      status: 'pending', 
      color: '#e67700', 
      icon: 'clock-outline',
      text: 'Pending Completion'
    };
    
    if (assignment.verified === true) return { 
      status: 'verified', 
      color: '#2b8a3e', 
      icon: 'check-circle',
      text: 'Verified'
    };
    
    if (assignment.verified === false) return { 
      status: 'rejected', 
      color: '#fa5252', 
      icon: 'close-circle',
      text: 'Rejected'
    };
    
    return { 
      status: 'pending_verification', 
      color: '#e67700', 
      icon: 'clock-check',
      text: 'Awaiting Verification'
    };
  };

  const getCompletionTimeText = (assignment: any) => {
    if (!assignment?.completed || !assignment?.completedAt) return '';
    
    const dueDate = new Date(assignment.dueDate);
    const completedAt = new Date(assignment.completedAt);
    const diffMs = completedAt.getTime() - dueDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return `${Math.abs(diffHours)} hours early`;
    } else if (diffHours === 0) {
      return "on time";
    } else {
      return `${diffHours} hours late`;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={handleBack} 
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Task Details
        </Text>
      </View>
      
      {isAdmin && task ? (
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEdit}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialCommunityIcons name="pencil" size={24} color="#007AFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );

  const renderMemberAssignmentSection = () => {
    if (!task?.userAssignment) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <View style={styles.notAssignedCard}>
            <MaterialCommunityIcons name="account-question" size={24} color="#868e96" />
            <Text style={styles.notAssignedText}>
              Not assigned to you this week
            </Text>
          </View>
        </View>
      );
    }

    const status = getVerificationStatus(task.userAssignment);

    if (!task.userAssignment.completed) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assignment</Text>
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <MaterialCommunityIcons name="account-clock" size={24} color="#e67700" />
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentTitle}>Assigned to You</Text>
                <Text style={styles.assignmentDate}>
                  Due: {new Date(task.userAssignment.dueDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteAssignment}
            >
              <MaterialCommunityIcons name="check-circle" size={20} color="white" />
              <Text style={styles.completeButtonText}>Mark as Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Submission</Text>
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <MaterialCommunityIcons 
              name={status.icon} 
              size={24} 
              color={status.color} 
            />
            <View style={styles.completionInfo}>
              <Text style={[styles.completionTitle, { color: status.color }]}>
                {status.text}
              </Text>
              <Text style={styles.completionDate}>
                Completed: {new Date(task.userAssignment.completedAt).toLocaleDateString()}
                {getCompletionTimeText(task.userAssignment) && ` • ${getCompletionTimeText(task.userAssignment)}`}
              </Text>
            </View>
          </View>
          
          {task.userAssignment.photoUrl && (
            <TouchableOpacity
              style={styles.photoPreview}
              onPress={() => handleViewPhoto(task.userAssignment.photoUrl)}
            >
              <View style={styles.photoPreviewContent}>
                <MaterialCommunityIcons name="image" size={20} color="#007AFF" />
                <Text style={styles.viewPhotoText}>View Submitted Photo</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {task.userAssignment.notes && (
            <View style={styles.userNotesCard}>
              <Text style={styles.notesTitle}>Your Notes:</Text>
              <Text style={styles.notesText}>{task.userAssignment.notes}</Text>
            </View>
          )}
          
          {task.userAssignment.adminNotes && status.status === 'rejected' && (
            <View style={styles.adminFeedbackCard}>
              <Text style={styles.adminFeedbackTitle}>Admin Feedback:</Text>
              <Text style={styles.adminFeedbackText}>{task.userAssignment.adminNotes}</Text>
            </View>
          )}
          
          {status.status === 'pending_verification' && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={16} color="#6c757d" />
              <Text style={styles.infoText}>
                Your submission is pending admin verification. Points will be awarded once verified.
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => handleViewAssignmentDetails(task.userAssignment)}
          >
            <MaterialCommunityIcons name="eye" size={16} color="#007AFF" />
            <Text style={styles.viewDetailsText}>View Submission Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdminAssignmentView = (assignment: any) => {
    const status = getVerificationStatus(assignment);
    
    return (
      <TouchableOpacity
        key={assignment.id}
        style={styles.adminAssignmentCard}
        onPress={() => handleViewAssignmentDetails(assignment)}
      >
        <View style={styles.adminAssignmentHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              {assignment.user?.avatarUrl ? (
                <Image source={{ uri: assignment.user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.userAvatarText}>
                  {assignment.user?.fullName?.charAt(0) || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{assignment.user?.fullName || 'Unknown User'}</Text>
              <Text style={styles.assignmentDateSmall}>
                Due: {new Date(assignment.dueDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <MaterialCommunityIcons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>
        
        {assignment.completed && (
          <View style={styles.adminAssignmentDetails}>
            <Text style={styles.completedText}>
              Submitted: {new Date(assignment.completedAt).toLocaleDateString()}
            </Text>
            {assignment.photoUrl && (
              <View style={styles.hasPhotoBadge}>
                <MaterialCommunityIcons name="image" size={12} color="#007AFF" />
                <Text style={styles.hasPhotoText}>Has Photo</Text>
              </View>
            )}
            {assignment.notes && (
              <View style={styles.hasNotesBadge}>
                <MaterialCommunityIcons name="note-text" size={12} color="#e67700" />
                <Text style={styles.hasNotesText}>Has Notes</Text>
              </View>
            )}
          </View>
        )}
        
        {assignment.adminNotes && (
          <View style={styles.adminNotesPreview}>
            <Text style={styles.adminNotesPreviewText} numberOfLines={1}>
              {assignment.adminNotes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading task details...</Text>
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
            onPress={fetchTaskDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!task) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-question" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>Task not found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.taskHeader}>
            <View style={styles.taskIcon}>
              <MaterialCommunityIcons 
                name="format-list-checks" 
                size={24} 
                color="#007AFF" 
              />
            </View>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star" size={16} color="#e67700" />
                <Text style={styles.pointsText}>{task.points} points</Text>
              </View>
            </View>
          </View>

          {task.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>{task.executionFrequency}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{task.category || 'None'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[
                styles.taskStatusBadge,
                task.userAssignment?.completed ? styles.completedStatus : styles.pendingStatus
              ]}>
                <Text style={styles.taskStatusText}>
                  {task.userAssignment?.completed ? 'Completed' : 'Active'}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Recurring</Text>
              <Text style={styles.detailValue}>{task.isRecurring ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          {/* Member View: Show assignment status and completion options */}
          {!isAdmin && renderMemberAssignmentSection()}

          {task.executionFrequency === 'WEEKLY' && task.selectedDays?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Days</Text>
              <View style={styles.daysContainer}>
                {task.selectedDays.map((day: string, index: number) => (
                  <View key={index} style={styles.dayChip}>
                    <Text style={styles.dayText}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {task.timeSlots?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Time Slots</Text>
              <View style={styles.timeSlotsContainer}>
                {task.timeSlots.map((slot: any, index: number) => (
                  <View key={index} style={styles.timeSlotCard}>
                    <View style={styles.timeSlotHeader}>
                      <MaterialCommunityIcons name="clock" size={20} color="#007AFF" />
                      <Text style={styles.timeSlotTime}>
                        {slot.startTime} - {slot.endTime}
                      </Text>
                    </View>
                    {slot.label && (
                      <Text style={styles.timeSlotLabel}>{slot.label}</Text>
                    )}
                    {slot.points !== undefined && slot.points > 0 && (
                      <Text style={styles.timeSlotPoints}>
                        Points: {slot.points}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Admin View: Show all assignments */}
          {isAdmin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assignments & Rotation</Text>
              
              <View style={styles.adminInfoBox}>
                <MaterialCommunityIcons name="shield-account" size={20} color="#007AFF" />
                <View style={styles.adminInfoContent}>
                  <Text style={styles.adminInfoTitle}>Admin Information</Text>
                  <Text style={styles.adminInfoText}>
                    You have full control over this task. You can edit, delete, or reassign it. Click on assignments to verify/reject submissions.
                  </Text>
                </View>
              </View>

              {task.currentAssignee && (
                <View style={styles.assigneeInfo}>
                  <Text style={styles.assigneeLabel}>Current Assignee:</Text>
                  <Text style={styles.assigneeValue}>
                    {task.assignments?.[0]?.user?.fullName || 'Unknown'} (Week {task.group?.currentRotationWeek || 1})
                  </Text>
                </View>
              )}

              {task.rotationMembers && Array.isArray(task.rotationMembers) && (
                <View style={styles.rotationInfo}>
                  <Text style={styles.rotationLabel}>Rotation Members:</Text>
                  <View style={styles.rotationMembersList}>
                    {task.rotationMembers.map((member: any, index: number) => (
                      <View key={member.userId} style={styles.rotationMemberItem}>
                        <View style={[
                          styles.rotationMemberAvatar,
                          member.userId === task.currentAssignee && styles.currentAssigneeAvatar
                        ]}>
                          <Text style={styles.rotationMemberInitial}>
                            {member.fullName?.charAt(0) || '?'}
                          </Text>
                        </View>
                        <Text style={[
                          styles.rotationMemberName,
                          member.userId === task.currentAssignee && styles.currentAssigneeName
                        ]}>
                          {member.fullName}
                          {member.userId === task.currentAssignee && ' (Current)'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {task.assignments?.length > 0 ? (
                <View style={styles.assignmentsContainer}>
                  <Text style={styles.assignmentsSubtitle}>Recent Assignments:</Text>
                  {task.assignments.slice(0, 5).map((assignment: any, index: number) => 
                    renderAdminAssignmentView(assignment)
                  )}
                  {task.assignments.length > 5 && (
                    <Text style={styles.moreAssignments}>
                      +{task.assignments.length - 5} more assignments
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noAssignments}>No assignments yet</Text>
              )}
            </View>
          )}

          {/* Delete button - Only for admins */}
          {isAdmin && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#fa5252" />
              <Text style={styles.deleteButtonText}>Delete Task</Text>
            </TouchableOpacity>
          )}

          {/* Information for members about permissions */}
          {!isAdmin && (
            <View style={styles.memberInfoBox}>
              <MaterialCommunityIcons name="information" size={20} color="#6c757d" />
              <Text style={styles.memberInfoText}>
                Only group administrators can edit or delete tasks.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
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
    paddingVertical: 5,
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
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f8f9fa'
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
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  taskIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e7f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  taskTitleContainer: {
    flex: 1
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8
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
  pointsText: {
    fontSize: 14,
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
  description: {
    fontSize: 15,
    color: '#6c757d',
    lineHeight: 22
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
  taskStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  completedStatus: {
    backgroundColor: '#d3f9d8'
  },
  pendingStatus: {
    backgroundColor: '#fff3bf'
  },
  taskStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dayChip: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  dayText: {
    fontSize: 14,
    color: '#1864ab',
    fontWeight: '500'
  },
  timeSlotsContainer: {
    gap: 12
  },
  timeSlotCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  timeSlotTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529'
  },
  timeSlotLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 28,
    marginBottom: 4
  },
  timeSlotPoints: {
    fontSize: 12,
    color: '#868e96',
    marginLeft: 28,
    fontStyle: 'italic'
  },
  // Admin-specific styles
  adminInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12
  },
  adminInfoContent: {
    flex: 1
  },
  adminInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1864ab',
    marginBottom: 4
  },
  adminInfoText: {
    fontSize: 13,
    color: '#1864ab',
    lineHeight: 18
  },
  assigneeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assigneeLabel: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 4
  },
  assigneeValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529'
  },
  rotationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  rotationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  rotationMembersList: {
    gap: 8
  },
  rotationMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  rotationMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  currentAssigneeAvatar: {
    backgroundColor: '#007AFF'
  },
  rotationMemberInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  rotationMemberName: {
    fontSize: 14,
    color: '#495057'
  },
  currentAssigneeName: {
    fontWeight: '600',
    color: '#007AFF'
  },
  assignmentsContainer: {
    gap: 12
  },
  assignmentsSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  assignmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  assignmentInfo: {
    flex: 1
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1864ab',
    marginBottom: 4
  },
  assignmentDate: {
    fontSize: 14,
    color: '#495057'
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
  completionCard: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  completionInfo: {
    flex: 1
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  completionDate: {
    fontSize: 14,
    color: '#495057'
  },
  photoPreview: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  photoPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  viewPhotoText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500'
  },
  userNotesCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4
  },
  notesText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20
  },
  adminFeedbackCard: {
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  adminFeedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fa5252',
    marginBottom: 4
  },
  adminFeedbackText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginTop: 12
  },
  viewDetailsText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500'
  },
  adminAssignmentCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8
  },
  adminAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  userAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  assignmentDateSmall: {
    fontSize: 12,
    color: '#868e96'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  adminAssignmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap'
  },
  completedText: {
    fontSize: 12,
    color: '#6c757d'
  },
  hasPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasPhotoText: {
    fontSize: 12,
    color: '#007AFF'
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasNotesText: {
    fontSize: 12,
    color: '#e67700'
  },
  adminNotesPreview: {
    backgroundColor: '#f8f9fa',
    padding: 6,
    borderRadius: 6,
    marginTop: 8
  },
  adminNotesPreviewText: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic'
  },
  moreAssignments: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
  noAssignments: {
    fontSize: 14,
    color: '#868e96',
    fontStyle: 'italic'
  },
  // Member-specific styles
  myAssignmentCard: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  myAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  myAssignmentInfo: {
    flex: 1
  },
  myAssignmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1864ab',
    marginBottom: 4
  },
  myAssignmentDate: {
    fontSize: 14,
    color: '#495057'
  },
  myAssignmentDetails: {
    gap: 6
  },
  myAssignmentDetail: {
    fontSize: 14,
    color: '#495057'
  },
  notAssignedCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    gap: 12
  },
  notAssignedText: {
    fontSize: 16,
    color: '#868e96',
    textAlign: 'center'
  },
  memberInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 12
  },
  memberInfoText: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc9c9',
    marginTop: 16
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fa5252'
  }
});