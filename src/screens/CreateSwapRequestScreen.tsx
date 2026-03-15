// src/screens/CreateSwapRequestScreen.tsx - UPDATED with dark gray primary color
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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import { GroupMembersService } from '../services/GroupMemberService';
import { ScreenWrapper } from '../components/ScreenWrapper';

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
  scope?: 'week' | 'day';
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
    selectedTimeSlotId: propSelectedTimeSlotId,
    scope: propScope
  } = route.params;
  
  const { createSwapRequest, loading,authError } = useSwapRequests();
  
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [reason, setReason] = useState('');
  const [targetUserId, setTargetUserId] = useState<string | undefined>(undefined);
  const [expiresIn, setExpiresIn] = useState<'24h' | '48h' | '72h' | 'never'>('48h');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [canSwap, setCanSwap] = useState<{ canSwap: boolean; reason?: string }>({ canSwap: true });
  const [checking, setChecking] = useState(true);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  
  const [swapScope, setSwapScope] = useState<'week' | 'day'>(propScope || 'day');
  const [selectedDay, setSelectedDay] = useState<string | null>(
    propSelectedDay || assignmentDay || null
  );
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(
    propSelectedTimeSlotId || null
  );


useEffect(() => {
  if (authError) {
    Alert.alert(
      'Session Expired',
      'Please log in again',
      [{ 
        text: 'OK', 
        onPress: () => {
          // @ts-ignore
          navigation.navigate('Login');
        }
      }]
    );
  }
}, [authError]);

  // Get the current day of the week for this assignment
  useEffect(() => {
    if (dueDate && !selectedDay) {
      const date = new Date(dueDate);
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayFromDate = dayNames[date.getDay()];
      setSelectedDay(dayFromDate);
    }
  }, [dueDate]);

  // Load group members
  useEffect(() => {
    loadGroupMembers();
  }, [groupId]);

  // Check swap availability when scope changes
  useEffect(() => {
    if (assignmentId) {
      checkSwapAvailability();
    } 
  }, [assignmentId, swapScope]);

  const loadGroupMembers = async () => {
    setLoadingMembers(true);
    try {
      console.log('📥 Loading members for group:', groupId);
      const result = await GroupMembersService.getGroupMembers(groupId);
      
      if (result.success) {
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

  const checkSwapAvailability = async () => {
    setChecking(true);
    try {
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
      const result = await createSwapRequest({
        assignmentId,
        reason: reason.trim() || undefined,
        targetUserId, 
        expiresAt: calculateExpiryDate(),
        scope: swapScope,
        selectedDay: swapScope === 'day' ? (selectedDay || undefined) : undefined,
        selectedTimeSlotId: swapScope === 'day' ? (selectedTimeSlotId || undefined) : undefined,
      });

      if (result.success) {
        Alert.alert(
          '✅ Success',
          swapScope === 'day' 
            ? `Swap request created for ${selectedDay}!` 
            : 'Swap request created for the entire week!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
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
                    navigation.goBack();
                    setTimeout(() => {
                      // @ts-ignore
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
    const member = members.find(m => m.userId === targetUserId || m.id === targetUserId);
    return member?.fullName || 'Selected user';
  };

  if (checking || loadingMembers) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#495057" />
          <Text style={styles.loadingText}>Checking availability...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const isDailyTask = executionFrequency === 'DAILY';
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A';

  if (existingRequest && canSwap.canSwap === false && canSwap.reason?.includes('pending')) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Swap</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="clock-alert" size={64} color="#e67700" />
          <Text style={styles.pendingTitle}>Pending Request Exists</Text>
          <Text style={styles.pendingText}>
            You already have a pending swap request for this assignment.
          </Text>
          <TouchableOpacity
            style={styles.viewRequestButton}
            onPress={() => {
              if (existingRequest?.id) {
                // @ts-ignore
                navigation.navigate('SwapRequestDetails', { requestId: existingRequest.id });
              }
            }}
          >
            <LinearGradient
              colors={['#495057', '#343a40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.viewRequestButtonGradient}
            >
              <Text style={styles.viewRequestButtonText}>View Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Swap</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Assignment Info Card */}
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assignmentCard}
          >
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.taskIconContainer}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={22} color="#495057" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Assignment Details</Text>
            </View>
            
            <Text style={styles.taskTitle}>{taskTitle || 'Task'}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color="#868e96" />
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formattedDueDate}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#868e96" />
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{timeSlot || 'Scheduled'}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="star" size={14} color="#e67700" />
                <Text style={styles.detailLabel}>Points</Text>
                <Text style={[styles.detailValue, styles.pointsValue]}>{taskPoints || 0}</Text>
              </View>
            </View>

            {selectedDay && swapScope === 'day' && (
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.assignmentDayBadge}
              >
                <MaterialCommunityIcons name="calendar-today" size={14} color="#495057" />
                <Text style={styles.assignmentDayText}>
                  This assignment is for: <Text style={styles.assignmentDayBold}>{selectedDay}</Text>
                </Text>
              </LinearGradient>
            )}
            
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.frequencyBadge}
            >
              <MaterialCommunityIcons 
                name={isDailyTask ? "calendar" : "calendar-week"} 
                size={12} 
                color="#495057" 
              />
              <Text style={styles.frequencyText}>
                {isDailyTask ? 'Daily Task' : 'Weekly Task'}
              </Text>
            </LinearGradient>

            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scopeBadge}
            >
              <MaterialCommunityIcons 
                name={swapScope === 'week' ? 'calendar-week' : 'calendar-today'} 
                size={12} 
                color="#495057" 
              />
              <Text style={styles.scopeBadgeText}>
                {swapScope === 'week' ? 'Swapping entire week' : `Swapping ${selectedDay || 'specific day'}`}
              </Text>
            </LinearGradient>
          </LinearGradient>

          {!canSwap.canSwap && (
            <LinearGradient
              colors={['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.warningCard}
            >
              <MaterialCommunityIcons name="alert-circle" size={24} color="#fa5252" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Cannot Request Swap</Text>
                <Text style={styles.warningText}>{canSwap.reason}</Text>
              </View>
            </LinearGradient>
          )}

          {canSwap.canSwap && (
            <>
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoBanner}
              >
                <MaterialCommunityIcons name="information" size={22} color="#495057" />
                <View style={styles.infoBannerContent}>
                  <Text style={styles.infoBannerTitle}>
                    {swapScope === 'week' ? 'Swap Entire Week' : 'Swap Specific Day'}
                  </Text>
                  <Text style={styles.infoBannerText}>
                    {swapScope === 'week' 
                      ? 'You\'re swapping ALL your tasks for the entire week.'
                      : `You're swapping the assignment for ${selectedDay || 'this day'}.`}
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Swap With</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowMemberSelector(!showMemberSelector)}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectorContent}>
                    <MaterialCommunityIcons 
                      name={targetUserId ? "account" : "account-group"} 
                      size={18} 
                      color="#495057" 
                    />
                    <Text style={styles.selectorText}>{getSelectedMemberName()}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={showMemberSelector ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#868e96" 
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
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberInfo}>
                        <LinearGradient
                          colors={['#f8f9fa', '#e9ecef']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.avatar, styles.anyoneAvatar]}
                        >
                          <MaterialCommunityIcons name="account-group" size={18} color="#495057" />
                        </LinearGradient>
                        <View>
                          <Text style={styles.memberName}>Anyone can accept</Text>
                          <Text style={styles.memberRole}>Any group member</Text>
                        </View>
                      </View>
                      {!targetUserId && (
                        <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
                      )}
                    </TouchableOpacity>
                    
                    {members.length > 0 ? (
                      members.map(member => (
                        <TouchableOpacity
                          key={member.userId || member.id}
                          style={styles.memberItem}
                          onPress={() => {
                            setTargetUserId(member.userId || member.id);
                            setShowMemberSelector(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberInfo}>
                            <LinearGradient
                              colors={member.role === 'ADMIN' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.avatar}
                            >
                              {member.avatarUrl ? (
                                <Image 
                                  source={{ uri: member.avatarUrl }} 
                                  style={styles.avatarImage} 
                                />
                              ) : (
                                <Text style={[
                                  styles.avatarText,
                                  { color: member.role === 'ADMIN' ? 'white' : '#495057' }
                                ]}>
                                  {member.fullName?.charAt(0).toUpperCase() || '?'}
                                </Text>
                              )}
                            </LinearGradient>
                            <View>
                              <Text style={styles.memberName}>{member.fullName || 'Unknown'}</Text>
                              <Text style={styles.memberRole}>
                                {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                              </Text>
                            </View>
                          </View>
                          {targetUserId === (member.userId || member.id) && (
                            <MaterialCommunityIcons name="check-circle" size={20} color="#2b8a3e" />
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
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={expiresIn === option ? ['#495057', '#343a40'] : ['#f8f9fa', '#e9ecef']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.expiryOptionGradient}
                      >
                        <Text
                          style={[
                            styles.expiryOptionText,
                            expiresIn === option && styles.expiryOptionTextActive,
                          ]}
                        >
                          {option === 'never' ? 'Never' : option}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reason (Optional)</Text>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.reasonInputGradient}
                >
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Why do you need to swap this task?"
                    placeholderTextColor="#adb5bd"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </LinearGradient>
              </View>

              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoNote}
              >
                <MaterialCommunityIcons name="information" size={18} color="#495057" />
                <Text style={styles.infoText}>
                  {swapScope === 'week' 
                    ? 'This will swap ALL your tasks for the current week.'
                    : `You're swapping the assignment for ${selectedDay || 'this day'}.`}
                </Text>
              </LinearGradient>
            </>
          )}
        </ScrollView>

        {canSwap.canSwap && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#f8f9fa', '#e9ecef'] : ['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#495057" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color="white" />
                    <Text style={styles.submitButtonText}>
                      {swapScope === 'week' 
                        ? 'Swap Entire Week' 
                        : selectedDay
                          ? `Swap ${selectedDay.slice(0, 3)}'s Assignment`
                          : 'Create Swap Request'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#e67700',
    marginTop: 16,
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  viewRequestButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewRequestButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  viewRequestButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  assignmentCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  pointsValue: {
    color: '#e67700',
  },
  assignmentDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  assignmentDayText: {
    fontSize: 12,
    color: '#495057',
  },
  assignmentDayBold: {
    fontWeight: '700',
    color: '#495057',
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  frequencyText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scopeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#495057',
  },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fa5252',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#fa5252',
  },
  infoBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#868e96',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    fontSize: 15,
    color: '#212529',
  },
  memberList: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  anyoneAvatar: {
    borderColor: '#e9ecef',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#868e96',
  },
  noMembersContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 14,
    color: '#868e96',
  },
  expiryOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  expiryOption: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  expiryOptionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  expiryOptionActive: {
    borderColor: '#495057',
  },
  expiryOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
  },
  expiryOptionTextActive: {
    color: 'white',
  },
  reasonInputGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reasonInput: {
    padding: 16,
    fontSize: 15,
    color: '#212529',
    minHeight: 100,
    backgroundColor: 'transparent',
  },
  infoNote: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});