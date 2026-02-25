// src/screens/TaskAssignmentScreen.tsx - UPDATED with clean UI and consistent colors
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
import { LinearGradient } from 'expo-linear-gradient';
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
              const result = await reassignTask(selectedTask.id, memberId);
              
              if (result.success) {
                Alert.alert('Success', `Task reassigned to ${memberName}`);
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
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.taskCard}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {isRecurring && (
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recurringBadge}
              >
                <MaterialCommunityIcons name="repeat" size={12} color="#2b8a3e" />
                <Text style={styles.recurringText}>Recurring</Text>
              </LinearGradient>
            )}
          </View>
          <LinearGradient
            colors={['#fff3bf', '#ffec99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsBadge}
          >
            <Text style={styles.pointsText}>{item.points} pts</Text>
          </LinearGradient>
        </View>

        {item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock" size={14} color="#868e96" />
            <Text style={styles.detailText}>
              {item.executionFrequency === 'DAILY' ? 'Daily' : 'Weekly'}
              {item.selectedDays?.length > 0 && ` (${item.selectedDays.join(', ')})`}
            </Text>
          </View>
          
          {hasTimeSlots && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#868e96" />
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
                <LinearGradient
                  colors={currentAssignee.role === 'ADMIN' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.assigneeAvatar,
                    currentAssignee.role === 'ADMIN' && styles.adminAvatar
                  ]}
                >
                  <Text style={[
                    styles.assigneeInitial,
                    { color: currentAssignee.role === 'ADMIN' ? 'white' : '#495057' }
                  ]}>
                    {currentAssignee.fullName?.charAt(0) || '?'}
                  </Text>
                </LinearGradient>
                <View style={styles.assigneeInfo}>
                  <Text style={styles.assigneeName}>
                    {currentAssignee.fullName}
                  </Text>
                  <View style={styles.assigneeMeta}>
                    {currentAssignee.role === 'ADMIN' && (
                      <View style={styles.adminIndicator}>
                        <MaterialCommunityIcons name="crown" size={10} color="#2b8a3e" />
                        <Text style={styles.adminText}>Admin</Text>
                      </View>
                    )}
                    {currentAssignee.rotationOrder && (
                      <LinearGradient
                        colors={['#f8f9fa', '#e9ecef']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rotationBadge}
                      >
                        <Text style={styles.rotationOrder}>
                          #{currentAssignee.rotationOrder}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.unassignedContainer}>
                <MaterialCommunityIcons name="account-question" size={20} color="#adb5bd" />
                <Text style={styles.unassignedText}>Not assigned</Text>
              </View>
            )}
            
            {userRole === 'ADMIN' && (
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => handleOpenAssigneeModal(item)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.changeButtonGradient}
                >
                  <MaterialCommunityIcons name="account-switch" size={14} color="white" />
                  <Text style={styles.changeButtonText}>Change</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#495057" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {groupName || 'Task Assignments'}
          </Text>
          <View style={styles.headerStats}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerStat}
            >
              <MaterialCommunityIcons name="format-list-checks" size={12} color="#495057" />
              <Text style={styles.headerStatText}>{tasks.length} tasks</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerStat}
            >
              <MaterialCommunityIcons name="account-group" size={12} color="#495057" />
              <Text style={styles.headerStatText}>{members.length} members</Text>
            </LinearGradient>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => loadData(true)}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#2b8a3e" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData()}
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
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={['#2b8a3e']}
              tintColor="#2b8a3e"
            />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard" size={48} color="#dee2e6" />
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
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedTask?.title}
              </Text>
              <TouchableOpacity 
                onPress={() => !isReassigning && setShowAssigneeModal(false)}
                disabled={isReassigning}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={18} color="#868e96" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Select a member to assign this task for this week:
              </Text>
              
              {/* Assignment Rules Info */}
              <LinearGradient
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoBox}
              >
                <MaterialCommunityIcons name="information" size={16} color="#2b8a3e" />
                <Text style={styles.infoText}>
                  Each member can only be assigned to one task per week
                </Text>
              </LinearGradient>

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
                      <MaterialCommunityIcons name="account-group" size={48} color="#dee2e6" />
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
                      ]}
                      onPress={() => {
                        if (!isCurrentAssignee && !isReassigning) {
                          handleAssignToMember(member.userId, member.fullName);
                        }
                      }}
                      disabled={isReassigning || isCurrentAssignee}
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberInfo}>
                        <LinearGradient
                          colors={member.role === 'ADMIN' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.memberAvatar,
                            isCurrentAssignee && styles.currentAssigneeAvatar
                          ]}
                        >
                          <Text style={[
                            styles.memberInitial,
                            { color: member.role === 'ADMIN' ? 'white' : '#495057' }
                          ]}>
                            {member.fullName?.charAt(0) || '?'}
                          </Text>
                        </LinearGradient>
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
                              member.role === 'ADMIN' && styles.adminRoleText
                            ]}>
                              {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                            </Text>
                            {member.rotationOrder && (
                              <LinearGradient
                                colors={['#f8f9fa', '#e9ecef']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.memberOrderBadge}
                              >
                                <Text style={styles.memberOrder}>
                                  #{member.rotationOrder}
                                </Text>
                              </LinearGradient>
                            )}
                          </View>
                        </View>
                      </View>
                      {isCurrentAssignee ? (
                        <LinearGradient
                          colors={['#d3f9d8', '#b2f2bb']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.currentBadge}
                        >
                          <MaterialCommunityIcons name="check-circle" size={14} color="#2b8a3e" />
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </LinearGradient>
                      ) : (
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
                      )}
                    </TouchableOpacity>
                  );
                });
              })()}

              {/* Already Assigned Members Section */}
              {(() => {
                const assignedMemberIds = getAssignedMembersForWeek();
                const assignedMembers = members.filter(member => 
                  assignedMemberIds.has(member.userId) && 
                  selectedTask?.currentAssignee !== member.userId
                );
                
                if (assignedMembers.length === 0) return null;
                
                return (
                  <>
                    <Text style={styles.sectionHeader}>Already Assigned</Text>
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
                            <LinearGradient
                              colors={['#f8f9fa', '#e9ecef']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={[styles.memberAvatar, styles.disabledAvatar]}
                            >
                              <Text style={[styles.memberInitial, styles.disabledInitial]}>
                                {member.fullName?.charAt(0) || '?'}
                              </Text>
                            </LinearGradient>
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
                                    {assignedTask.title}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          <LinearGradient
                            colors={['#fff5f5', '#ffe3e3']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.assignedBadge}
                          >
                            <MaterialCommunityIcons name="clock" size={14} color="#fa5252" />
                            <Text style={styles.assignedText}>Busy</Text>
                          </LinearGradient>
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
                  <ActivityIndicator size="small" color="#2b8a3e" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 12, 
    color: '#868e96', 
    fontSize: 14 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#212529',
    textAlign: 'center',
    marginBottom: 4
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  headerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerStatText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
  refreshButton: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#fa5252',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 16
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  listContainer: { 
    padding: 16 
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#212529',
    marginBottom: 4
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4
  },
  recurringText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '500'
  },
  pointsBadge: {
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
    color: '#868e96',
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
    color: '#495057'
  },
  assignmentSection: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#868e96',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  adminAvatar: {
    borderColor: '#2b8a3e'
  },
  assigneeInitial: {
    fontWeight: 'bold',
    fontSize: 14
  },
  assigneeInfo: {
    flex: 1
  },
  assigneeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
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
    gap: 2
  },
  adminText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2b8a3e'
  },
  rotationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rotationOrder: {
    fontSize: 10,
    color: '#495057',
    fontWeight: '500'
  },
  unassignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  unassignedText: {
    fontSize: 14,
    color: '#adb5bd',
    fontStyle: 'italic'
  },
  changeButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  changeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  changeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#868e96',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center'
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginRight: 12
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#868e96',
    marginBottom: 12,
    lineHeight: 20
  },
  modalBody: {
    padding: 20
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#b2f2bb'
  },
  infoText: {
    fontSize: 13,
    color: '#2b8a3e',
    flex: 1
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginVertical: 16
  },
  emptyMembersText: {
    fontSize: 15,
    color: '#868e96',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '500'
  },
  emptyMembersSubtext: {
    fontSize: 13,
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
    borderColor: '#2b8a3e',
    borderWidth: 1,
  },
  disabledOption: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa'
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  currentAssigneeAvatar: {
    borderColor: '#2b8a3e',
    borderWidth: 2,
  },
  disabledAvatar: {
    opacity: 0.5
  },
  memberInitial: {
    fontWeight: 'bold',
    fontSize: 16
  },
  disabledInitial: {
    color: '#adb5bd'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2
  },
  currentAssigneeText: {
    color: '#2b8a3e',
    fontWeight: '600'
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
    color: '#868e96'
  },
  adminRoleText: {
    color: '#2b8a3e',
    fontWeight: '600'
  },
  memberOrderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberOrder: {
    fontSize: 10,
    color: '#495057',
    fontWeight: '500'
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '600'
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  assignedText: {
    fontSize: 11,
    color: '#fa5252',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#868e96'
  }
});