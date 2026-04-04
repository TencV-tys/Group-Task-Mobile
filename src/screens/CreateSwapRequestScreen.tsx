// src/screens/CreateSwapRequestScreen.tsx - FIXED with batch API calls

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';
import { GroupMembersService } from '../services/GroupMemberService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { makeCreateSwapRequestStyles } from '../styles/createSwapRequest.styles';

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

export const CreateSwapRequestScreen = () => {
  const { theme, isDark } = useTheme();
  const styles = makeCreateSwapRequestStyles(theme);
  const navigation = useNavigation<any>();
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
  
  const { createSwapRequest, loading, authError } = useSwapRequests();
  
  const [members, setMembers] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [reason, setReason] = useState('');
  const [targetUserId, setTargetUserId] = useState<string | undefined>(undefined);
  const [expiresIn, setExpiresIn] = useState<'24h' | '48h' | '72h' | 'never'>('48h');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [canSwap, setCanSwap] = useState<{ canSwap: boolean; reason?: string }>({ canSwap: true });
  const [checking, setChecking] = useState(true);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [swapScope, setSwapScope] = useState<'week' | 'day'>(propScope || 'day');
  const [selectedDay, setSelectedDay] = useState<string | null>(
    propSelectedDay || assignmentDay || null
  );
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(
    propSelectedTimeSlotId || null
  );
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [eligibleCount, setEligibleCount] = useState<number>(0);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await TokenUtils.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ 
          text: 'OK', 
          onPress: () => {
            navigation.navigate('Login');
          }
        }]
      );
    }
  }, [authError, navigation]);

  // Get the current day of the week for this assignment
  useEffect(() => {
    if (dueDate && !selectedDay) {
      const date = new Date(dueDate);
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayFromDate = dayNames[date.getDay()];
      setSelectedDay(dayFromDate);
    }
  }, [dueDate, selectedDay]);

  // Load group and get current week
  useEffect(() => {
    loadCurrentWeek();
  }, [groupId]);

  // Load group members
  useEffect(() => {
    loadAllMembers();
  }, [groupId]);

  // Filter members when scope or selected day changes
  useEffect(() => {
    if (allMembers.length > 0 && currentUserId) {
      filterEligibleMembers();
    }
  }, [allMembers, swapScope, selectedDay, currentWeek, currentUserId]);

  // Check swap availability when scope changes
  useEffect(() => {
    if (assignmentId) {
      checkSwapAvailability();
    }
  }, [assignmentId, swapScope, selectedDay]);

  const loadCurrentWeek = async () => {
    try {
      const result = await GroupMembersService.getGroupInfo(groupId);
      if (result.success && result.group) {
        setCurrentWeek(result.group.currentRotationWeek || 1);
      }
    } catch (error) {
      console.error('Error loading current week:', error);
    }
  };

  const loadAllMembers = async () => {
    setLoadingMembers(true);
    try {
      console.log('📥 Loading members for group:', groupId);
      const result = await GroupMembersService.getGroupMembers(groupId);
      
      if (result.success) {
        const activeMembers = (result.members || []).filter((m: any) => m.isActive !== false);
        setAllMembers(activeMembers);
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

  // ===== FIXED: BATCH API CALL to prevent 429 errors =====
  const filterEligibleMembers = async () => {
    if (allMembers.length === 0 || !currentUserId) return;
    
    setLoadingMembers(true);
    
    // Filter out current user and admins
    const eligibleBaseMembers = allMembers.filter(m => 
      m.userId !== currentUserId && 
      m.groupRole !== 'ADMIN' &&
      m.inRotation === true
    );
    
    if (eligibleBaseMembers.length === 0) {
      setMembers([]);
      setEligibleCount(0);
      setLoadingMembers(false);
      return;
    }
    
    try {
      let eligibleMemberIds: Set<string> = new Set();
      
      if (swapScope === 'day' && selectedDay) {
        // DAY SWAP: Batch check all members at once via a single API call
        console.log(`🔍 Batch checking DAY swap eligibility for ${selectedDay}`);
        
        const memberIds = eligibleBaseMembers.map(m => m.userId);
        
        try {
          // Make a single batch API call instead of multiple individual calls
          const batchResult = await SwapRequestService.batchCheckUserAssignments({
            userIds: memberIds,
            groupId,
            day: selectedDay,
            week: currentWeek
          });
          
          if (batchResult.success && batchResult.results) {
            for (const result of batchResult.results) {
              // Eligible if they have ANY tasks this week AND are free on this day
              if (result.hasAnyAssignmentThisWeek && !result.hasAssignmentOnDay) {
                eligibleMemberIds.add(result.userId);
              }
            }
          }
        } catch (batchError) {
          console.error('Batch check failed, falling back to individual checks:', batchError);
          
          // Fallback: Individual checks with delays to avoid rate limiting
          for (let i = 0; i < eligibleBaseMembers.length; i++) {
            const member = eligibleBaseMembers[i];
            
            // Add delay between requests to avoid 429
            if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
            
            const [hasAnyAssignment, hasAssignmentOnDay] = await Promise.all([
              SwapRequestService.checkUserHasAnyAssignmentThisWeek(member.userId, groupId, currentWeek),
              SwapRequestService.checkUserHasAssignmentOnDay(member.userId, groupId, selectedDay, currentWeek)
            ]);
            
            if (hasAnyAssignment.hasAssignment && !hasAssignmentOnDay.hasAssignment) {
              eligibleMemberIds.add(member.userId);
            }
          }
        }
        
        const eligibleMembers = eligibleBaseMembers.filter(m => eligibleMemberIds.has(m.userId));
        setMembers(eligibleMembers);
        setEligibleCount(eligibleMembers.length);
        console.log(`✅ Found ${eligibleMembers.length} eligible members for day swap on ${selectedDay}`);
        
      } else if (swapScope === 'week') {
        // WEEK SWAP: Batch check all members at once
        console.log(`🔍 Batch checking WEEK swap eligibility`);
        
        const memberIds = eligibleBaseMembers.map(m => m.userId);
        
        try {
          const batchResult = await SwapRequestService.batchCheckUserWeekAssignments({
            userIds: memberIds,
            groupId,
            week: currentWeek
          });
          
          if (batchResult.success && batchResult.results) {
            for (const result of batchResult.results) {
              // Eligible only if they HAVE assignments this week
              if (result.hasAnyAssignmentThisWeek) {
                eligibleMemberIds.add(result.userId);
              }
            }
          }
        } catch (batchError) {
          console.error('Batch check failed, falling back to individual checks:', batchError);
          
          // Fallback: Individual checks with delays
          for (let i = 0; i < eligibleBaseMembers.length; i++) {
            const member = eligibleBaseMembers[i];
            
            if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
            
            const hasAnyAssignment = await SwapRequestService.checkUserHasAnyAssignmentThisWeek(
              member.userId, groupId, currentWeek
            );
            
            if (hasAnyAssignment.hasAssignment) {
              eligibleMemberIds.add(member.userId);
            }
          }
        }
        
        const eligibleMembers = eligibleBaseMembers.filter(m => eligibleMemberIds.has(m.userId));
        setMembers(eligibleMembers);
        setEligibleCount(eligibleMembers.length);
        console.log(`✅ Found ${eligibleMembers.length} eligible members for week swap`);
      }
      
    } catch (error) {
      console.error('Error filtering members:', error);
      setMembers(eligibleBaseMembers);
      setEligibleCount(eligibleBaseMembers.length);
    } finally {
      setLoadingMembers(false);
    }
  };

  const checkSwapAvailability = async () => {
    setChecking(true);
    try {
      const result = await SwapRequestService.checkCanSwap(assignmentId, swapScope, selectedDay || undefined);
      console.log('📦 Check swap result:', result);
      
      if (result.success) {
        setCanSwap({
          canSwap: result.canSwap || false,
          reason: result.reason
        });
        
        if (result.existingRequestId) {
          setExistingRequest({ id: result.existingRequestId });
        }
      } else {
        setCanSwap({
          canSwap: false,
          reason: result.message || 'Unable to check swap availability'
        });
      }
    } catch (error) {
      console.error('Failed to check swap availability:', error);
      setCanSwap({
        canSwap: false,
        reason: 'Network error. Please try again.'
      });
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

    if (!targetUserId) {
      Alert.alert('Select Member', 'Please select a member to swap with');
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
            ? `Swap request sent to ${getSelectedMemberName()} for ${selectedDay}!` 
            : `Week swap request sent to ${getSelectedMemberName()}!`,
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
    if (!targetUserId) return 'Select a member';
    const member = allMembers.find(m => m.userId === targetUserId || m.id === targetUserId);
    return member?.fullName || 'Selected user';
  };

  const renderEligibleMessage = () => {
    if (swapScope === 'day' && selectedDay) {
      if (eligibleCount === 0) {
        return (
          <LinearGradient
            colors={[theme.errorBg, theme.errorBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.warningCard}
          >
            <MaterialCommunityIcons name="alert-circle" size={24} color={theme.error} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: theme.error }]}>No Eligible Members</Text>
              <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                All members already have tasks on {selectedDay}. No one can accept this day swap.
              </Text>
            </View>
          </LinearGradient>
        );
      } else if (eligibleCount > 0) {
        return (
          <LinearGradient
            colors={[theme.primaryLight, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoSuccessCard}
          >
            <MaterialCommunityIcons name="check-circle" size={24} color={theme.primary} />
            <View style={styles.warningContent}>
              <Text style={[styles.successTitle, { color: theme.primary }]}>{eligibleCount} Member{eligibleCount !== 1 ? 's' : ''} Available</Text>
              <Text style={[styles.successText, { color: theme.textSecondary }]}>
                {eligibleCount} member{eligibleCount !== 1 ? 's are' : ' is'} free on {selectedDay} and can receive your task.
              </Text>
            </View>
          </LinearGradient>
        );
      }
    } else if (swapScope === 'week') {
      if (eligibleCount === 0) {
        return (
          <LinearGradient
            colors={[theme.errorBg, theme.errorBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.warningCard}
          >
            <MaterialCommunityIcons name="alert-circle" size={24} color={theme.error} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: theme.error }]}>No Eligible Members</Text>
              <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                No members have tasks this week to exchange. Week swap requires both parties to have tasks.
              </Text>
            </View>
          </LinearGradient>
        );
      } else if (eligibleCount > 0) {
        return (
          <LinearGradient
            colors={[theme.primaryLight, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoBanner}
          >
            <MaterialCommunityIcons name="information" size={22} color={theme.primary} />
            <View style={styles.infoBannerContent}>
              <Text style={[styles.infoBannerTitle, { color: theme.primary }]}>Week Swap - Exchange</Text>
              <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
                {eligibleCount} member{eligibleCount !== 1 ? 's have' : ' has'} tasks this week and can exchange their entire week with you.
              </Text>
            </View>
          </LinearGradient>
        );
      }
    }
    return null;
  };

  if (checking || loadingMembers) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Checking availability...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const isDailyTask = executionFrequency === 'DAILY';
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A';

  if (existingRequest && canSwap.canSwap === false && canSwap.reason?.includes('pending')) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Request Swap</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="clock-alert" size={64} color={theme.primary} />
          <Text style={[styles.pendingTitle, { color: theme.text }]}>Pending Request Exists</Text>
          <Text style={[styles.pendingText, { color: theme.textMuted }]}>
            You already have a pending swap request for this assignment.
          </Text>
          <TouchableOpacity
            style={styles.viewRequestButton}
            onPress={() => {
              if (existingRequest?.id) {
                navigation.goBack();
                setTimeout(() => {
                  navigation.navigate('SwapRequestDetails', { requestId: existingRequest.id });
                }, 100);
              }
            }}
          >
            <LinearGradient
              colors={[theme.textSecondary, theme.textMuted]}
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
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Request Swap</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Assignment Info Card */}
          <LinearGradient
            colors={[theme.card, theme.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.assignmentCard, { borderColor: theme.border }]}
          >
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.taskIconContainer}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={22} color={theme.textSecondary} />
              </LinearGradient>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Assignment Details</Text>
            </View>
            
            <Text style={[styles.taskTitle, { color: theme.text }]}>{taskTitle || 'Task'}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Due Date</Text>
                <Text style={[styles.detailValue, { color: theme.textSecondary }]}>{formattedDueDate}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Time</Text>
                <Text style={[styles.detailValue, { color: theme.textSecondary }]}>{timeSlot || 'Scheduled'}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Points</Text>
                <Text style={[styles.detailValue, styles.pointsValue, { color: theme.primary }]}>{taskPoints || 0}</Text>
              </View>
            </View>

            {selectedDay && swapScope === 'day' && (
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.assignmentDayBadge, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="calendar-today" size={14} color={theme.textSecondary} />
                <Text style={[styles.assignmentDayText, { color: theme.textSecondary }]}>
                  Swapping: <Text style={[styles.assignmentDayBold, { color: theme.text }]}>{selectedDay}</Text>
                </Text>
              </LinearGradient>
            )}
            
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.frequencyBadge, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons 
                name={isDailyTask ? "calendar" : "calendar-week"} 
                size={12} 
                color={theme.textSecondary} 
              />
              <Text style={[styles.frequencyText, { color: theme.textSecondary }]}>
                {isDailyTask ? 'Daily Task' : 'Weekly Task'}
              </Text>
            </LinearGradient>

            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.scopeBadge, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons 
                name={swapScope === 'week' ? 'calendar-week' : 'calendar-today'} 
                size={12} 
                color={theme.textSecondary} 
              />
              <Text style={[styles.scopeBadgeText, { color: theme.textSecondary }]}>
                {swapScope === 'week' ? 'Swapping entire week' : `Swapping ${selectedDay || 'specific day'}`}
              </Text>
            </LinearGradient>
          </LinearGradient>

          {!canSwap.canSwap && (
            <LinearGradient
              colors={[theme.errorBg, theme.errorBg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.warningCard, { borderColor: theme.errorBorder }]}
            >
              <MaterialCommunityIcons name="alert-circle" size={24} color={theme.error} />
              <View style={styles.warningContent}>
                <Text style={[styles.warningTitle, { color: theme.error }]}>Cannot Request Swap</Text>
                <Text style={[styles.warningText, { color: theme.textSecondary }]}>{canSwap.reason}</Text>
              </View>
            </LinearGradient>
          )}

          {canSwap.canSwap && (
            <>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.infoBanner, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="information" size={22} color={theme.primary} />
                <View style={styles.infoBannerContent}>
                  <Text style={[styles.infoBannerTitle, { color: theme.primary }]}>
                    {swapScope === 'week' ? 'Swap Entire Week' : 'Swap Specific Day'}
                  </Text>
                  <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
                    {swapScope === 'week' 
                      ? 'You\'re swapping ALL your tasks for the entire week with another member.'
                      : `You're transferring your ${selectedDay || 'this day'} task to another member.`}
                  </Text>
                </View>
              </LinearGradient>

              {/* Show eligible members message */}
              {renderEligibleMessage()}

              {/* Member Selection - REQUIRED */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Member to Swap With *</Text>
                
                <TouchableOpacity
                  style={[styles.selectorButton, !targetUserId && styles.selectorButtonRequired, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setShowMemberSelector(!showMemberSelector)}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectorContent}>
                    <MaterialCommunityIcons 
                      name={targetUserId ? "account-check" : "account-plus"} 
                      size={18} 
                      color={targetUserId ? theme.primary : theme.textSecondary} 
                    />
                    <Text style={[styles.selectorText, targetUserId && styles.selectorTextSelected, { color: targetUserId ? theme.primary : theme.textSecondary }]}>
                      {getSelectedMemberName()}
                    </Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={showMemberSelector ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color={theme.textMuted} 
                  />
                </TouchableOpacity>

                {showMemberSelector && (
                  <View style={[styles.memberList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {members.length > 0 ? (
                      members.map(member => (
                        <TouchableOpacity
                          key={member.userId || member.id}
                          style={[styles.memberItem, { borderBottomColor: theme.borderLight }]}
                          onPress={() => {
                            setTargetUserId(member.userId || member.id);
                            setShowMemberSelector(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberInfo}>
                            <LinearGradient
                              colors={[theme.bgSecondary, theme.bgTertiary]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={[styles.avatar, { borderColor: theme.border }]}
                            >
                              {member.avatarUrl ? (
                                <Image 
                                  source={{ uri: member.avatarUrl }} 
                                  style={styles.avatarImage} 
                                />
                              ) : (
                                <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                                  {member.fullName?.charAt(0).toUpperCase() || '?'}
                                </Text>
                              )}
                            </LinearGradient>
                            <View>
                              <Text style={[styles.memberName, { color: theme.text }]}>{member.fullName || 'Unknown'}</Text>
                              <Text style={[styles.memberRole, { color: theme.textMuted }]}>
                                {swapScope === 'day' && selectedDay
                                  ? `Free on ${selectedDay}`
                                  : swapScope === 'week'
                                    ? `Has tasks this week`
                                    : 'Member'}
                              </Text>
                            </View>
                          </View>
                          {targetUserId === (member.userId || member.id) && (
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noMembersContainer}>
                        <MaterialCommunityIcons name="account-off" size={32} color={theme.textPlaceholder} />
                        <Text style={[styles.noMembersText, { color: theme.textMuted }]}>
                          {swapScope === 'day' && selectedDay
                            ? `No members available on ${selectedDay}`
                            : swapScope === 'week'
                              ? 'No members with tasks this week to exchange'
                              : 'No active members found'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Request Expires</Text>
                <View style={styles.expiryOptions}>
                  {(['24h', '48h', '72h', 'never'] as const).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.expiryOption,
                        expiresIn === option && styles.expiryOptionActive,
                        { borderColor: theme.border }
                      ]}
                      onPress={() => setExpiresIn(option)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={expiresIn === option ? [theme.textSecondary, theme.textMuted] : [theme.bgSecondary, theme.bgTertiary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.expiryOptionGradient}
                      >
                        <Text
                          style={[
                            styles.expiryOptionText,
                            expiresIn === option && styles.expiryOptionTextActive,
                            { color: expiresIn === option ? '#fff' : theme.textSecondary }
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
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Reason (Optional)</Text>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.reasonInputGradient, { borderColor: theme.border }]}
                >
                  <TextInput
                    style={[styles.reasonInput, { color: theme.text }]}
                    placeholder="Why do you need to swap this task?"
                    placeholderTextColor={theme.textPlaceholder}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    selectionColor={theme.primary}
                  />
                </LinearGradient>
              </View>

              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.infoNote, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="information" size={18} color={theme.textMuted} />
                <Text style={[styles.infoText, { color: theme.textMuted }]}>
                  {swapScope === 'week' 
                    ? 'This will swap ALL your tasks for the current week with the selected member.'
                    : `This will transfer your ${selectedDay} task to the selected member.`}
                </Text>
              </LinearGradient>
            </>
          )}
        </ScrollView>

        {canSwap.canSwap && (
          <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton, 
                loading && styles.submitButtonDisabled,
                (!targetUserId || (swapScope === 'day' && eligibleCount === 0)) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading || !targetUserId || (swapScope === 'day' && eligibleCount === 0)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  loading || !targetUserId || (swapScope === 'day' && eligibleCount === 0)
                    ? [theme.bgSecondary, theme.bgTertiary] 
                    : [theme.primary, theme.primaryDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={theme.textMuted} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>
                      {swapScope === 'week' 
                        ? `Send Week Swap Request to ${getSelectedMemberName()}`
                        : selectedDay
                          ? `Send ${selectedDay.slice(0, 3)} Swap to ${getSelectedMemberName()}`
                          : 'Send Swap Request'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            {!targetUserId && (
              <Text style={[styles.disabledHint, { color: theme.textMuted }]}>
                ⓘ Please select a member to swap with
              </Text>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  ); 
};  

export default CreateSwapRequestScreen;