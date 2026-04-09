// src/screens/PendingVerificationsScreen.tsx - FIXED PAGINATION

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
  
  // ✅ FIXED: Track total count from API
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // ✅ FIXED: Use ref for current page to avoid stale closures
  const currentPageRef = useRef(0);
  const isLoadingRef = useRef(false);
   
  const isAdmin = userRole === 'ADMIN';

  // ✅ FIXED: Reset everything when filter changes
  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can access this screen');
      navigation.goBack();
      return;
    }
    
    // Reset pagination state on filter change
    currentPageRef.current = 0;
    setSubmissions([]);
    setTotalCount(0);
    setHasMore(true);
    setLoading(true);
    
    fetchStats();
    fetchSubmissions(0, true); // Fetch first page with reset
  }, [groupId, filter]);

 // In PendingVerificationsScreen.tsx - REPLACE fetchStats with this

const fetchStats = async () => {
  const hasToken = await TokenUtils.checkToken({
    showAlert: false,
    onAuthError: () => setAuthError(true)
  });
  
  if (!hasToken) return;

  try {
    // ✅ Get pending count from dedicated endpoint
    const pendingResult = await AssignmentService.getPendingVerifications(groupId, {
      limit: 1,
      offset: 0
    });
    
    // Get verified/rejected counts from existing stats
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

   // In PendingVerificationsScreen.tsx - UPDATE fetchSubmissions function

   // In PendingVerificationsScreen.tsx - FIXED fetchSubmissions function

const fetchSubmissions = async (page: number, reset = false) => {
  // Prevent duplicate requests
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
  } else {
    setIsLoadingMore(true);
  }
  
  setError(null); 
  
  try {
    const offset = page * PAGE_SIZE;
    
    console.log(`📥 Fetching ${filter} submissions for group: ${groupId}, page: ${page}, offset: ${offset}`);
    
    let result;
    
    // ✅ USE DEDICATED ENDPOINT FOR PENDING
    if (filter === 'pending') {
      result = await AssignmentService.getPendingVerifications(groupId, {
        limit: PAGE_SIZE,
        offset: offset 
      });
      console.log('📥 Pending result structure:', {
        hasData: !!result.data,
        assignmentsCount: result.data?.assignments?.length,
        total: result.data?.total
      });
    } else if (filter === 'verified') {
  result = await AssignmentService.getGroupAssignments(groupId, {
    status: 'verified',
    limit: PAGE_SIZE,
    offset: offset
  });
  console.log('📥 Verified result:', {
    success: result.success,
    total: result.total,
    assignmentsCount: result.assignments?.length,
    firstAssignment: result.assignments?.[0] ? {
      id: result.assignments[0].id,
      verified: result.assignments[0].verified,
      completed: result.assignments[0].completed
    } : null
  });
} else if (filter === 'rejected') {
      result = await AssignmentService.getGroupAssignments(groupId, {
        status: 'rejected',
        limit: PAGE_SIZE,
        offset: offset
      });
    }
    
    if (result.success) {
      // ✅ CORRECT response structure handling
      let assignments = [];
      let total = 0;
      
      if (filter === 'pending') {
        // Pending endpoint returns data.assignments
        assignments = result.data?.assignments || [];
        total = result.data?.total || 0;
      } else {
        // Other endpoints return assignments directly
        assignments = result.assignments || [];
        total = result.total || 0;
      }
      
      console.log(`📥 Got ${assignments.length} assignments, total: ${total}`);
      
      const processed = assignments.map((assignment: any) => {
        const isTaskDeleted = !assignment.taskId || assignment.taskId === null;
        const taskTitle = assignment.task?.title || assignment.taskTitle || 'Unknown Task';
        const isDeletedTask = assignment.isHistorical === true || (isTaskDeleted && assignment.taskTitle);
        
        return {
          ...assignment,
          id: assignment.id,
          userName: assignment.user?.fullName || assignment.userName || 'Unknown User',
          userAvatar: assignment.user?.avatarUrl || assignment.userAvatar,
          userId: assignment.user?.id || assignment.userId,
          taskId: assignment.task?.id || assignment.taskId,
          taskTitle: isDeletedTask ? `🗑️ ${taskTitle} (Deleted)` : taskTitle,
          taskPoints: assignment.task?.points || assignment.taskPoints || 0,
          submittedAt: assignment.submittedAt ? new Date(assignment.submittedAt) : 
                      (assignment.completedAt ? new Date(assignment.completedAt) : null),
          dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
          completed: assignment.completed || false,
          verified: assignment.verified,
          photoUrl: assignment.photoUrl,
          notes: assignment.notes,
          adminNotes: assignment.adminNotes,
          timeSlot: assignment.timeSlot,
          isTaskDeleted: isDeletedTask,
          isPartial: assignment.isPartial || false,
          slotsCompleted: assignment.slotsCompleted || 0,
          totalSlots: assignment.totalSlots || 1
        };
      });
      
      setTotalCount(total);
      const newHasMore = (offset + processed.length) < total;
      setHasMore(newHasMore);
      
      if (reset) {
        setSubmissions(processed);
      } else {
        setSubmissions(prev => [...prev, ...processed]);
      }
      
      console.log(`✅ Loaded ${processed.length} items. Total: ${total}, HasMore: ${newHasMore}`);
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

  // ✅ FIXED: Load more function
  const handleLoadMore = useCallback(() => {
    // Don't load if:
    // - Already loading more
    // - No more items to load
    // - Currently loading or refreshing
    // - Total loaded equals total count
    if (isLoadingMore || !hasMore || loading || refreshing) {
      console.log('🚫 Skip load more:', { isLoadingMore, hasMore, loading, refreshing });
      return;
    }
    
    const nextPage = currentPageRef.current + 1;
    const offset = nextPage * PAGE_SIZE;
    
    // Check if we've already loaded everything
    if (offset >= totalCount && totalCount > 0) {
      console.log('🏁 Already loaded all items');
      setHasMore(false);
      return;
    }
    
    console.log(`📥 Loading more: page ${nextPage}, offset ${offset}`);
    currentPageRef.current = nextPage;
    fetchSubmissions(nextPage, false);
  }, [isLoadingMore, hasMore, loading, refreshing, totalCount]);

  // ✅ FIXED: Refresh function
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    currentPageRef.current = 0;
    setHasMore(true);
    fetchSubmissions(0, true);
  }, []);

  // ✅ FIXED: Filter change handler
  const handleFilterChange = (newFilter: 'pending' | 'verified' | 'rejected') => {
    if (newFilter === filter) return;
    setFilter(newFilter);
  };

  const handleViewSubmission = (assignment: any) => {
    if (assignment.isTaskDeleted) {
      Alert.alert(
        'Task Deleted',
        `The task "${assignment.taskTitle.replace('🗑️ ', '').replace(' (Deleted)', '')}" has been deleted and is no longer available for review.\n\nYou can still see the submission details but cannot verify it.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('AssignmentDetails', {
      assignmentId: assignment.id,
      isAdmin: true,
      onVerified: () => {
        // Refresh after verification
        currentPageRef.current = 0;
        setHasMore(true);
        fetchSubmissions(0, true);
        fetchStats();
      }
    });
  };

  const handleQuickApprove = async (assignment: any) => {
    if (assignment.isTaskDeleted) {
      Alert.alert(
        'Cannot Approve',
        `The task "${assignment.taskTitle.replace('🗑️ ', '').replace(' (Deleted)', '')}" has been deleted and cannot be approved.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

    Alert.alert(
      'Approve Submission',
      `Are you sure you want to approve "${assignment.taskTitle}"?`,
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
                Alert.alert('Success', 'Submission approved successfully');
                // Refresh after approval
                currentPageRef.current = 0;
                setHasMore(true);
                fetchSubmissions(0, true);
                fetchStats();
              } else {
                Alert.alert('Error', result.message || 'Failed to approve submission');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve submission');
            }
          }
        }
      ]
    );
  };

  const handleQuickReject = async (assignment: any) => {
    if (assignment.isTaskDeleted) {
      Alert.alert(
        'Cannot Reject',
        `The task "${assignment.taskTitle.replace('🗑️ ', '').replace(' (Deleted)', '')}" has been deleted.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

    Alert.alert(
      'Reject Submission',
      `Are you sure you want to reject "${assignment.taskTitle}"?`,
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
                // Refresh after rejection
                currentPageRef.current = 0;
                setHasMore(true);
                fetchSubmissions(0, true);
                fetchStats();
              } else {
                Alert.alert('Error', result.message || 'Failed to reject submission');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject submission');
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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

  // ✅ FIXED: Footer component for load more indicator
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
    const isSubmitted = item.completed === true && item.verified === null;
    const isDeletedTask = item.isTaskDeleted === true;
    
    return (
      <TouchableOpacity
        style={[
          styles.submissionCard,
          isDeletedTask && styles.deletedTaskCard,
          { backgroundColor: theme.card, shadowColor: theme.shadow }
        ]}
        onPress={() => handleViewSubmission(item)}
        activeOpacity={isDeletedTask ? 0.8 : 0.7}
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
                {item.submittedAt 
                  ? `Submitted ${formatTimeAgo(item.submittedAt)}`
                  : 'Not submitted yet'}
              </Text>
            </View>
          </View>
          
          {isDeletedTask && (
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.deletedBadge}
            >
              <MaterialCommunityIcons name="delete" size={12} color={theme.error} />
              <Text style={[styles.deletedBadgeText, { color: theme.error }]}>Deleted</Text>
            </LinearGradient>
          )}
          
          {!isDeletedTask && isPending && item.completed === true && item.verified === null && (
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
          {!isDeletedTask && filter === 'verified' && (
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
          {!isDeletedTask && filter === 'rejected' && (
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
          colors={isDeletedTask ? [theme.bgSecondary, theme.bgTertiary] : [theme.bgSecondary, theme.bgTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.taskInfo, isDeletedTask && styles.deletedTaskInfo, { borderColor: theme.border }]}
        >
          <MaterialCommunityIcons 
            name={isDeletedTask ? "delete" : "format-list-checks"} 
            size={16} 
            color={isDeletedTask ? theme.error : theme.textSecondary} 
          />
          <Text style={[styles.taskTitle, isDeletedTask && styles.deletedTaskTitle, { color: isDeletedTask ? theme.textMuted : theme.text }]} numberOfLines={2}>
            {item.taskTitle}
          </Text>
        </LinearGradient>

        <View style={styles.detailsRow}>
          <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.taskPoints} pts</Text>
          </View>
          
          {item.dueDate && (
            <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="calendar" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.dueDate.toLocaleDateString()}
              </Text>
            </View>
          )}

          {item.timeSlot && (
            <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="clock" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.timeSlot.startTime} - {item.timeSlot.endTime}
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

        {isPending && isSubmitted && !isDeletedTask && (
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

        {isDeletedTask && (
          <LinearGradient
            colors={[theme.errorBg, theme.errorBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.deletedWarning, { borderColor: theme.errorBorder }]}
          >
            <MaterialCommunityIcons name="alert-circle" size={14} color={theme.error} />
            <Text style={[styles.deletedWarningText, { color: theme.error }]}>
              This task has been deleted. Cannot verify this submission.
            </Text>
          </LinearGradient>
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
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
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
        <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
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
  container: {
    flex: 1,
  },
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center'
  },
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
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
  },
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
  activeFilterTab: {
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeFilterText: {},
  badge: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
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
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600'
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  submissionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deletedTaskCard: {
    opacity: 0.8,
  },
  deletedTaskInfo: {},
  deletedTaskTitle: {
    textDecorationLine: 'line-through',
  },
  deletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deletedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deletedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
  },
  deletedWarningText: {
    flex: 1,
    fontSize: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2
  },
  submissionTime: {
    fontSize: 12,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  rejectedBadgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 12,
  },
  evidenceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  hasPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasPhotoText: {
    fontSize: 11,
    fontWeight: '500'
  },
  noPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  noPhotoText: {
    fontSize: 11,
    fontWeight: '500'
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasNotesText: {
    fontSize: 11,
    fontWeight: '500'
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  quickRejectButton: {
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
  },
  quickApproveButton: {
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  quickRejectText: {
    fontSize: 13,
    fontWeight: '600'
  },
  quickApproveText: {
    fontSize: 13,
    fontWeight: '600'
  },
  adminNotesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
  },
  adminNotesText: {
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic'
  }
});