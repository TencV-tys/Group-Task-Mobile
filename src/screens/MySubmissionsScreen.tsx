// src/screens/MySubmissionsScreen.tsx - CORRECTED VERSION

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
import { formatUTCDate } from '../utils/timeUtils';

const PAGE_SIZE = 20;

export default function MySubmissionsScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [stats, setStats] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const currentPageRef = useRef(0);
  const isLoadingRef = useRef(false);

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

  // Reset pagination when filter changes
  useEffect(() => {
    currentPageRef.current = 0;
    setSubmissions([]);
    setTotalCount(0);
    setHasMore(true);
    setLoading(true);
    fetchSubmissions(0, true);
    fetchStats();
  }, [filter]);

 const fetchStats = async () => {
  try {
    const user = await TokenUtils.getUser();
    if (!user) return;

    const result = await AssignmentService.getUserAssignments(user.id);
    
    if (result.success && result.data?.assignments) {
      const assignments = result.data.assignments;
      
      // ✅ PENDING = submitted but not verified (completed=true, verified=null)
      const pending = assignments.filter((a: any) => 
        a.completed === true && a.verified === null
      ).length;
      
      // ✅ VERIFIED = verified === true
      const verified = assignments.filter((a: any) => 
        a.verified === true
      ).length;
      
      // ✅ REJECTED = verified === false
      const rejected = assignments.filter((a: any) => 
        a.verified === false
      ).length;
      
      setStats({
        pendingVerification: pending,
        verifiedAssignments: verified,
        rejectedAssignments: rejected
      });
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
};

const fetchSubmissions = async (page: number, reset = false) => {
  if (isLoadingRef.current && !reset) return;
  
  const user = await TokenUtils.getUser();
  if (!user) {
    setLoading(false);
    setRefreshing(false);
    return;
  }

  isLoadingRef.current = true;
  
  if (reset) {
    setLoading(true);
  } else {
    setLoadingMore(true);
  }
  
  try {
    let statusParam = '';
    switch (filter) {
      case 'pending':
        statusParam = '';
        break;
      case 'verified':
        statusParam = 'verified';
        break;
      case 'rejected':
        statusParam = 'rejected';
        break;
    }
    
    console.log(`📥 Fetching ${filter} submissions, page ${page}, statusParam: ${statusParam || 'none'}`);
    
    const result = await AssignmentService.getUserAssignments(user.id, {
      status: statusParam || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE
    });
    
    if (result.success && result.data?.assignments) {
      let assignments = result.data.assignments;
      
      // ✅ Apply client-side filtering based on the selected tab
      if (filter === 'pending') {
        assignments = assignments.filter((a: any) => 
          a.completed === true && a.verified === null
        );
        console.log(`📊 Pending filter: ${assignments.length} assignments after filtering`);
      } else if (filter === 'verified') {
        assignments = assignments.filter((a: any) => a.verified === true);
        console.log(`📊 Verified filter: ${assignments.length} assignments`);
      } else if (filter === 'rejected') {
        assignments = assignments.filter((a: any) => a.verified === false);
        console.log(`📊 Rejected filter: ${assignments.length} assignments`);
      }
      
      // ✅ For pending, we need to get the total from the server differently
      // Since we're filtering client-side, we can't use result.data.total accurately
      let total = 0;
      if (filter === 'pending') {
        // Get all assignments to count pending (this is a workaround)
        // Better: Add a dedicated endpoint for pending count
        const allResult = await AssignmentService.getUserAssignments(user.id);
        if (allResult.success && allResult.data?.assignments) {
          total = allResult.data.assignments.filter((a: any) => 
            a.completed === true && a.verified === null
          ).length;
        }
      } else {
        total = result.data.total || assignments.length;
      }
      
      setTotalCount(total);
      const newHasMore = (page * PAGE_SIZE + assignments.length) < total;
      setHasMore(newHasMore);
      
      const processed = assignments.map((assignment: any, idx: number) => ({
        ...assignment,
        uniqueKey: `${assignment.id}-${filter}-${page}-${idx}`,
        dueDateFormatted: formatUTCDate(assignment.dueDate),
        status: filter === 'pending' ? 'pending_verification' : 
                filter === 'verified' ? 'verified' : 'rejected',
        statusText: filter === 'pending' ? 'Pending Verification' :
                    filter === 'verified' ? 'Verified' : 'Rejected',
        statusColor: filter === 'pending' ? theme.primary :
                     filter === 'verified' ? '#2b8a3e' : theme.error,
        statusIcon: filter === 'pending' ? 'clock-check' :
                    filter === 'verified' ? 'check-circle' : 'close-circle'
      }));
      
      if (reset) {
        setSubmissions(processed);
      } else {
        setSubmissions(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = processed.filter((p:any) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
      }
    } else {
      setError(result.message || 'Failed to load submissions');
    }
  } catch (err: any) {
    console.error('Error fetching submissions:', err);
    setError(err.message || 'Network error');
  } finally {
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
    isLoadingRef.current = false;
  }
};


useEffect(() => {
  return () => {
    // Cleanup on unmount
    isLoadingRef.current = false;
    setSubmissions([]);
    setStats(null);
  };
}, []);


  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading || refreshing) return;
    const nextPage = currentPageRef.current + 1;
    currentPageRef.current = nextPage;
    fetchSubmissions(nextPage, false);
  }, [loadingMore, hasMore, loading, refreshing, fetchSubmissions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    currentPageRef.current = 0;
    setHasMore(true);
    fetchSubmissions(0, true);
    fetchStats();
  }, [fetchSubmissions, fetchStats]);

  const handleFilterChange = (newFilter: 'pending' | 'verified' | 'rejected') => {
    if (newFilter === filter) return;
    setFilter(newFilter);
  };

  const handleViewSubmission = (assignment: any) => {
    navigation.navigate('AssignmentDetails', {
      assignmentId: assignment.id,
      isAdmin: false,
      onVerified: () => {
        handleRefresh();
      }
    });
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
        <TouchableOpacity 
          style={[styles.statItem, filter === 'pending' && styles.activeStatItem]}
          onPress={() => handleFilterChange('pending')}
        >
          <Text style={[styles.statNumber, { color: theme.text }]}>{stats.pendingVerification || 0}</Text>
          <Text style={[styles.statLabel, { color: filter === 'pending' ? theme.primary : theme.textMuted }]}>
            Pending
          </Text>
        </TouchableOpacity>
        
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        
        <TouchableOpacity 
          style={[styles.statItem, filter === 'verified' && styles.activeStatItem]}
          onPress={() => handleFilterChange('verified')}
        >
          <Text style={[styles.statNumber, { color: theme.text }]}>{stats.verifiedAssignments || 0}</Text>
          <Text style={[styles.statLabel, { color: filter === 'verified' ? '#2b8a3e' : theme.textMuted }]}>
            Verified
          </Text>
        </TouchableOpacity>
        
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        
        <TouchableOpacity 
          style={[styles.statItem, filter === 'rejected' && styles.activeStatItem]}
          onPress={() => handleFilterChange('rejected')}
        >
          <Text style={[styles.statNumber, { color: theme.text }]}>{stats.rejectedAssignments || 0}</Text>
          <Text style={[styles.statLabel, { color: filter === 'rejected' ? theme.error : theme.textMuted }]}>
            Rejected
          </Text>
        </TouchableOpacity>
      </LinearGradient>
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
          ? 'When you submit assignments, they will appear here'
          : filter === 'verified'
          ? 'Verified submissions will appear here once approved by admin'
          : 'Rejected submissions will appear here with admin feedback'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.footerText, { color: theme.textMuted }]}>Loading more...</Text>
      </View>
    );
  };

  const renderSubmissionItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.submissionCard, { backgroundColor: theme.card, shadowColor: '#000' }]}
      onPress={() => handleViewSubmission(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            style={[styles.taskIcon, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name="format-list-checks" size={18} color={theme.primary} />
          </LinearGradient>
          <View style={styles.taskDetails}>
            <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
              {item.taskTitle || 'Unknown Task'}
            </Text>
            <Text style={[styles.dueDate, { color: theme.textMuted }]}>
              Due: {item.dueDateFormatted}
            </Text>
          </View>
        </View>
        
        <LinearGradient
          colors={[item.statusColor + '20', item.statusColor + '10']}
          style={[styles.statusBadge, { borderColor: item.statusColor + '40' }]}
        >
          <MaterialCommunityIcons name={item.statusIcon} size={12} color={item.statusColor} />
          <Text style={[styles.statusText, { color: item.statusColor }]}>{item.statusText}</Text>
        </LinearGradient>
      </View>

      <View style={[styles.detailsRow, { borderTopColor: theme.border }]}>
        <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
          <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.points} pts</Text>
        </View>
        
        {item.timeSlot && (
          <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="clock" size={14} color={theme.textMuted} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.timeSlot.startTime} - {item.timeSlot.endTime}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.evidenceRow, { borderTopColor: theme.border }]}>
        {item.photoUrl ? (
          <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.hasPhotoBadge}>
            <MaterialCommunityIcons name="image" size={14} color={theme.primary} />
            <Text style={[styles.hasPhotoText, { color: theme.primary }]}>Photo</Text>
          </LinearGradient>
        ) : null}
        
        {item.notes ? (
          <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.hasNotesBadge}>
            <MaterialCommunityIcons name="note-text" size={14} color={theme.primary} />
            <Text style={[styles.hasNotesText, { color: theme.primary }]}>Notes</Text>
          </LinearGradient>
        ) : null}
      </View>

      {item.adminNotes && filter === 'rejected' && (
        <LinearGradient
          colors={[theme.errorBg, theme.errorBg]}
          style={[styles.adminFeedback, { borderColor: theme.errorBorder }]}
        >
          <MaterialCommunityIcons name="message-alert" size={14} color={theme.error} />
          <Text style={[styles.adminFeedbackText, { color: theme.error }]} numberOfLines={2}>
            {item.adminNotes}
          </Text>
        </LinearGradient>
      )}

      {item.completedAt && (
        <Text style={[styles.submittedDate, { color: theme.textMuted }]}>
          Submitted: {formatUTCDate(item.completedAt)}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, { borderBottomColor: theme.border }]}
    >
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={[styles.backButton, { backgroundColor: theme.card, shadowColor: '#000' }]}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          My Submissions
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {groupName || 'Group'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: '#000' }]}
        onPress={handleRefresh}
      >
        <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    </LinearGradient>
  );

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      {renderHeader()}
      {renderStatsBar()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading submissions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
         <FlatList
  data={submissions}
  renderItem={renderSubmissionItem}
  keyExtractor={(item, index) => {
    // ✅ Use the uniqueKey we created, or fallback to id + index
    if (item.uniqueKey) {
      return item.uniqueKey;
    }
    if (item.id) {
      return `${item.id}-${filter}-${index}`;
    }
    return `fallback-${Date.now()}-${index}`;
  }}
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
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeStatItem: {
    backgroundColor: 'rgba(0,0,0,0.05)',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  taskInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  dueDate: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
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
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  hasPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  hasPhotoText: {
    fontSize: 11,
    fontWeight: '500',
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  hasNotesText: {
    fontSize: 11,
    fontWeight: '500',
  },
  adminFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
  },
  adminFeedbackText: {
    flex: 1,
    fontSize: 12,
  },
  submittedDate: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
});