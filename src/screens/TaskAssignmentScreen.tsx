// src/screens/TaskAssignmentScreen.tsx - FULLY UPDATED CLEAN VERSION

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  Image
} from 'react-native'; 
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTaskAssignment } from '../taskHook/useTaskAssignment';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext'; 
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { RotationPreviewModal } from '../components/RotationPreviewModal';

export default function TaskAssignmentScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { groupId, groupName, userRole } = route.params || {};
  
  const {
    loading,
    refreshing,
    error,
    tasks,
    members,
    groupInfo,
    loadData,
    reassignTask,
    authError
  } = useTaskAssignment(groupId);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [showRotationPreview, setShowRotationPreview] = useState(false);

  // ===== REAL-TIME UPDATES =====
  const { events: taskEvents, clearTaskUpdated } = useRealtimeTasks(groupId);
  const { events: swapEvents, clearSwapResponded, clearSwapCreated } = useRealtimeSwapRequests(groupId, '');

  // Refresh when tasks are updated
  useEffect(() => {
    if (taskEvents.taskUpdated) {
      console.log('🔄 Task updated in real-time, refreshing assignments...');
      loadData(true);
      clearTaskUpdated();
    }
  }, [taskEvents.taskUpdated, loadData, clearTaskUpdated]);

  // Refresh when swaps happen
  useEffect(() => {
    if (swapEvents.swapResponded || swapEvents.swapCreated) {
      console.log('🔄 Swap event detected, refreshing assignments...');
      loadData(true);
      if (swapEvents.swapResponded) clearSwapResponded();
      if (swapEvents.swapCreated) clearSwapCreated();
    }
  }, [swapEvents.swapResponded, swapEvents.swapCreated, loadData, clearSwapResponded, clearSwapCreated]);

  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📱 TaskAssignmentScreen focused, refreshing data...');
      loadData(true);
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // ===== FILTER MEMBERS: Only those in rotation (exclude admins) =====
  const membersInRotation = useMemo(() => {
    return members.filter(member => 
      member.inRotation === true && 
      member.role !== 'ADMIN'
    );
  }, [members]);

  console.log('📊 [TaskAssignment] Members in rotation:', membersInRotation.length);
  console.log('📊 [TaskAssignment] Total members:', members.length);

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
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  
  const getAssignedMembersForWeek = useCallback(() => {
  const assignedMemberIds = new Set<string>();
  
  console.log('🔍 [getAssignedMembersForWeek] Tasks count:', tasks.length);
  
  tasks.forEach((task: any) => {
    console.log(`   Task: ${task.title}, currentAssignee: ${task.currentAssignee}`);
    
    if (task.currentAssignee) {
      assignedMemberIds.add(task.currentAssignee);
      console.log(`      → Added assignee: ${task.currentAssignee}`);
    }
    
    if (task.assignments && Array.isArray(task.assignments)) {
      task.assignments.forEach((assignment: any) => {
        if (assignment.user && assignment.user.id) {
          assignedMemberIds.add(assignment.user.id);
          console.log(`      → Added from assignments: ${assignment.user.id}`);
        }
      });
    }
  });
  
  console.log('🔍 [getAssignedMembersForWeek] Final assigned IDs:', Array.from(assignedMemberIds));
  return assignedMemberIds;
}, [tasks]);


  // Check if a task is assigned to a member
  const isTaskAssigned = useCallback((task: any) => {
    return task.currentAssignee !== null && task.currentAssignee !== undefined;
  }, []);

  const handleOpenAssigneeModal = useCallback((task: any) => {
    setSelectedTask(task);
    setShowAssigneeModal(true);
  }, []);

  const handleAssignToMember = useCallback(async (memberId: string, memberName: string) => {
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
  }, [selectedTask, reassignTask, loadData]);

  const renderTask = useCallback(({ item }: any) => {
    const currentAssignee = membersInRotation.find(m => m.userId === item.currentAssignee);
    const isRecurring = item.isRecurring;
    const hasTimeSlots = item.timeSlots && item.timeSlots.length > 0;
    const taskAssigned = isTaskAssigned(item);
    
    const isAcquiredViaWeekSwap = 
      (item.acquiredViaSwap === true && item.swapScope === 'week') ||
      (item.assignment?.acquiredViaSwap === true && item.assignment?.swapScope === 'week') ||
      (item.userAssignment?.acquiredViaSwap === true && item.userAssignment?.swapScope === 'week');
    
    const swappedFromName = 
      item.swappedFromName ||
      item.assignment?.swappedFromName ||
      item.userAssignment?.swappedFromName ||
      null;

    return ( 
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          console.log('👆 Navigating to TaskDetails:', item.id);
          navigation.navigate('TaskDetails', {
            taskId: item.id,
            groupId: groupId,
            userRole: userRole
          });
        }}
      >
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.taskCard, 
            { borderColor: theme.border },
            isAcquiredViaWeekSwap && styles.swappedTaskCard
          ]}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              {isRecurring && (
                <LinearGradient
                  colors={[theme.primaryLight, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.recurringBadge}
                >
                  <MaterialCommunityIcons name="repeat" size={12} color={theme.primary} />
                  <Text style={[styles.recurringText, { color: theme.primary }]}>Recurring</Text>
                </LinearGradient>
              )}
            </View>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsBadge}
            >
              <Text style={[styles.pointsText, { color: theme.primary }]}>{item.points} pts</Text>
            </LinearGradient>
          </View>

          {isAcquiredViaWeekSwap && (
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.swapBadge}
            >
              <MaterialCommunityIcons name="swap-vertical" size={12} color="#fff" />
              <Text style={styles.swapBadgeText}>
                Week Swap {swappedFromName ? `from ${swappedFromName}` : '(Exchanged)'}
              </Text>
            </LinearGradient>
          )}

          {item.description && (
            <Text style={[styles.taskDescription, { color: theme.textMuted }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.taskDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar-clock" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.executionFrequency === 'DAILY' ? 'Daily' : 'Weekly'}
                {item.selectedDays?.length > 0 && ` (${item.selectedDays.join(', ')})`}
              </Text>
            </View>
            
            {hasTimeSlots && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                  {item.timeSlots.length} time slot{item.timeSlots.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.assignmentSection, { borderTopColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Assigned to:</Text>
            <View style={styles.assigneeRow}>
              {currentAssignee ? (
                <View style={styles.currentAssignee}>
                  <LinearGradient
                    colors={[theme.bgSecondary, theme.bgTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.assigneeAvatar, { borderColor: theme.border }]}
                  >
                    {currentAssignee.avatarUrl ? (
                      <Image 
                        source={{ uri: currentAssignee.avatarUrl }} 
                        style={styles.assigneeAvatarImage} 
                      />
                    ) : (
                      <Text style={[styles.assigneeInitial, { color: theme.textSecondary }]}>
                        {currentAssignee.fullName?.charAt(0) || '?'}
                      </Text>
                    )}
                  </LinearGradient>
                  <View style={styles.assigneeInfo}>
                    <Text style={[styles.assigneeName, { color: theme.text }]}>
                      {currentAssignee.fullName}
                    </Text>
                    {isAcquiredViaWeekSwap && swappedFromName && (
                      <Text style={[styles.swapNote, { color: '#8B5CF6' }]}>
                        (Received via week swap from {swappedFromName})
                      </Text>
                    )}
                    <View style={styles.assigneeMeta}>
                      {currentAssignee.rotationOrder && (
                        <LinearGradient
                          colors={[theme.bgSecondary, theme.bgTertiary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.rotationBadge}
                        >
                          <Text style={[styles.rotationOrder, { color: theme.textSecondary }]}>
                            #{currentAssignee.rotationOrder}
                          </Text>
                        </LinearGradient>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.unassignedContainer}>
                  <MaterialCommunityIcons name="account-question" size={20} color={theme.textPlaceholder} />
                  <Text style={[styles.unassignedText, { color: theme.textPlaceholder }]}>Not assigned</Text>
                </View>
              )}
              
              {userRole === 'ADMIN' && (
                <TouchableOpacity
                  style={[
                    styles.changeButton,
                    taskAssigned && styles.changeButtonDisabled
                  ]}
                  onPress={() => !taskAssigned && handleOpenAssigneeModal(item)}
                  activeOpacity={taskAssigned ? 0.5 : 0.8}
                  disabled={taskAssigned}
                >
                  <LinearGradient
                    colors={taskAssigned ? [theme.bgTertiary, theme.bgTertiary] : [theme.primary, theme.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.changeButtonGradient}
                  >
                    <MaterialCommunityIcons 
                      name={taskAssigned ? "check" : "account-switch"} 
                      size={14} 
                      color={taskAssigned ? theme.textMuted : "#fff"} 
                    />
                    <Text style={[
                      styles.changeButtonText,
                      taskAssigned && styles.changeButtonTextDisabled,
                      { color: taskAssigned ? theme.textMuted : "#fff" }
                    ]}>
                      {taskAssigned ? "Assigned" : "Change"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [membersInRotation, theme, navigation, groupId, userRole, isTaskAssigned, handleOpenAssigneeModal]);

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading assignments...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* ===== CLEAN HEADER WITH TEST ROTATION BUTTON ===== */}
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        {/* LEFT: Back Button */}
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: theme.card }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
        </TouchableOpacity>
        
        {/* CENTER: Title & Stats */}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {groupName || 'Task Assignments'}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="format-list-checks" size={11} color={theme.textMuted} />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>{tasks.length} tasks</Text>
            </View>
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="account-group" size={11} color={theme.textMuted} />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>{membersInRotation.length} members</Text>
            </View>
          </View>
        </View>
        
        {/* RIGHT: Action Buttons */}
        <View style={styles.headerRight}>
          {/* Test Rotation Button - KEPT USEFUL */}
          <TouchableOpacity 
            style={styles.testRotationButton}
            onPress={() => setShowRotationPreview(true)}
          >
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.testRotationGradient}
            >
              <MaterialCommunityIcons name="sync" size={14} color={theme.primary} />
              <Text style={[styles.testRotationText, { color: theme.primary }]}>Preview</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Refresh Button */}
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => loadData(true)}
            disabled={refreshing}
          >
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.refreshGradient}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <MaterialCommunityIcons name="refresh" size={18} color={theme.primary} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* MAIN CONTENT */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData()}
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
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={[theme.primary]}
              tintColor={theme.primary}
              progressBackgroundColor={theme.bgSecondary}
            />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-list" size={48} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No tasks found</Text>
              <Text style={[styles.emptySubtext, { color: theme.textPlaceholder }]}>
                Create tasks in the Tasks screen first
              </Text>
            </View>
          }
        />
      )}

      {/* MODALS */}
      <Modal
        visible={showAssigneeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isReassigning && setShowAssigneeModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                {selectedTask?.title}
              </Text>
              <TouchableOpacity  
                onPress={() => !isReassigning && setShowAssigneeModal(false)}
                disabled={isReassigning}
                style={[styles.closeButton, { backgroundColor: theme.bgSecondary }]} 
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                Select a member to assign this task for this week:
              </Text>
              
              <LinearGradient
                colors={[theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.infoBox, { borderColor: theme.primaryBorder }]}
              >
                <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
                <Text style={[styles.infoText, { color: theme.primary }]}>
                  Each member can only be assigned to one task per week
                </Text>
              </LinearGradient>

              <Text style={[styles.sectionHeader, { color: theme.text, borderBottomColor: theme.border }]}>
                Available Members
              </Text>
              
              {(() => {
                const assignedMemberIds = getAssignedMembersForWeek();
                const availableMembers = membersInRotation.filter(member => 
                  !assignedMemberIds.has(member.userId)
                );
                console.log('🔍 MODAL - availableMembers length:', availableMembers.length);
console.log('🔍 MODAL - availableMembers:', availableMembers.map(m => m.fullName));
                if (availableMembers.length === 0) {
                  return (
                    <View style={[styles.emptyMembers, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                      <MaterialCommunityIcons name="account-group" size={48} color={theme.border} />
                      <Text style={[styles.emptyMembersText, { color: theme.textMuted }]}>
                        No available members in rotation
                      </Text>
                      <Text style={[styles.emptyMembersSubtext, { color: theme.textPlaceholder }]}>
                        All members are already assigned or there are no members in rotation
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
                        { backgroundColor: theme.bgSecondary, borderColor: theme.border }
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
                          colors={[theme.bgSecondary, theme.bgTertiary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.memberAvatar,
                            isCurrentAssignee && styles.currentAssigneeAvatar,
                            { borderColor: theme.border }
                          ]}
                        >
                          {member.avatarUrl ? (
                            <Image 
                              source={{ uri: member.avatarUrl }} 
                              style={styles.memberAvatarImage} 
                            />
                          ) : (
                            <Text style={[styles.memberInitial, { color: theme.textSecondary }]}>
                              {member.fullName?.charAt(0) || '?'}
                            </Text>
                          )}
                        </LinearGradient>
                        <View style={styles.memberDetails}>
                          <Text style={[
                            styles.memberName,
                            isCurrentAssignee && styles.currentAssigneeText,
                            { color: isCurrentAssignee ? theme.primary : theme.text }
                          ]}>
                            {member.fullName}
                            {isCurrentAssignee && ' (Current)'}
                          </Text>
                          <View style={styles.memberMeta}>
                            <Text style={[styles.memberRole, { color: theme.textMuted }]}>Member</Text>
                            {member.rotationOrder && (
                              <LinearGradient
                                colors={[theme.bgSecondary, theme.bgTertiary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.memberOrderBadge}
                              >
                                <Text style={[styles.memberOrder, { color: theme.textSecondary }]}>
                                  #{member.rotationOrder}
                                </Text>
                              </LinearGradient>
                            )}
                          </View>
                        </View>
                      </View>
                      {isCurrentAssignee ? (
                        <LinearGradient
                          colors={[theme.primaryLight, theme.primaryLight]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.currentBadge}
                        >
                          <MaterialCommunityIcons name="check-circle" size={14} color={theme.primary} />
                          <Text style={[styles.currentBadgeText, { color: theme.primary }]}>Current</Text>
                        </LinearGradient>
                      ) : (
                        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                });
              })()}

              {(() => {
                const assignedMemberIds = getAssignedMembersForWeek();
                const assignedMembers = membersInRotation.filter(member => 
                  assignedMemberIds.has(member.userId) && 
                  selectedTask?.currentAssignee !== member.userId
                );
                
                if (assignedMembers.length === 0) return null;
                
                return (
                  <>
                    <Text style={[styles.sectionHeader, { color: theme.text, borderBottomColor: theme.border }]}>
                      Already Assigned
                    </Text>
                    {assignedMembers.map(member => {
                      const assignedTask = tasks.find((task: any) => 
                        task.currentAssignee === member.userId
                      );
                      
                      return (
                        <View
                          key={member.userId}
                          style={[styles.memberOption, styles.disabledOption, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                        >
                          <View style={styles.memberInfo}>
                            <LinearGradient
                              colors={[theme.bgSecondary, theme.bgTertiary]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={[styles.memberAvatar, styles.disabledAvatar, { borderColor: theme.border }]}
                            >
                              {member.avatarUrl ? (
                                <Image 
                                  source={{ uri: member.avatarUrl }} 
                                  style={[styles.memberAvatarImage, styles.disabledAvatarImage]} 
                                />
                              ) : (
                                <Text style={[styles.memberInitial, styles.disabledInitial, { color: theme.textPlaceholder }]}>
                                  {member.fullName?.charAt(0) || '?'}
                                </Text>
                              )}
                            </LinearGradient>
                            <View style={styles.memberDetails}>
                              <Text style={[styles.memberName, styles.disabledText, { color: theme.textPlaceholder }]}>
                                {member.fullName}
                              </Text>
                              <View style={styles.memberMeta}>
                                <Text style={[styles.memberRole, styles.disabledText, { color: theme.textPlaceholder }]}>Member</Text>
                                {assignedTask && (
                                  <Text style={[styles.memberOrder, styles.disabledText, { color: theme.textPlaceholder }]}>
                                    {assignedTask.title}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          <LinearGradient
                            colors={[theme.errorBg, theme.errorBg]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.assignedBadge}
                          >
                            <MaterialCommunityIcons name="clock" size={14} color={theme.error} />
                            <Text style={[styles.assignedText, { color: theme.error }]}>Busy</Text>
                          </LinearGradient>
                        </View>
                      );
                    })}
                  </>
                );
              })()}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, isReassigning && styles.disabledButton, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                onPress={() => !isReassigning && setShowAssigneeModal(false)}
                disabled={isReassigning}
              >
                {isReassigning ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
      
      {/* Rotation Preview Modal - Preview ONLY, no apply button */}
      <RotationPreviewModal
        visible={showRotationPreview}
        onClose={() => setShowRotationPreview(false)}
        groupId={groupId}
        groupName={groupName}
      />
    </ScreenWrapper>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 14 
  },
  
  // ===== HEADER STYLES =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 70,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: 180,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  statText: {
    fontSize: 10,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testRotationButton: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  testRotationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderRadius: 20,
  },
  testRotationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  refreshGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== ERROR STYLES =====
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
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
  
  // ===== LIST STYLES =====
  listContainer: { 
    padding: 16 
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  swappedTaskCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
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
  },
  swapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    gap: 6,
  },
  swapBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  swapNote: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  taskDescription: {
    fontSize: 14,
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
  },
  assignmentSection: {
    borderTopWidth: 1,
    paddingTop: 12
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
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
    overflow: 'hidden',
  },
  assigneeAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  assigneeInitial: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  assigneeInfo: {
    flex: 1  },
  assigneeName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2
  },
  assigneeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rotationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rotationOrder: {
    fontSize: 10,
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
    fontStyle: 'italic'
  },
  changeButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 8,
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  changeButtonText: {
    fontWeight: '600',
    fontSize: 12
  },
  changeButtonTextDisabled: {},
  
  // ===== EMPTY STATE =====
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600'
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center'
  },
  
  // ===== MODAL STYLES =====
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%', 
    overflow: 'hidden',
    flex:1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20
  },
  modalBody: {
    flexShrink: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    flex: 1
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  emptyMembers: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 16
  },
  emptyMembersText: {
    fontSize: 15,
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '500'
  },
  emptyMembersSubtext: {
    fontSize: 13,
    textAlign: 'center'
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  currentAssigneeOption: {
    borderWidth: 2,
  },
  disabledOption: {
    opacity: 0.6,
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
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  disabledAvatarImage: {
    opacity: 0.5,
  },
  currentAssigneeAvatar: { 
    borderWidth: 2,
  },
  disabledAvatar: {
    opacity: 0.5
  },
  memberInitial: {
    fontWeight: 'bold',
    fontSize: 16, 
  },
  disabledInitial: {},
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2
  },
  currentAssigneeText: {
    fontWeight: '600'
  },
  disabledText: {},
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  memberRole: {
    fontSize: 12,
  },
  memberOrderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberOrder: {
    fontSize: 10,
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
    fontWeight: '600'
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.5  
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  }, 
});