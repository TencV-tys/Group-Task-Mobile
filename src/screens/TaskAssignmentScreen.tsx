// src/screens/TaskAssignmentScreen.tsx - UPDATED WITH NO DUPLICATE ASSIGNMENTS
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTaskAssignment } from '../taskHook/useTaskAssignment';

export default function TaskAssignmentScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  
  const {
    loading,
    refreshing,
    error,
    tasks,
    members,
    groupInfo,
    loadData,
    reassignTask
  } = useTaskAssignment(groupId);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  // Get members already assigned to tasks for current week
  const getAssignedMembersForWeek = () => {
    const assignedMemberIds = new Set<string>();
    
    tasks.forEach((task: any) => {
      if (task.currentAssignee) {
        assignedMemberIds.add(task.currentAssignee);
      }
      
      // Also check assignments for current week
      if (task.assignments && Array.isArray(task.assignments)) {
        task.assignments.forEach((assignment: any) => {
          if (assignment.user && assignment.user.id) {
            assignedMemberIds.add(assignment.user.id);
          }
        });
      }
    });
    
    return assignedMemberIds;
  };

  const handleOpenAssigneeModal = (task: any) => {
    setSelectedTask(task);
    setShowAssigneeModal(true);
  };

  const handleAssignToMember = async (memberId: string, memberName: string) => {
    if (!selectedTask) return;

    // Check if trying to assign to same user
    if (selectedTask.currentAssignee === memberId) {
      Alert.alert('Already Assigned', `This task is already assigned to ${memberName}`);
      return;
    }

    Alert.alert(
      'Assign Task',
      `Assign "${selectedTask.title}" to ${memberName} for this week?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          style: 'destructive',
          onPress: async () => {
            setIsReassigning(true);
            try {
              // Use the reassignTask method
              const result = await reassignTask(selectedTask.id, memberId);
              
              if (result.success) {
                Alert.alert('Success', `Task reassigned to ${memberName}`);
                
                // Refresh the data to show updated assignments
                await loadData(true);
                setShowAssigneeModal(false);
              } else {
                Alert.alert('Error', result.message || 'Failed to reassign task');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reassign task');
            } finally {
              setIsReassigning(false);
            }
          }
        }
      ]
    );
  };

  const renderTask = ({ item }: any) => {
    const currentAssignee = members.find(m => m.userId === item.currentAssignee);
    const isRecurring = item.isRecurring;
    const hasTimeSlots = item.timeSlots && item.timeSlots.length > 0;

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {isRecurring && (
              <View style={styles.recurringBadge}>
                <MaterialCommunityIcons name="repeat" size={12} color="#007AFF" />
                <Text style={styles.recurringText}>Recurring</Text>
              </View>
            )}
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{item.points} pts</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )} 

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock" size={14} color="#666" />
            <Text style={styles.detailText}>
              {item.executionFrequency === 'DAILY' ? 'Daily' : 'Weekly'}
              {item.selectedDays?.length > 0 && ` (${item.selectedDays.join(', ')})`}
            </Text>
          </View>
          
          {hasTimeSlots && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                {item.timeSlots.length} time slot{item.timeSlots.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.assignmentSection}>
          <Text style={styles.sectionLabel}>Assigned to:</Text>
          <View style={styles.assigneeRow}>
            {currentAssignee ? (
              <View style={styles.currentAssignee}>
                <View style={[
                  styles.assigneeAvatar,
                  currentAssignee.role === 'ADMIN' && styles.adminAvatar
                ]}>
                  <Text style={styles.assigneeInitial}>
                    {currentAssignee.fullName?.charAt(0) || '?'}
                  </Text>
                </View>
                <View style={styles.assigneeInfo}>
                  <Text style={styles.assigneeName}>
                    {currentAssignee.fullName}
                  </Text>
                  <View style={styles.assigneeMeta}>
                    {currentAssignee.role === 'ADMIN' && (
                      <View style={styles.adminIndicator}>
                        <MaterialCommunityIcons name="crown" size={10} color="#FFD700" />
                        <Text style={styles.adminText}>Admin</Text>
                      </View>
                    )}
                    {currentAssignee.rotationOrder && (
                      <Text style={styles.rotationOrder}>
                        Rotation #{currentAssignee.rotationOrder}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.unassignedContainer}>
                <MaterialCommunityIcons name="account-question" size={20} color="#999" />
                <Text style={styles.unassignedText}>Not assigned</Text>
              </View>
            )}
            
            {userRole === 'ADMIN' && (
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => handleOpenAssigneeModal(item)}
              >
                <MaterialCommunityIcons name="account-switch" size={16} color="#fff" />
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {groupName || 'Task Assignments'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {groupInfo?.currentRotationWeek ? `Week ${groupInfo.currentRotationWeek}` : ''}
          </Text>
          <Text style={styles.headerSubtitle}>
            {tasks.length} tasks • {members.length} members
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => loadData(true)}
          disabled={refreshing}
        >
          <MaterialCommunityIcons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#ccc" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={['#007AFF']}
            />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No tasks found</Text>
              <Text style={styles.emptySubtext}>
                Create tasks in the Tasks screen first
              </Text>
            </View>
          }
        />
      )}

      {/* Assignee Selection Modal */}
      <Modal
        visible={showAssigneeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isReassigning && setShowAssigneeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Assign "{selectedTask?.title}"
              </Text>
              <TouchableOpacity 
                onPress={() => !isReassigning && setShowAssigneeModal(false)}
                disabled={isReassigning}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={24} 
                  color={isReassigning ? "#ccc" : "#000"} 
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                Select a member to assign this task to for the current week:
              </Text>
              
              {/* Assignment Rules Info */}
              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color="#007AFF" />
                <Text style={styles.infoText}>
                  Each member can only be assigned to one task per week
                </Text>
              </View>

              {/* Available Members Section */}
              <Text style={styles.sectionHeader}>Available Members</Text>
              
              {(() => {
                const assignedMemberIds = getAssignedMembersForWeek();
                const availableMembers = members.filter(member => 
                  !assignedMemberIds.has(member.userId)
                );
                
                if (availableMembers.length === 0) {
                  return (
                    <View style={styles.emptyMembers}>
                      <MaterialCommunityIcons name="account-group" size={48} color="#ccc" />
                      <Text style={styles.emptyMembersText}>
                        No available members
                      </Text>
                      <Text style={styles.emptyMembersSubtext}>
                        All members are already assigned to tasks this week
                      </Text>
                    </View>
                  );
                }
                
                return availableMembers.map(member => {
                  const isCurrentAssignee = selectedTask?.currentAssignee === member.userId;
                  
                  return (
                    <TouchableOpacity
                      key={member.userId}
                      style={[
                        styles.memberOption,
                        isCurrentAssignee && styles.currentAssigneeOption,
                        isCurrentAssignee && styles.disabledOption
                      ]}
                      onPress={() => {
                        if (!isCurrentAssignee) {
                          handleAssignToMember(member.userId, member.fullName);
                        }
                      }}
                      disabled={isReassigning || isCurrentAssignee}
                    >
                      <View style={styles.memberInfo}>
                        <View style={[
                          styles.memberAvatar,
                          member.role === 'ADMIN' && styles.adminMemberAvatar,
                          isCurrentAssignee && styles.currentAssigneeAvatar
                        ]}>
                          <Text style={[
                            styles.memberInitial,
                            isCurrentAssignee && styles.currentAssigneeInitial
                          ]}>
                            {member.fullName?.charAt(0) || '?'}
                          </Text>
                        </View>
                        <View style={styles.memberDetails}>
                          <Text style={[
                            styles.memberName,
                            isCurrentAssignee && styles.currentAssigneeText
                          ]}>
                            {member.fullName}
                            {isCurrentAssignee && ' (Current)'}
                          </Text>
                          <View style={styles.memberMeta}>
                            <Text style={[
                              styles.memberRole,
                              member.role === 'ADMIN' && styles.adminRoleText,
                              isCurrentAssignee && styles.currentAssigneeText
                            ]}>
                              {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                            </Text>
                            {member.rotationOrder && (
                              <Text style={[
                                styles.memberOrder,
                                isCurrentAssignee && styles.currentAssigneeText
                              ]}>
                                Rotation #{member.rotationOrder}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                      {isCurrentAssignee ? (
                        <View style={styles.currentBadge}>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#28a745" />
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      ) : (
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#6c757d" />
                      )}
                    </TouchableOpacity>
                  );
                });
              })()}

              {/* Already Assigned Members Section (for reference) */}
              {(() => {
                const assignedMemberIds = getAssignedMembersForWeek();
                const assignedMembers = members.filter(member => 
                  assignedMemberIds.has(member.userId) && 
                  selectedTask?.currentAssignee !== member.userId
                );
                
                if (assignedMembers.length === 0) return null;
                
                return (
                  <>
                    <Text style={styles.sectionHeader}>Already Assigned (Cannot Select)</Text>
                    {assignedMembers.map(member => {
                      const assignedTask = tasks.find((task: any) => 
                        task.currentAssignee === member.userId
                      );
                      
                      return (
                        <View
                          key={member.userId}
                          style={[styles.memberOption, styles.disabledOption]}
                        >
                          <View style={styles.memberInfo}>
                            <View style={[
                              styles.memberAvatar,
                              member.role === 'ADMIN' && styles.adminMemberAvatar,
                              styles.disabledAvatar
                            ]}>
                              <Text style={[
                                styles.memberInitial,
                                styles.disabledInitial
                              ]}>
                                {member.fullName?.charAt(0) || '?'}
                              </Text>
                            </View>
                            <View style={styles.memberDetails}>
                              <Text style={[styles.memberName, styles.disabledText]}>
                                {member.fullName}
                              </Text>
                              <View style={styles.memberMeta}>
                                <Text style={[styles.memberRole, styles.disabledText]}>
                                  {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                                </Text>
                                {assignedTask && (
                                  <Text style={[styles.memberOrder, styles.disabledText]}>
                                    Assigned to: {assignedTask.title}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          <View style={styles.alreadyAssignedBadge}>
                            <MaterialCommunityIcons name="clock" size={20} color="#ff6b35" />
                            <Text style={styles.alreadyAssignedText}>Busy</Text>
                          </View>
                        </View>
                      );
                    })}
                  </>
                );
              })()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isReassigning && styles.disabledButton]}
                onPress={() => !isReassigning && setShowAssigneeModal(false)}
                disabled={isReassigning}
              >
                {isReassigning ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#000',
    textAlign: 'center'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
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
    marginVertical: 16,
    fontSize: 16
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  listContainer: { padding: 16 },
  taskCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 8
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4
  },
  recurringText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500'
  },
  pointsBadge: {
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e67700'
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  taskDetails: {
    gap: 6,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  detailText: {
    fontSize: 13,
    color: '#666'
  },
  assignmentSection: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8
  },
  assigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  currentAssignee: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10
  },
  assigneeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  adminAvatar: {
    backgroundColor: '#007AFF'
  },
  assigneeInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  assigneeInfo: {
    flex: 1
  },
  assigneeName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2
  },
  assigneeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  adminIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2
  },
  adminText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700'
  },
  rotationOrder: {
    fontSize: 10,
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  unassignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  unassignedText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic'
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6
  },
  changeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center'
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 12
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  modalBody: {
    padding: 20
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  // New Styles for Filtering
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8
  },
  infoText: {
    fontSize: 13,
    color: '#1864ab',
    flex: 1
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  emptyMembers: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginVertical: 16
  },
  emptyMembersText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '500'
  },
  emptyMembersSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center'
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  currentAssigneeOption: {
    backgroundColor: '#f1f3f5',
    borderColor: '#dee2e6'
  },
  disabledOption: {
    opacity: 0.6
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  adminMemberAvatar: {
    backgroundColor: '#007AFF'
  },
  currentAssigneeAvatar: {
    backgroundColor: '#28a745'
  },
  disabledAvatar: {
    backgroundColor: '#adb5bd'
  },
  memberInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  currentAssigneeInitial: {
    color: '#fff'
  },
  disabledInitial: {
    color: '#e9ecef'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2
  },
  currentAssigneeText: {
    color: '#6c757d'
  },
  disabledText: {
    color: '#adb5bd'
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  memberRole: {
    fontSize: 12,
    color: '#666'
  },
  adminRoleText: {
    color: '#007AFF',
    fontWeight: '600'
  },
  memberOrder: {
    fontSize: 11,
    color: '#6c757d',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  currentBadgeText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600'
  },
  alreadyAssignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  alreadyAssignedText: {
    fontSize: 12,
    color: '#ff6b35',
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  disabledButton: {
    opacity: 0.5  
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  }
});