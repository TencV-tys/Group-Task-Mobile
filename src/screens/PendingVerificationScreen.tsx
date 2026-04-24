// src/screens/PendingVerificationsScreen.tsx - FULLY UPDATED WITH PH TIME

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar, 
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssignmentService } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

const PAGE_SIZE = 20;

// ✅ Convert UTC to Philippine Time (UTC+8)
const toPHT = (date: Date | string): Date => {
  const d = new Date(date);
  return new Date(d.getTime() + (8 * 60 * 60 * 1000));
};

// ✅ Format date to Philippine Time with AM/PM
const formatPHTDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const phtDate = toPHT(date);
    return phtDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'Invalid date';
  }
};

// ✅ Format time to 12-hour format with AM/PM
const formatTime12Hour = (timeString: string): string => {
  if (!timeString) return '';
  const [hourStr, minuteStr] = timeString.split(':');
  let hour = parseInt(hourStr || '0', 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

// ✅ Format datetime to full PHT with time
const formatPHTDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const phtDate = toPHT(date);
    return phtDate.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'Invalid date';
  }
};

// ✅ Format relative time in PHT
const formatTimeAgo = (date: Date | null): string => {
  if (!date) return 'Unknown';
  const now = new Date();
  const phtNow = toPHT(now);
  const phtDate = toPHT(date);
  const diffMs = phtNow.getTime() - phtDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

export default function PendingVerificationsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [stats, setStats] = useState<any>(null);
  
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const currentPageRef = useRef(0);
  const isLoadingRef = useRef(false);
   
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can access this screen');
      navigation.goBack();
      return;
    }
    
    currentPageRef.current = 0;
    setSubmissions([]);
    setTotalCount(0);
    setHasMore(true);
    setLoading(true);
    
    fetchStats();
    fetchSubmissions(0, true);
  }, [groupId, filter]);

  const fetchStats = async () => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

    try {
      const pendingResult = await AssignmentService.getPendingVerifications(groupId, {
        limit: 1,
        offset: 0
      });
      
      const statsResult = await AssignmentService.getAssignmentStats(groupId);
      
      console.log('📊 Stats results:', {
        pendingCount: pendingResult.data?.total || 0,
        verifiedCount: statsResult.data?.summary?.verifiedAssignments || 0,
        rejectedCount: statsResult.data?.summary?.rejectedAssignments || 0
      });
      
      if (pendingResult.success && statsResult.success) {
        setStats({
          pendingVerification: pendingResult.data?.total || 0,
          verifiedAssignments: statsResult.data?.summary?.verifiedAssignments || 0,
          rejectedAssignments: statsResult.data?.summary?.rejectedAssignments || 0
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const isDeletedTask = (assignment: any, currentFilter: string): boolean => {
  const hasNoTaskId = !assignment.taskId || assignment.taskId === null;
  
  // Pending: hide if no task
  if (currentFilter === 'pending') {
    return hasNoTaskId;
  }
  
  // Verified & Rejected: ONLY show active tasks (hide if deleted)
  return hasNoTaskId;
};

  const fetchSubmissions = async (page: number, reset = false) => {
  if (isLoadingRef.current && !reset) return;
  
  const hasToken = await TokenUtils.checkToken({
    showAlert: false,
    onAuthError: () => setAuthError(true)
  });
  
  if (!hasToken) {
    setLoading(false);
    setRefreshing(false);
    setIsLoadingMore(false);
    return;
  }

  isLoadingRef.current = true;
  
  if (reset) {
    setLoading(true);
    setSubmissions([]);
    setTotalCount(0);
    setHasMore(true);
    currentPageRef.current = 0;
  } else {
    setIsLoadingMore(true);
  }
  
  setError(null);
  
  try {
    const offset = page * PAGE_SIZE;
    
    console.log(`📥 Fetching ${filter} submissions for group: ${groupId}, page: ${page}, offset: ${offset}`);
    
    let result;
    
    if (filter === 'pending') {
      result = await AssignmentService.getPendingVerifications(groupId, {
        limit: PAGE_SIZE,
        offset: offset 
      });
    } else if (filter === 'verified') {
      result = await AssignmentService.getGroupAssignments(groupId, {
        status: 'verified',
        limit: PAGE_SIZE,
        offset: offset
      });
    } else if (filter === 'rejected') {
      result = await AssignmentService.getGroupAssignments(groupId, {
        status: 'rejected',
        limit: PAGE_SIZE,
        offset: offset
      });
    }
    
    if (result.success) {
      let assignments: any[] = [];
      let total = 0;
      
      // ✅ SWITCH STATEMENT - Clean and no TypeScript errors
      switch (filter) {
        case 'pending':
          assignments = result.data?.assignments || [];
          total = result.data?.total || 0;
          console.log(`📊 PENDING: Got ${assignments.length} assignments, total: ${total}`);
          break;
        case 'verified':
          assignments = result.assignments || [];
          total = result.total || 0;
          // Filter for verified
          assignments = assignments.filter(a => a.verified === true);
          total = assignments.length;
          console.log(`🔍 VERIFIED: ${assignments.length} assignments (verified=true)`);
          break;
        case 'rejected':
          assignments = result.assignments || [];
          total = result.total || 0;
          // Filter for rejected
          assignments = assignments.filter(a => a.verified === false);
          total = assignments.length;
          console.log(`🔍 REJECTED: ${assignments.length} assignments (verified=false)`);
          break;
      }
      
      // Filter out deleted tasks
      const filteredAssignments = assignments.filter((assignment: any) => {
        const isDeleted = isDeletedTask(assignment,filter);
        if (isDeleted) {
          console.log(`🗑️ Filtering out deleted task: ${assignment.taskTitle || assignment.task?.title}`);
        }
        return !isDeleted;
      });
      
      console.log(`📥 After deleted filter: ${filteredAssignments.length} assignments, total: ${total}`);
      
      const processed = filteredAssignments.map((assignment: any) => {
        const isDeleted = isDeletedTask(assignment,filter);
        const taskTitle = assignment.task?.title || assignment.taskTitle || 'Unknown Task';
        
        // ✅ Clean eventDate logic
        let eventDate = null;
        if (filter === 'pending') {
          eventDate = assignment.completedAt || assignment.updatedAt;
        } else {
          eventDate = assignment.verifiedAt || assignment.updatedAt || assignment.completedAt;
        }
        
        return {
          ...assignment,
          id: assignment.id,
          userName: assignment.user?.fullName || assignment.userName || 'Unknown User',
          userAvatar: assignment.user?.avatarUrl || assignment.userAvatar,
          userId: assignment.user?.id || assignment.userId,
          taskId: assignment.task?.id || assignment.taskId,
          taskTitle: isDeleted ? `🗑️ ${taskTitle} (Deleted)` : taskTitle,
          taskPoints: assignment.task?.points || assignment.taskPoints || 0,
          eventDate: eventDate ? new Date(eventDate) : null,
          dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
          completed: assignment.completed || false,
          verified: assignment.verified,
          photoUrl: assignment.photoUrl,
          notes: assignment.notes,
          adminNotes: assignment.adminNotes,
          timeSlot: assignment.timeSlot,
          isTaskDeleted: isDeleted,
          isPartial: assignment.isPartial || false,
          slotsCompleted: assignment.slotsCompleted || 0,
          totalSlots: assignment.totalSlots || 1,
          points: assignment.points || 0
        };
      });
      
      const newTotal = total;
      setTotalCount(newTotal);
      const newHasMore = (offset + processed.length) < newTotal;
      setHasMore(newHasMore);
      
      if (reset) {
        setSubmissions(processed);
      } else {
        setSubmissions(prev => [...prev, ...processed]);
      }
      
      console.log(`✅ Loaded ${processed.length} items. Total: ${newTotal}, HasMore: ${newHasMore}`);
    } else {
      setError(result.message || 'Failed to load submissions');
    }
  } catch (err: any) {
    console.error('Error fetching submissions:', err);
    setError(err.message || 'Network error');
  } finally {
    setLoading(false);
    setRefreshing(false);
    setIsLoadingMore(false);
    isLoadingRef.current = false;
  }
};

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || loading || refreshing) return;
    
    const nextPage = currentPageRef.current + 1;
    const offset = nextPage * PAGE_SIZE;
    
    if (offset >= totalCount && totalCount > 0) {
      setHasMore(false);
      return;
    }
    
    currentPageRef.current = nextPage;
    fetchSubmissions(nextPage, false);
  }, [isLoadingMore, hasMore, loading, refreshing, totalCount]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    currentPageRef.current = 0;
    setHasMore(true);
    fetchSubmissions(0, true);
    fetchStats();
  }, []);

  const handleFilterChange = (newFilter: 'pending' | 'verified' | 'rejected') => {
    if (newFilter === filter) return;
    setFilter(newFilter);
  };

  const handleViewSubmission = (assignment: any) => {
    if (assignment.isTaskDeleted) {
      Alert.alert(
        'Task Deleted',
        `The task "${assignment.taskTitle.replace('🗑️ ', '').replace(' (Deleted)', '')}" has been deleted.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('AssignmentDetails', {
      assignmentId: assignment.id,
      isAdmin: true,
      onVerified: () => {
        currentPageRef.current = 0;
        setHasMore(true);
        fetchSubmissions(0, true);
        fetchStats();
      }
    });
  };

  const handleQuickApprove = async (assignment: any) => {
    if (assignment.isTaskDeleted) {
      Alert.alert('Cannot Approve', 'This task has been deleted.');
      return;
    }

    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

    Alert.alert(
      'Approve Submission',
      `Approve "${assignment.taskTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              const result = await AssignmentService.verifyAssignment(assignment.id, {
                verified: true,
                adminNotes: 'Approved via quick action'
              });
              
              if (result.success) {
                Alert.alert('Success', 'Submission approved');
                handleRefresh();
              } else {
                Alert.alert('Error', result.message || 'Failed to approve');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve');
            }
          }
        }
      ]
    );
  };

  const handleQuickReject = async (assignment: any) => {
    if (assignment.isTaskDeleted) {
      Alert.alert('Cannot Reject', 'This task has been deleted.');
      return;
    }

    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

    Alert.alert(
      'Reject Submission',
      `Reject "${assignment.taskTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await AssignmentService.verifyAssignment(assignment.id, {
                verified: false,
                adminNotes: 'Rejected via quick action'
              });
              
              if (result.success) {
                Alert.alert('Success', 'Submission rejected');
                handleRefresh();
              } else {
                Alert.alert('Error', result.message || 'Failed to reject');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject');
            }
          }
        }
      ]
    );
  };

  const getEventText = (item: any): string => {
    if (!item.eventDate) {
      if (filter === 'pending') return 'Not submitted yet';
      if (filter === 'verified') return 'Verified';
      return 'Rejected';
    }
    
    const date = item.eventDate;
    const formattedDate = formatPHTDateTime(date);
    
    if (filter === 'pending') return `Submitted ${formatTimeAgo(date)} (${formattedDate})`;
    if (filter === 'verified') return `Verified ${formatTimeAgo(date)} (${formattedDate})`;
    return `Rejected ${formatTimeAgo(date)} (${formattedDate})`;
  };

  const renderStatsBar = () => {
    if (!stats) return null;
    
    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statsBar, { borderBottomColor: theme.border }]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{stats.pendingVerification || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{stats.verifiedAssignments || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Verified</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{stats.rejectedAssignments || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Rejected</Text>
        </View>
      </LinearGradient>
    );
  };

  const renderFilterTabs = () => (
    <View style={[styles.filterContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={[
          styles.filterTab,
          filter === 'pending' && styles.activeFilterTab,
          { backgroundColor: theme.bgSecondary }
        ]}
        onPress={() => handleFilterChange('pending')}
      >
        <MaterialCommunityIcons 
          name="clock-check" 
          size={16} 
          color={filter === 'pending' ? theme.primary : theme.textMuted} 
        />
        <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText, { color: filter === 'pending' ? theme.primary : theme.textMuted }]}>
          Pending
        </Text>
        {filter === 'pending' && stats?.pendingVerification > 0 && (
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{stats.pendingVerification}</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterTab,
          filter === 'verified' && styles.activeFilterTab,
          { backgroundColor: theme.bgSecondary }
        ]}
        onPress={() => handleFilterChange('verified')}
      >
        <MaterialCommunityIcons 
          name="check-circle" 
          size={16} 
          color={filter === 'verified' ? theme.primary : theme.textMuted} 
        />
        <Text style={[styles.filterText, filter === 'verified' && styles.activeFilterText, { color: filter === 'verified' ? theme.primary : theme.textMuted }]}>
          Verified
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterTab,
          filter === 'rejected' && styles.activeFilterTab,
          { backgroundColor: theme.bgSecondary }
        ]}
        onPress={() => handleFilterChange('rejected')}
      >
        <MaterialCommunityIcons 
          name="close-circle" 
          size={16} 
          color={filter === 'rejected' ? theme.error : theme.textMuted} 
        />
        <Text style={[styles.filterText, filter === 'rejected' && styles.activeFilterText, { color: filter === 'rejected' ? theme.error : theme.textMuted }]}>
          Rejected
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.footerText, { color: theme.textMuted }]}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name={
          filter === 'pending' ? 'clock-check-outline' : 
          filter === 'verified' ? 'check-circle-outline' : 
          'close-circle-outline'
        } 
        size={64} 
        color={theme.border} 
      />
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        {filter === 'pending' ? 'No pending submissions' : 
         filter === 'verified' ? 'No verified submissions' : 
         'No rejected submissions'}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.textPlaceholder }]}>
        {filter === 'pending' 
          ? 'When members submit assignments, they will appear here'
          : 'No submissions in this category'}
      </Text>
    </View>
  );

  const renderSubmissionItem = ({ item }: any) => {
    const isPending = filter === 'pending';
    const isDeletedTask = item.isTaskDeleted === true;
    const pointsToShow = item.points || item.taskPoints || 0;
    const eventText = getEventText(item);
    
    // Format time slot in 12-hour format
    const timeSlotDisplay = item.timeSlot 
      ? `${formatTime12Hour(item.timeSlot.startTime)} - ${formatTime12Hour(item.timeSlot.endTime)}`
      : null;
    
    if (isDeletedTask) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.submissionCard,
          { backgroundColor: theme.card, shadowColor: theme.shadow }
        ]}
        onPress={() => handleViewSubmission(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatar, { borderColor: theme.border }]}
            >
              {item.userAvatar ? (
                <Image source={{ uri: item.userAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                  {item.userName?.charAt(0) || 'U'}
                </Text>
              )}
            </LinearGradient>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {item.userName}
              </Text>
              <Text style={[styles.submissionTime, { color: theme.textMuted }]}>
                {eventText}
              </Text>
            </View>
          </View>
          
          {isPending && (
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pendingBadge}
            >
              <MaterialCommunityIcons name="clock" size={12} color={theme.primary} />
              <Text style={[styles.pendingBadgeText, { color: theme.primary }]}>Pending</Text>
            </LinearGradient>
          )}
          {filter === 'verified' && (
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifiedBadge}
            >
              <MaterialCommunityIcons name="check-circle" size={12} color={theme.primary} />
              <Text style={[styles.verifiedBadgeText, { color: theme.primary }]}>Verified</Text>
            </LinearGradient>
          )}
          {filter === 'rejected' && (
            <LinearGradient
              colors={[theme.errorBg, theme.errorBg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rejectedBadge}
            >
              <MaterialCommunityIcons name="close-circle" size={12} color={theme.error} />
              <Text style={[styles.rejectedBadgeText, { color: theme.error }]}>Rejected</Text>
            </LinearGradient>
          )}
        </View>

        <LinearGradient
          colors={[theme.bgSecondary, theme.bgTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.taskInfo, { borderColor: theme.border }]}
        >
          <MaterialCommunityIcons 
            name="format-list-checks" 
            size={16} 
            color={theme.textSecondary} 
          />
          <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
            {item.taskTitle}
          </Text>
        </LinearGradient>

        <View style={styles.detailsRow}>
          <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>{pointsToShow} pts</Text>
          </View>
          
          {item.dueDate && (
            <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="calendar" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {formatPHTDate(item.dueDate)}
              </Text>
            </View>
          )}

          {item.timeSlot && (
            <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="clock" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {timeSlotDisplay}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.evidenceRow, { borderTopColor: theme.borderLight }]}>
          {item.photoUrl ? (
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hasPhotoBadge}
            >
              <MaterialCommunityIcons name="image" size={14} color={theme.primary} />
              <Text style={[styles.hasPhotoText, { color: theme.primary }]}>Photo</Text>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.noPhotoBadge}
            >
              <MaterialCommunityIcons name="image-off" size={14} color={theme.textMuted} />
              <Text style={[styles.noPhotoText, { color: theme.textMuted }]}>No Photo</Text>
            </LinearGradient>
          )}
          
          {item.notes ? (
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hasNotesBadge}
            >
              <MaterialCommunityIcons name="note-text" size={14} color={theme.primary} />
              <Text style={[styles.hasNotesText, { color: theme.primary }]}>Notes</Text>
            </LinearGradient>
          ) : null}
        </View>

        {isPending && (
          <View style={[styles.quickActions, { borderTopColor: theme.borderLight }]}>
            <TouchableOpacity
              style={styles.quickRejectButton}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickReject(item);
              }}
            >
              <LinearGradient
                colors={[theme.errorBg, theme.errorBg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="close" size={14} color={theme.error} />
                <Text style={[styles.quickRejectText, { color: theme.error }]}>Reject</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickApproveButton}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickApprove(item);
              }}
            >
              <LinearGradient
                colors={[theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="check" size={14} color={theme.primary} />
                <Text style={[styles.quickApproveText, { color: theme.primary }]}>Approve</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {item.adminNotes && (
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.adminNotesPreview, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name="message-text" size={14} color={theme.textMuted} />
            <Text style={[styles.adminNotesText, { color: theme.textMuted }]} numberOfLines={1}>
              {item.adminNotes}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, { borderBottomColor: theme.border }]}
    >
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          Review Submissions
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {groupName || 'Group'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        onPress={handleRefresh}
      >
        <MaterialCommunityIcons name="refresh" size={20} color={theme.primary} />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}
      {renderStatsBar()}
      {renderFilterTabs()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading submissions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
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
          data={submissions}
          renderItem={renderSubmissionItem}
          keyExtractor={(item) => item.id || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
              progressBackgroundColor={theme.bgSecondary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  title: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsBar: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    justifyContent: 'space-around'
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1 },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  activeFilterTab: { borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' },
  activeFilterText: {},
  badge: { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { textAlign: 'center', marginBottom: 16, fontSize: 16, marginTop: 12 },
  retryButton: { borderRadius: 8, overflow: 'hidden' },
  retryButtonGradient: { paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  listContainer: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 8 },
  footerText: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20, flex: 1 },
  emptyText: { fontSize: 16, marginBottom: 8, marginTop: 16, textAlign: 'center', fontWeight: '600' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  submissionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { fontSize: 16, fontWeight: '600' },
  userDetails: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  submissionTime: { fontSize: 12 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  pendingBadgeText: { fontSize: 11, fontWeight: '600' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  verifiedBadgeText: { fontSize: 11, fontWeight: '600' },
  rejectedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  rejectedBadgeText: { fontSize: 11, fontWeight: '600' },
  taskInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  taskTitle: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  detailText: { fontSize: 12 },
  evidenceRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingTop: 8, borderTopWidth: 1 },
  hasPhotoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  hasPhotoText: { fontSize: 11, fontWeight: '500' },
  noPhotoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  noPhotoText: { fontSize: 11, fontWeight: '500' },
  hasNotesBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  hasNotesText: { fontSize: 11, fontWeight: '500' },
  quickActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 12, borderTopWidth: 1 },
  quickRejectButton: { borderRadius: 8, overflow: 'hidden', flex: 1 },
  quickApproveButton: { borderRadius: 8, overflow: 'hidden', flex: 1 },
  quickActionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4 },
  quickRejectText: { fontSize: 13, fontWeight: '600' },
  quickApproveText: { fontSize: 13, fontWeight: '600' },
  adminNotesPreview: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginTop: 8, gap: 6, borderWidth: 1 },
  adminNotesText: { fontSize: 12, flex: 1, fontStyle: 'italic' }
});