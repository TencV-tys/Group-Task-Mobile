// src/screens/CreateSwapRequestScreen.tsx - UPDATED with fixes
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import { GroupMembersService } from '../services/GroupMemberService';

type CreateSwapRequestRouteParams = {
  assignmentId: string;
  groupId: string;
  taskTitle?: string;
  dueDate?: string;
  taskPoints?: number;
  timeSlot?: string;
  executionFrequency?: 'DAILY' | 'WEEKLY';
  timeSlots?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
  }>;
  selectedDay?: string;
  assignmentDay?: string;
  selectedTimeSlotId?: string;
};

const DAYS_OF_WEEK = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
];

export const CreateSwapRequestScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: CreateSwapRequestRouteParams }, 'params'>>();
  const { 
    assignmentId, 
    groupId, 
    taskTitle, 
    dueDate, 
    taskPoints, 
    timeSlot,
    executionFrequency,
    timeSlots,
    selectedDay: propSelectedDay,
    assignmentDay,
    selectedTimeSlotId: propSelectedTimeSlotId
  } = route.params;
  
  const { createSwapRequest, loading } = useSwapRequests();
  
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [reason, setReason] = useState('');
  const [targetUserId, setTargetUserId] = useState<string | undefined>(undefined);
  const [expiresIn, setExpiresIn] = useState<'24h' | '48h' | '72h' | 'never'>('48h');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [canSwap, setCanSwap] = useState<{ canSwap: boolean; reason?: string }>({ canSwap: true });
  const [checking, setChecking] = useState(true);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  
  const [swapScope, setSwapScope] = useState<'week' | 'day'>('day');
  const [selectedDay, setSelectedDay] = useState<string | null>(
    propSelectedDay || assignmentDay || null
  );
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(
    propSelectedTimeSlotId || null
  );

  // Get the current day of the week for this assignment
  useEffect(() => {
    if (dueDate) {
      const date = new Date(dueDate);
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayFromDate = dayNames[date.getDay()];
      
      if (!selectedDay && dueDate) {
        setSelectedDay(dayFromDate);
      }
    }
  }, [dueDate]);

  // Load group members
  useEffect(() => {
    loadGroupMembers();
    checkSwapAvailability();
  }, [groupId, assignmentId]);

  const loadGroupMembers = async () => {
    setLoadingMembers(true);
    try {
      console.log('📥 Loading members for group:', groupId);
      const result = await GroupMembersService.getGroupMembers(groupId);
      
      if (result.success) {
        // Filter only active members
        const activeMembers = (result.members || []).filter((m: any) => m.isActive !== false);
        setMembers(activeMembers);
        console.log(`✅ Loaded ${activeMembers.length} active members`);
      } else {
        console.error('Failed to load members:', result.message);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // In checkSwapAvailability function
const checkSwapAvailability = async () => {
  setChecking(true);
  try {
    // Pass the scope to the backend
    const result = await SwapRequestService.checkCanSwap(assignmentId, swapScope);
    console.log('📦 Check swap result:', result);
    
    if (result.success) {
      setCanSwap({
        canSwap: result.canSwap || false,
        reason: result.reason
      });
      
      if (result.existingRequestId) {
        setExistingRequest({ id: result.existingRequestId });
      }
    }
  } catch (error) {
    console.error('Failed to check swap availability:', error);
  } finally {
    setChecking(false);
  }
};
  const calculateExpiryDate = (): string | undefined => {
    if (expiresIn === 'never') return undefined;
    
    const now = new Date();
    switch (expiresIn) {
      case '24h':
        now.setHours(now.getHours() + 24);
        break;
      case '48h':
        now.setHours(now.getHours() + 48);
        break;
      case '72h':
        now.setHours(now.getHours() + 72);
        break;
    }
    return now.toISOString();
  };

  const handleSubmit = async () => {
  if (!canSwap.canSwap) {
    Alert.alert('Cannot Swap', canSwap.reason || 'This assignment cannot be swapped');
    return;
  }

  if (swapScope === 'day') {
    if (!selectedDay) {
      Alert.alert('Error', 'Cannot determine which day to swap. Please try again.');
      return;
    }
  }

  try {
    console.log('📝 Submitting swap request:', {
      assignmentId,
      reason: reason.trim() || undefined,
      targetUserId,
      expiresAt: calculateExpiryDate(),
      scope: swapScope,
      selectedDay: swapScope === 'day' ? (selectedDay || undefined) : undefined,
      selectedTimeSlotId: swapScope === 'day' ? (selectedTimeSlotId || undefined) : undefined,
    });

    const result = await createSwapRequest({
      assignmentId,
      reason: reason.trim() || undefined,
      targetUserId, 
      expiresAt: calculateExpiryDate(),
      scope: swapScope,
      selectedDay: swapScope === 'day' ? (selectedDay || undefined) : undefined,
      selectedTimeSlotId: swapScope === 'day' ? (selectedTimeSlotId || undefined) : undefined,
    });

    console.log('📦 Swap request result:', result);

    if (result.success) {
      Alert.alert(
        '✅ Success',
        swapScope === 'day' 
          ? `Swap request created for ${selectedDay}!` 
          : 'Swap request created for the entire week!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      // Handle specific error messages
      if (result.message?.includes('already exists') || result.message?.includes('pending')) {
        Alert.alert(
          '⚠️ Request Already Exists',
          'You already have a pending swap request for this assignment. Would you like to view it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'View Request', 
              onPress: () => {
                if (existingRequest?.id) {
                  // ✅ FIXED: Use navigation.getParent() or direct navigation
                  // This is the simplest fix - go back first then navigate
                  navigation.goBack();
                  setTimeout(() => {
                    // @ts-ignore - Ignore TypeScript error for navigation
                    navigation.navigate('SwapRequestDetails', { requestId: existingRequest.id });
                  }, 100);
                } else {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('❌ Error', result.message || 'Failed to create swap request');
      }
    }
  } catch (error: any) {
    console.error('❌ Error in handleSubmit:', error);
    Alert.alert('Error', error.message || 'Failed to create swap request');
  }
};

const getSelectedMemberName = () => {
  if (!targetUserId) return 'Anyone can accept';
  const member = members.find(m => m.userId === targetUserId);
  return member?.user?.fullName || 'Selected user';
};

if (checking || loadingMembers) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.loadingText}>Checking availability...</Text>
    </View>
  );
}

const isDailyTask = executionFrequency === 'DAILY';
const hasMultipleTimeSlots = timeSlots && timeSlots.length > 1;
const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A';

// If there's an existing pending request, show a message
if (existingRequest && canSwap.canSwap === false && canSwap.reason?.includes('pending')) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Swap</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.centerContainer}>
        <Ionicons name="time" size={64} color="#F59E0B" />
        <Text style={styles.pendingTitle}>Pending Request Exists</Text>
        <Text style={styles.pendingText}>
          You already have a pending swap request for this assignment.
        </Text>
        <TouchableOpacity
          style={styles.viewRequestButton}
          onPress={() => {
            if (existingRequest?.id) {
              // ✅ FIXED: Cast navigation to any
              (navigation as any).navigate('SwapRequestDetails', { requestId: existingRequest.id });
            }
          }}
        >
          <Text style={styles.viewRequestButtonText}>View Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Swap</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Assignment Info Card */}
          <View style={styles.assignmentCard}>
            <View style={styles.cardHeader}>
              <View style={styles.taskIconContainer}>
                <Ionicons name="swap-horizontal" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.cardTitle}>Assignment Details</Text>
            </View>
            
            <Text style={styles.taskTitle}>{taskTitle || 'Task'}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formattedDueDate}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{timeSlot || 'Scheduled time'}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="star-outline" size={16} color="#F59E0B" />
                <Text style={styles.detailLabel}>Points</Text>
                <Text style={[styles.detailValue, styles.pointsValue]}>{taskPoints || 0}</Text>
              </View>
            </View>

            {selectedDay && (
              <View style={styles.assignmentDayBadge}>
                <Ionicons name="today" size={14} color="#4F46E5" />
                <Text style={styles.assignmentDayText}>
                  This assignment is for: <Text style={styles.assignmentDayBold}>{selectedDay}</Text>
                </Text>
              </View>
            )}
            
            <View style={styles.frequencyBadge}>
              <Ionicons 
                name={isDailyTask ? "calendar" : "calendar-week" as any} 
                size={14} 
                color="#6B7280" 
              />
              <Text style={styles.frequencyText}>
                {isDailyTask ? 'Daily Task' : 'Weekly Task'}
              </Text>
            </View>
          </View>

          {/* Swap Status */}
          {!canSwap.canSwap && (
            <View style={styles.warningCard}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Cannot Request Swap</Text>
                <Text style={styles.warningText}>{canSwap.reason}</Text>
              </View>
            </View>
          )}

          {canSwap.canSwap && (
            <>
              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={24} color="#4F46E5" />
                <View style={styles.infoBannerContent}>
                  <Text style={styles.infoBannerTitle}>Swap this specific day</Text>
                  <Text style={styles.infoBannerText}>
                    You're swapping the assignment for {selectedDay || 'this day'}. 
                    The person who accepts will take over this day only.
                  </Text>
                </View>
              </View>

              {/* Target User Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Swap With</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowMemberSelector(!showMemberSelector)}
                >
                  <View style={styles.selectorContent}>
                    <Ionicons 
                      name={targetUserId ? "person" : "people"} 
                      size={20} 
                      color="#4F46E5" 
                    />
                    <Text style={styles.selectorText}>{getSelectedMemberName()}</Text>
                  </View>
                  <Ionicons 
                    name={showMemberSelector ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>

                {showMemberSelector && (
                  <View style={styles.memberList}>
                    <TouchableOpacity
                      style={styles.memberItem}
                      onPress={() => {
                        setTargetUserId(undefined);
                        setShowMemberSelector(false);
                      }}
                    >
                      <View style={styles.memberInfo}>
                        <View style={[styles.avatar, styles.anyoneAvatar]}>
                          <Ionicons name="people" size={20} color="#FFFFFF" />
                        </View>
                        <View>
                          <Text style={styles.memberName}>Anyone can accept</Text>
                          <Text style={styles.memberRole}>Any group member</Text>
                        </View>
                      </View>
                      {!targetUserId && (
                        <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                    
                    {members.length > 0 ? (
                      members.map(member => (
                        <TouchableOpacity
                          key={member.userId}
                          style={styles.memberItem}
                          onPress={() => {
                            setTargetUserId(member.userId);
                            setShowMemberSelector(false);
                          }}
                        >
                          <View style={styles.memberInfo}>
                            <View style={styles.avatar}>
                              {member.user?.avatarUrl ? (
                                <Image 
                                  source={{ uri: member.user.avatarUrl }} 
                                  style={styles.avatarImage} 
                                />
                              ) : (
                                <Text style={styles.avatarText}>
                                  {member.user?.fullName?.charAt(0).toUpperCase() || '?'}
                                </Text>
                              )}
                            </View>
                            <View>
                              <Text style={styles.memberName}>{member.user?.fullName || 'Unknown'}</Text>
                              <Text style={styles.memberRole}>
                                {member.groupRole === 'ADMIN' ? 'Admin' : 'Member'}
                              </Text>
                            </View>
                          </View>
                          {targetUserId === member.userId && (
                            <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noMembersContainer}>
                        <Text style={styles.noMembersText}>No active members found</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Expiry Setting */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Request Expires</Text>
                <View style={styles.expiryOptions}>
                  {(['24h', '48h', '72h', 'never'] as const).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.expiryOption,
                        expiresIn === option && styles.expiryOptionActive,
                      ]}
                      onPress={() => setExpiresIn(option)}
                    >
                      <Text
                        style={[
                          styles.expiryOptionText,
                          expiresIn === option && styles.expiryOptionTextActive,
                        ]}
                      >
                        {option === 'never' ? 'Never' : option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reason Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reason (Optional)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Why do you need to swap this task?"
                  placeholderTextColor="#9CA3AF"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Info Note */}
              <View style={styles.infoNote}>
                <Ionicons name="information-circle" size={20} color="#4F46E5" />
                <Text style={styles.infoText}>
                  You're swapping the assignment for <Text style={styles.infoBold}>{selectedDay || 'this day'}</Text>. 
                  The rest of your week's assignments remain yours.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* Submit Button */}
        {canSwap.canSwap && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {selectedDay
                      ? `Swap ${selectedDay.slice(0, 3)}'s Assignment`
                      : 'Create Swap Request'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 16,
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  viewRequestButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  viewRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  pointsValue: {
    color: '#F59E0B',
  },
  assignmentDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  assignmentDayText: {
    fontSize: 13,
    color: '#4B5563',
  },
  assignmentDayBold: {
    fontWeight: '700',
    color: '#4F46E5',
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  frequencyText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#EF4444',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
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
  selectorButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  memberList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anyoneAvatar: {
    backgroundColor: '#9CA3AF',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  memberRole: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  noMembersContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 14,
    color: '#6B7280',
  },
  expiryOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  expiryOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  expiryOptionActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  expiryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  expiryOptionTextActive: {
    color: '#FFFFFF',
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: '#4F46E5',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});